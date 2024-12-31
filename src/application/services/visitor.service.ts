import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateVisitorDto } from '../dtos/visitor';
import { UpdateVisitorDto } from '../dtos/visitor';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visitor, Supplier } from 'src/domain/entities';
import { CardService, VisitorState } from './card.service';

@Injectable()
export class VisitorService {
  constructor(
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly cardService: CardService,
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
      state: VisitorState.WAITING,
    });

    const savedVisitor = await this.visitorRepository.save(visitor);

    try {
      await this.cardService.assignCardToVisitor(savedVisitor.id);
    } catch (error) {
      console.log('No se pudo asignar tarjeta automáticamente:', error.message);
    }

    return savedVisitor;
  }

  async findAll() {
    return await this.visitorRepository.find({
      relations: ['supplier', 'cards'],
    });
  }

  async findOne(id: string) {
    const visitor = await this.visitorRepository.findOne({
      where: { id },
      relations: ['supplier', 'cards'],
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
    const check_out_time = new Date();

    this.validateDates(visitor.check_in_time, check_out_time);

    const card = visitor.cards[0];
    if (card) {
      await this.cardService.releaseCard(card.id);
    } else {
      visitor.state = VisitorState.COMPLETED;
    }

    visitor.check_out_time = check_out_time;
    return await this.visitorRepository.save(visitor);
  }
}

