import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateCardDto } from '../dtos/card';
import { UpdateCardDto } from '../dtos/card';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card, Supplier, Visitor } from 'src/domain/entities';

export enum VisitorState {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

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

  private async getAvailableCard(supplier_id: string): Promise<Card | null> {
    const cards = await this.cardRepository.find({
      where: {
        supplier: { id: supplier_id },
        visitor: null,
        is_active: true,
      },
    });
    return cards.length > 0 ? cards[0] : null;
  }

  private async getWaitingVisitors(supplier_id: string): Promise<Visitor[]> {
    return await this.visitorRepository.find({
      where: {
        supplier: { id: supplier_id },
        state: VisitorState.WAITING,
      },
      order: {
        created_at: 'ASC', // Primero en llegar, primero en ser servido
      },
    });
  }

  async assignCardToVisitor(visitor_id: string) {
    const visitor = await this.visitorRepository.findOne({
      where: { id: visitor_id },
      relations: ['supplier'],
    });

    if (!visitor) {
      throw new BadRequestException('El visitante no existe');
    }

    if (visitor.state === VisitorState.COMPLETED) {
      throw new BadRequestException('El visitante ya completó su visita');
    }

    // Verificar si ya tiene una tarjeta asignada
    const existingCard = await this.cardRepository.findOne({
      where: { visitor: { id: visitor_id } },
    });

    if (existingCard) {
      throw new BadRequestException(
        'El visitante ya tiene una tarjeta asignada',
      );
    }

    const availableCard = await this.getAvailableCard(visitor.supplier.id);

    if (!availableCard) {
      // Si no hay tarjetas disponibles, poner al visitante en espera
      visitor.state = VisitorState.WAITING;
      await this.visitorRepository.save(visitor);
      throw new BadRequestException(
        'No hay tarjetas disponibles. El visitante ha sido puesto en lista de espera.',
      );
    }

    // Asignar la tarjeta al visitante
    availableCard.visitor = visitor;
    availableCard.issued_at = new Date();
    await this.cardRepository.save(availableCard);

    // Actualizar el estado del visitante
    visitor.state = VisitorState.IN_PROGRESS;
    await this.visitorRepository.save(visitor);

    return availableCard;
  }

  async releaseCard(card_id: string) {
    const card = await this.findOne(card_id);

    if (!card.visitor) {
      throw new BadRequestException(
        'La tarjeta no está asignada a ningún visitante',
      );
    }

    // Obtener el visitante y supplier antes de desasignar
    const visitor_id = card.visitor.id;
    const supplier_id = card.supplier.id;

    // Marcar al visitante como completado
    await this.visitorRepository.update(visitor_id, {
      state: VisitorState.COMPLETED,
    });

    // Desasignar la tarjeta
    card.visitor = null;
    card.issued_at = null;
    await this.cardRepository.save(card);

    // Intentar asignar la tarjeta al siguiente visitante en espera
    const waitingVisitors = await this.getWaitingVisitors(supplier_id);
    if (waitingVisitors.length > 0) {
      try {
        await this.assignCardToVisitor(waitingVisitors[0].id);
      } catch (error) {
        // Manejar cualquier error en la asignación
        console.error(
          'Error al asignar tarjeta al siguiente visitante:',
          error,
        );
      }
    }

    return card;
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
