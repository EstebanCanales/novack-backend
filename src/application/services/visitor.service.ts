import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateVisitorDto } from '../dtos/visitor';
import { UpdateVisitorDto } from '../dtos/visitor';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visitor, Supplier } from 'src/domain/entities';
import { CardService } from './card.service';
import { EmailService } from './email.service';

@Injectable()
export class VisitorService {
  constructor(
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly cardService: CardService,
    private readonly emailService: EmailService,
  ) {}

  private validateDates(check_in_time: Date, check_out_time?: Date) {
    if (check_out_time) {
      if (check_out_time <= check_in_time) {
        throw new BadRequestException(
          'La hora de salida debe ser posterior a la hora de entrada',
        );
      }
    }
  }

  async create(createVisitorDto: CreateVisitorDto) {
    const supplier = await this.supplierRepository.findOne({
      where: { id: createVisitorDto.supplier_id },
    });

    if (!supplier) {
      throw new BadRequestException('El proveedor no existe');
    }

    this.validateDates(
      createVisitorDto.check_in_time,
      createVisitorDto.check_out_time,
    );

    const visitor = this.visitorRepository.create({
      ...createVisitorDto,
      supplier,
      state: 'pendiente',
    });

    const savedVisitor = await this.visitorRepository.save(visitor);

    // Enviar email de bienvenida
    try {
      await this.emailService.sendVisitorWelcomeEmail(
        savedVisitor.email,
        savedVisitor.name,
        savedVisitor.check_in_time,
        savedVisitor.location,
      );
    } catch (error) {
      console.error('Error al enviar email de bienvenida:', error);
    }

    // Intentar asignar una tarjeta
    try {
      const availableCards = await this.cardService.findAvailableCards();
      if (availableCards.length > 0) {
        await this.cardService.assignToVisitor(availableCards[0].id, savedVisitor.id);
      }
    } catch (error) {
      console.error('Error al asignar tarjeta:', error);
    }

    return savedVisitor;
  }

  async findAll() {
    return await this.visitorRepository.find({
      relations: ['supplier', 'card'],
    });
  }

  async findOne(id: string) {
    const visitor = await this.visitorRepository.findOne({
      where: { id },
      relations: ['supplier', 'card'],
    });

    if (!visitor) {
      throw new BadRequestException('El visitante no existe');
    }

    return visitor;
  }

  async update(id: string, updateVisitorDto: UpdateVisitorDto) {
    const visitor = await this.findOne(id);

    if (updateVisitorDto.supplier_id) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: updateVisitorDto.supplier_id },
      });

      if (!supplier) {
        throw new BadRequestException('El proveedor no existe');
      }

      visitor.supplier = supplier;
    }

    if (updateVisitorDto.check_in_time || updateVisitorDto.check_out_time) {
      this.validateDates(
        updateVisitorDto.check_in_time || visitor.check_in_time,
        updateVisitorDto.check_out_time || visitor.check_out_time,
      );
    }

    Object.assign(visitor, updateVisitorDto);
    return await this.visitorRepository.save(visitor);
  }

  async remove(id: string) {
    const visitor = await this.findOne(id);
    return await this.visitorRepository.remove(visitor);
  }

  async checkOut(id: string) {
    const visitor = await this.findOne(id);

    if (visitor.state === 'completado') {
      throw new BadRequestException('El visitante ya ha realizado el check-out');
    }

    if (!visitor.check_in_time) {
      throw new BadRequestException('El visitante no ha realizado el check-in');
    }

    visitor.check_out_time = new Date();
    visitor.state = 'completado';

    // Liberar la tarjeta si tiene una asignada
    if (visitor.card) {
      await this.cardService.unassignFromVisitor(visitor.card.id);
    }

    const updatedVisitor = await this.visitorRepository.save(visitor);

    // Enviar email de checkout
    try {
      await this.emailService.sendVisitorCheckoutEmail(
        visitor.email,
        visitor.name,
        visitor.check_in_time,
        visitor.check_out_time,
        visitor.location,
      );
    } catch (error) {
      console.error('Error al enviar email de checkout:', error);
    }

    return updatedVisitor;
  }

  async findBySupplier(supplier_id: string) {
    return await this.visitorRepository.find({
      where: { supplier: { id: supplier_id } },
      relations: ['supplier', 'card'],
    });
  }
}

