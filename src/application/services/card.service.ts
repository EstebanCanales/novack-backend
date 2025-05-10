import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateCardDto } from '../dtos/card';
import { UpdateCardDto } from '../dtos/card';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card, CardLocation, Supplier, Visitor } from 'src/domain/entities';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(CardLocation)
    private readonly locationRepository: Repository<CardLocation>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
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

    return await this.locationRepository.save(location);
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

  async findLocationHistory(card_id: string) {
    const card = await this.findOne(card_id);
    return card.locations;
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
