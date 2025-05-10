import { Injectable, BadRequestException } from '@nestjs/common';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from 'src/application/dtos/supplier';
import { Repository } from 'typeorm';
import { Supplier, SupplierSubscription } from 'src/domain/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeService } from './employee.service';
import { EmailService } from './email.service';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(SupplierSubscription)
    private readonly subscriptionRepository: Repository<SupplierSubscription>,
    private readonly employeeService: EmployeeService,
    private readonly emailService: EmailService,
  ) {}

  async create(createSupplierDto: CreateSupplierDto) {
    // Verificar si ya existe un proveedor con el mismo nombre
    const existingSupplier = await this.supplierRepository.findOne({
      where: { supplier_name: createSupplierDto.supplier_name },
    });

    if (existingSupplier) {
      throw new BadRequestException('Ya existe un proveedor con ese nombre');
    }

    // Crear el proveedor
    const supplier = this.supplierRepository.create({
      supplier_name: createSupplierDto.supplier_name,
      supplier_creator: createSupplierDto.supplier_creator,
      contact_email: createSupplierDto.contact_email,
      phone_number: createSupplierDto.phone_number,
      address: createSupplierDto.address,
      description: createSupplierDto.description,
      logo_url: createSupplierDto.logo_url,
      additional_info: createSupplierDto.additional_info,
    });

    const savedSupplier = await this.supplierRepository.save(supplier);

    // Crear la suscripción
    const subscription = this.subscriptionRepository.create({
      is_subscribed: createSupplierDto.is_subscribed || false,
      has_card_subscription: createSupplierDto.has_card_subscription || false,
      has_sensor_subscription: createSupplierDto.has_sensor_subscription || false,
      max_employee_count: createSupplierDto.employee_count || 0,
      max_card_count: createSupplierDto.card_count || 0,
      supplier: savedSupplier,
    });

    await this.subscriptionRepository.save(subscription);

    // Crear el empleado creador
    if (createSupplierDto.supplier_creator) {
      const temporalPassword = 'Temporal123';
      try {
        const employee = await this.employeeService.create({
          name: createSupplierDto.supplier_creator,
          email: createSupplierDto.contact_email,
          password: temporalPassword,
          is_creator: true,
          supplier_id: savedSupplier.id,
        });

        console.log('Empleado creado exitosamente:', employee);

        // Enviar email con la información
        try {
          console.log('Intentando enviar email al proveedor...');
          const emailResult = await this.emailService.sendSupplierCreationEmail(
            savedSupplier,
            createSupplierDto.contact_email,
            temporalPassword,
          );
          console.log('Email enviado exitosamente:', emailResult);
        } catch (emailError) {
          console.error('Error al enviar el email:', emailError);
          // No lanzamos el error para no revertir la creación del proveedor
        }
      } catch (error) {
        // Si falla la creación del empleado, eliminar el proveedor
        await this.supplierRepository.remove(savedSupplier);
        throw new BadRequestException(
          'Error al crear el empleado creador: ' + error.message,
        );
      }
    }

    return this.findOne(savedSupplier.id);
  }

  async findAll() {
    return await this.supplierRepository.find({
      relations: ['employees', 'subscription', 'visitors', 'cards'],
    });
  }

  async findOne(id: string) {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
      relations: ['employees', 'subscription', 'visitors', 'cards'],
    });

    if (!supplier) {
      throw new BadRequestException('El proveedor no existe');
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    const supplier = await this.findOne(id);

    if (
      updateSupplierDto.supplier_name &&
      updateSupplierDto.supplier_name !== supplier.supplier_name
    ) {
      const existingSupplier = await this.supplierRepository.findOne({
        where: { supplier_name: updateSupplierDto.supplier_name },
      });

      if (existingSupplier && existingSupplier.id !== id) {
        throw new BadRequestException('Ya existe un proveedor con ese nombre');
      }
    }

    // Actualizar datos del proveedor
    if (updateSupplierDto.supplier_name) supplier.supplier_name = updateSupplierDto.supplier_name;
    if (updateSupplierDto.supplier_creator) supplier.supplier_creator = updateSupplierDto.supplier_creator;
    if (updateSupplierDto.contact_email) supplier.contact_email = updateSupplierDto.contact_email;
    if (updateSupplierDto.phone_number) supplier.phone_number = updateSupplierDto.phone_number;
    if (updateSupplierDto.address) supplier.address = updateSupplierDto.address;
    if (updateSupplierDto.description) supplier.description = updateSupplierDto.description;
    if (updateSupplierDto.logo_url) supplier.logo_url = updateSupplierDto.logo_url;
    if (updateSupplierDto.additional_info) {
      supplier.additional_info = typeof updateSupplierDto.additional_info === 'string' 
        ? JSON.parse(updateSupplierDto.additional_info) 
        : updateSupplierDto.additional_info;
    }

    await this.supplierRepository.save(supplier);

    // Actualizar datos de suscripción
    if (supplier.subscription) {
      if (updateSupplierDto.is_subscribed !== undefined) 
        supplier.subscription.is_subscribed = updateSupplierDto.is_subscribed;
      if (updateSupplierDto.has_card_subscription !== undefined) 
        supplier.subscription.has_card_subscription = updateSupplierDto.has_card_subscription;
      if (updateSupplierDto.has_sensor_subscription !== undefined) 
        supplier.subscription.has_sensor_subscription = updateSupplierDto.has_sensor_subscription;
      if (updateSupplierDto.employee_count !== undefined) 
        supplier.subscription.max_employee_count = updateSupplierDto.employee_count;
      if (updateSupplierDto.card_count !== undefined) 
        supplier.subscription.max_card_count = updateSupplierDto.card_count;
      
      await this.subscriptionRepository.save(supplier.subscription);
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const supplier = await this.findOne(id);

    // Verificar si hay empleados
    const employees = await this.employeeService.findBySupplier(id);

    if (employees.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar el proveedor porque tiene empleados asociados',
      );
    }

    return await this.supplierRepository.remove(supplier);
  }

  // --- NUEVO MÉTODO PARA ACTUALIZAR URL DE IMAGEN DE PERFIL ---
  async updateProfileImageUrl(id: string, imageUrl: string) {
    const supplier = await this.supplierRepository.findOneBy({ id });
    if (!supplier) {
      throw new BadRequestException('El proveedor no existe');
    }

    supplier.profile_image_url = imageUrl;
    await this.supplierRepository.save(supplier);
    return supplier; // Opcional: devolver el proveedor actualizado
  }
}
