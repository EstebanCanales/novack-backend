import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateCardDto } from '../dtos/card';
import { UpdateCardDto } from '../dtos/card';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card, Supplier, Visitor } from 'src/domain/entities';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
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
      relations: ['supplier'],
    });
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
    });

    if (!supplier) {
      throw new BadRequestException('El proveedor no existe');
    }

    if (!supplier.has_card_subscription) {
      throw new BadRequestException(
        'El proveedor no tiene suscripción de tarjetas',
      );
    }

    const card = this.cardRepository.create({
      ...createCardDto,
      supplier,
      is_active: createCardDto.is_active ?? true,
    });

    return await this.cardRepository.save(card);
  }

  async findAll() {
    return await this.cardRepository.find({
      relations: ['supplier', 'visitor'],
    });
  }

  async findOne(id: string) {
    const card = await this.cardRepository.findOne({
      where: { id },
      relations: ['supplier', 'visitor'],
    });

    if (!card) {
      throw new BadRequestException('La tarjeta no existe');
    }

    return card;
  }

  async update(id: string, updateCardDto: UpdateCardDto) {
    const card = await this.findOne(id);

    if (updateCardDto.supplier_id) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: updateCardDto.supplier_id },
      });

      if (!supplier) {
        throw new BadRequestException('El proveedor no existe');
      }

      if (!supplier.has_card_subscription) {
        throw new BadRequestException(
          'El proveedor no tiene suscripción de tarjetas',
        );
      }

      card.supplier = supplier;
    }

    Object.assign(card, updateCardDto);
    return await this.cardRepository.save(card);
  }

  async remove(id: string) {
    const card = await this.findOne(id);
    return await this.cardRepository.remove(card);
  }
}
