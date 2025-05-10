import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CreateCardDto } from '../dtos/card';
import { UpdateCardDto } from '../dtos/card';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Card, CardLocation, Supplier, Visitor } from 'src/domain/entities';
import { RedisDatabaseService } from 'src/infrastructure/database/redis/redis.database.service';

@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name);

  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(CardLocation)
    private readonly locationRepository: Repository<CardLocation>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
    private readonly redisService: RedisDatabaseService,
  ) {}

  async findAvailableCards(): Promise<Card[]> {
    return await this.cardRepository.find({
      where: {
        is_active: true,
        visitor: null,
      },
      relations: ['supplier', 'supplier.subscription'],
    });
  }

  async recordLocation(card_id: string, latitude: number, longitude: number, accuracy?: number): Promise<CardLocation> {
    const card = await this.findOne(card_id);
    
    // Crear registro de ubicación
    const location = this.locationRepository.create({
      card,
      latitude,
      longitude,
      accuracy,
      timestamp: new Date(),
    });

    // También actualizar los datos de ubicación en la tarjeta para acceso rápido
    card.latitude = latitude;
    card.longitude = longitude;
    card.accuracy = accuracy;
    await this.cardRepository.save(card);
    
    const savedLocation = await this.locationRepository.save(location);
    
    // Guardar en caché Redis
    try {
      await this.redisService.saveCardLocation(card_id, {
        id: savedLocation.id,
        latitude,
        longitude,
        accuracy,
        timestamp: savedLocation.timestamp,
        card_number: card.card_number
      });
    } catch (error) {
      this.logger.warn(`Error al guardar ubicación de tarjeta en caché: ${error.message}`);
    }

    return savedLocation;
  }

  async assignToVisitor(card_id: string, visitor_id: string): Promise<Card> {
    const card = await this.findOne(card_id);
    const visitor = await this.visitorRepository.findOne({
      where: { id: visitor_id },
      relations: ['card'],
    });

    if (!visitor) {
      throw new BadRequestException('El visitante no existe');
    }

    if (visitor.state === 'completado') {
      throw new BadRequestException('El visitante ya completó su visita');
    }

    if (visitor.card) {
      throw new BadRequestException('El visitante ya tiene una tarjeta asignada');
    }

    if (!card.is_active) {
      throw new BadRequestException('La tarjeta no está activa');
    }

    if (card.visitor) {
      throw new BadRequestException('La tarjeta ya está asignada a otro visitante');
    }

    card.visitor = visitor;
    card.issued_at = new Date();
    visitor.state = 'en_progreso';

    await this.visitorRepository.save(visitor);
    return await this.cardRepository.save(card);
  }

  async unassignFromVisitor(card_id: string): Promise<Card> {
    const card = await this.findOne(card_id);

    if (!card.visitor) {
      throw new BadRequestException('La tarjeta no está asignada a ningún visitante');
    }

    const visitor = await this.visitorRepository.findOne({
      where: { id: card.visitor.id },
    });

    if (visitor) {
      visitor.state = 'completado';
      await this.visitorRepository.save(visitor);
    }

    card.visitor = null;
    card.issued_at = null;
    return await this.cardRepository.save(card);
  }

  async create(createCardDto: CreateCardDto) {
    const supplier = await this.supplierRepository.findOne({
      where: { id: createCardDto.supplier_id },
      relations: ['subscription'],
    });

    if (!supplier) {
      throw new BadRequestException('El proveedor no existe');
    }

    if (!supplier.subscription || !supplier.subscription.has_card_subscription) {
      throw new BadRequestException(
        'El proveedor no tiene suscripción de tarjetas',
      );
    }

    // Verificar límite de tarjetas
    const currentCardCount = await this.cardRepository.count({
      where: { supplier: { id: supplier.id } }
    });

    if (currentCardCount >= supplier.subscription.max_card_count) {
      throw new BadRequestException(
        `El proveedor ha alcanzado su límite de tarjetas (${supplier.subscription.max_card_count})`
      );
    }

    const card = this.cardRepository.create({
      card_number: createCardDto.card_number || `CARD-${Date.now()}`,
      is_active: createCardDto.is_active ?? true,
      supplier,
    });

    return await this.cardRepository.save(card);
  }

  async findAll() {
    return await this.cardRepository.find({
      relations: ['supplier', 'visitor', 'locations'],
    });
  }

  async findOne(id: string) {
    const card = await this.cardRepository.findOne({
      where: { id },
      relations: ['supplier', 'supplier.subscription', 'visitor', 'locations'],
    });

    if (!card) {
      throw new BadRequestException('La tarjeta no existe');
    }

    return card;
  }

  async findLocationHistory(card_id: string): Promise<CardLocation[]> {
    const card = await this.findOne(card_id);
    
    // Obtener el historial de ubicaciones de la base de datos
    return this.locationRepository.find({ 
      where: { card: { id: card_id } },
      order: { timestamp: 'DESC' }
    });
  }

  async getLastLocation(card_id: string): Promise<any> {
    // Intentar obtener de caché primero
    try {
      const cachedLocation = await this.redisService.getCardLocation(card_id);
      if (cachedLocation) {
        return cachedLocation;
      }
    } catch (error) {
      this.logger.warn(`Error al obtener ubicación de tarjeta de caché: ${error.message}`);
    }
    
    // Si no está en caché, obtener de base de datos
    const lastLocationFromDB = await this.locationRepository.findOne({ 
      where: { card: { id: card_id } },
      order: { timestamp: 'DESC' }
    });
    
    if (lastLocationFromDB) {
      // Guardar en caché para futuros accesos
      try {
        const card = await this.findOne(card_id);
        await this.redisService.saveCardLocation(card_id, {
          id: lastLocationFromDB.id,
          latitude: lastLocationFromDB.latitude,
          longitude: lastLocationFromDB.longitude,
          accuracy: lastLocationFromDB.accuracy,
          timestamp: lastLocationFromDB.timestamp,
          card_number: card.card_number
        });
      } catch (error) {
        this.logger.warn(`Error al guardar ubicación de tarjeta en caché: ${error.message}`);
      }
      
      return lastLocationFromDB;
    }
    
    return null;
  }
  
  async getNearbyCards(latitude: number, longitude: number, radius = 100): Promise<any[]> {
    // Utilizar la función de Redis para obtener tarjetas cercanas
    try {
      const nearbyCards = await this.redisService.getNearbyCards(latitude, longitude, radius);
      if (nearbyCards && nearbyCards.length > 0) {
        return nearbyCards;
      }
    } catch (error) {
      this.logger.warn(`Error al obtener tarjetas cercanas de caché: ${error.message}`);
    }
    
    // Fallback a la base de datos (búsqueda aproximada)
    // Nota: esto no es una verdadera búsqueda geoespacial, solo una aproximación
    const latDelta = radius / 111000; // Aproximado: 1 grado ~ 111km
    const lngDelta = radius / (111000 * Math.cos(latitude * (Math.PI / 180)));
    
    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLng = longitude - lngDelta;
    const maxLng = longitude + lngDelta;
    
    const cards = await this.cardRepository.find({
      where: {
        latitude: Between(minLat, maxLat),
        longitude: Between(minLng, maxLng)
      }
    });
    
    return cards.map(card => ({
      id: card.id,
      card_number: card.card_number,
      latitude: card.latitude,
      longitude: card.longitude,
      accuracy: card.accuracy,
      // Cálculo aproximado de la distancia
      distance_meters: this.calculateDistance(
        latitude, longitude,
        parseFloat(card.latitude.toString()),
        parseFloat(card.longitude.toString())
      )
    }));
  }
  
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c); // Distancia en metros
  }

  async update(id: string, updateCardDto: UpdateCardDto) {
    const card = await this.findOne(id);

    if (updateCardDto.supplier_id) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: updateCardDto.supplier_id },
        relations: ['subscription'],
      });

      if (!supplier) {
        throw new BadRequestException('El proveedor no existe');
      }

      if (!supplier.subscription || !supplier.subscription.has_card_subscription) {
        throw new BadRequestException(
          'El proveedor no tiene suscripción de tarjetas',
        );
      }

      card.supplier = supplier;
    }

    if (updateCardDto.card_number) card.card_number = updateCardDto.card_number;
    if (updateCardDto.is_active !== undefined) card.is_active = updateCardDto.is_active;
    if (updateCardDto.expires_at) card.expires_at = updateCardDto.expires_at;

    return await this.cardRepository.save(card);
  }

  async remove(id: string) {
    const card = await this.findOne(id);
    return await this.cardRepository.remove(card);
  }
}
