import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateVisitorDto } from '../dtos/visitor';
import { UpdateVisitorDto } from '../dtos/visitor';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visitor, Appointment, Supplier } from 'src/domain/entities';
import { CardService } from './card.service';
import { EmailService } from './email.service';

@Injectable()
export class VisitorService {
  constructor(
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
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

    // Crear visitante
    const visitor = this.visitorRepository.create({
      name: createVisitorDto.name,
      email: createVisitorDto.email,
      phone: createVisitorDto.phone,
      location: createVisitorDto.location,
      state: 'pendiente',
      supplier,
    });

    const savedVisitor = await this.visitorRepository.save(visitor);

    // Crear cita
    const appointment = this.appointmentRepository.create({
      title: createVisitorDto.appointment,
      description: createVisitorDto.appointment_description,
      scheduled_time: new Date(),
      check_in_time: createVisitorDto.check_in_time,
      check_out_time: createVisitorDto.check_out_time,
      complaints: createVisitorDto.complaints || { invitado1: 'ninguno' },
      status: 'pendiente',
      visitor: savedVisitor,
      supplier,
    });

    await this.appointmentRepository.save(appointment);

    // Enviar email de bienvenida
    try {
      await this.emailService.sendVisitorWelcomeEmail(
        savedVisitor.email,
        savedVisitor.name,
        appointment.check_in_time,
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

    return this.findOne(savedVisitor.id);
  }

  async findAll() {
    return await this.visitorRepository.find({
      relations: ['supplier', 'card', 'appointments'],
    });
  }

  async findOne(id: string) {
    const visitor = await this.visitorRepository.findOne({
      where: { id },
      relations: ['supplier', 'card', 'appointments'],
    });

    if (!visitor) {
      throw new BadRequestException('El visitante no existe');
    }

    return visitor;
  }

  async update(id: string, updateVisitorDto: UpdateVisitorDto) {
    const visitor = await this.findOne(id);

    if (!visitor.appointments || visitor.appointments.length === 0) {
      throw new BadRequestException('El visitante no tiene citas asociadas');
    }

    const appointment = visitor.appointments[0]; // Usar la primera cita

    if (updateVisitorDto.supplier_id) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: updateVisitorDto.supplier_id },
      });

      if (!supplier) {
        throw new BadRequestException('El proveedor no existe');
      }

      visitor.supplier = supplier;
      appointment.supplier = supplier;
    }

    if (updateVisitorDto.check_in_time || updateVisitorDto.check_out_time) {
      this.validateDates(
        updateVisitorDto.check_in_time || appointment.check_in_time,
        updateVisitorDto.check_out_time || appointment.check_out_time,
      );
    }

    // Actualizar visitante
    if (updateVisitorDto.name) visitor.name = updateVisitorDto.name;
    if (updateVisitorDto.email) visitor.email = updateVisitorDto.email;
    if (updateVisitorDto.phone) visitor.phone = updateVisitorDto.phone;
    if (updateVisitorDto.location) visitor.location = updateVisitorDto.location;
    if (updateVisitorDto.state) visitor.state = updateVisitorDto.state;

    await this.visitorRepository.save(visitor);

    // Actualizar cita
    if (updateVisitorDto.appointment) appointment.title = updateVisitorDto.appointment;
    if (updateVisitorDto.appointment_description) appointment.description = updateVisitorDto.appointment_description;
    if (updateVisitorDto.complaints) appointment.complaints = updateVisitorDto.complaints;
    if (updateVisitorDto.check_in_time) appointment.check_in_time = updateVisitorDto.check_in_time;
    if (updateVisitorDto.check_out_time) appointment.check_out_time = updateVisitorDto.check_out_time;
    if (updateVisitorDto.state) appointment.status = updateVisitorDto.state;

    await this.appointmentRepository.save(appointment);

    return this.findOne(id);
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

    if (!visitor.appointments || visitor.appointments.length === 0) {
      throw new BadRequestException('El visitante no tiene citas asociadas');
    }

    const appointment = visitor.appointments[0];
    if (!appointment.check_in_time) {
      throw new BadRequestException('El visitante no ha realizado el check-in');
    }

    appointment.check_out_time = new Date();
    appointment.status = 'completado';
    visitor.state = 'completado';

    // Guardar los cambios
    await this.appointmentRepository.save(appointment);
    const updatedVisitor = await this.visitorRepository.save(visitor);

    // Liberar la tarjeta si tiene una asignada
    if (visitor.card) {
      await this.cardService.unassignFromVisitor(visitor.card.id);
    }

    // Enviar email de checkout
    try {
      await this.emailService.sendVisitorCheckoutEmail(
        visitor.email,
        visitor.name,
        appointment.check_in_time,
        appointment.check_out_time,
        visitor.location,
      );
    } catch (error) {
      console.error('Error al enviar email de checkout:', error);
    }

    return updatedVisitor;
  }

  async findBySupplier(supplier_id: string) {
    const supplier = await this.supplierRepository.findOne({
      where: { id: supplier_id },
    });

    if (!supplier) {
      throw new BadRequestException('El proveedor no existe');
    }

    return await this.visitorRepository.find({
      where: { supplier: { id: supplier_id } },
      relations: ['supplier', 'card', 'appointments'],
      order: {
        created_at: 'DESC',
      },
    });
  }

  // --- NUEVO MÉTODO PARA ACTUALIZAR URL DE IMAGEN DE PERFIL ---
  async updateProfileImageUrl(id: string, imageUrl: string) {
    const visitor = await this.visitorRepository.findOneBy({ id });
    if (!visitor) {
      throw new BadRequestException('El visitante no existe');
    }

    visitor.profile_image_url = imageUrl;
    await this.visitorRepository.save(visitor);
    return visitor; // Opcional: devolver el visitante actualizado
  }
}

