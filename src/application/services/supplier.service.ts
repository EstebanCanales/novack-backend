import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from 'src/application/dtos/supplier';
import { Repository } from 'typeorm';
import { Supplier, SupplierSubscription } from 'src/domain/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeService } from './employee.service';
import { EmailService } from './email.service';
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service'; // Added import

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(SupplierSubscription)
    private readonly subscriptionRepository: Repository<SupplierSubscription>,
    @Inject(forwardRef(() => EmployeeService))
    private readonly employeeService: EmployeeService,
    private readonly emailService: EmailService,
    private readonly logger: StructuredLoggerService, // Added logger
  ) {
    this.logger.setContext('SupplierService'); // Set context
  }

  async create(createSupplierDto: CreateSupplierDto) {
    this.logger.log('Attempting to create supplier', undefined, {
      supplierName: createSupplierDto.supplier_name,
      contactEmail: createSupplierDto.contact_email,
    });

    // Verificar si ya existe un proveedor con el mismo nombre
    const existingSupplier = await this.supplierRepository.findOne({
      where: { supplier_name: createSupplierDto.supplier_name },
    });

    if (existingSupplier) {
      this.logger.warn('Supplier creation failed: Name already exists', undefined, {
        supplierName: createSupplierDto.supplier_name,
      });
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
      has_sensor_subscription:
        createSupplierDto.has_sensor_subscription || false,
      max_employee_count: createSupplierDto.employee_count || 0,
      max_card_count: createSupplierDto.card_count || 0,
      supplier: savedSupplier,
    });

    await this.subscriptionRepository.save(subscription);

    this.logger.log('Supplier created successfully', undefined, {
      supplierId: savedSupplier.id,
      supplierName: savedSupplier.supplier_name,
    });

    // Crear el empleado creador
    if (createSupplierDto.supplier_creator) {
      const temporalPassword = 'Temporal123'; // Consider making this more secure or configurable
      try {
        const employee = await this.employeeService.create({
          first_name:
            createSupplierDto.supplier_creator.split(' ')[0] || 'Admin',
          last_name:
            createSupplierDto.supplier_creator.split(' ').slice(1).join(' ') ||
            'User',
          email: createSupplierDto.contact_email,
          password: temporalPassword,
          is_creator: true,
          supplier_id: savedSupplier.id,
        });

        // console.log('Empleado creado exitosamente:', employee); // Replaced by structured log
        this.logger.log('Creator employee for supplier created successfully', undefined, { // Changed info to log
          supplierId: savedSupplier.id,
          employeeEmail: createSupplierDto.contact_email, // or employee.email
        });

        // Enviar email con la información
        try {
          // console.log('Intentando enviar email al proveedor...'); // Replaced
          await this.emailService.sendSupplierCreationEmail(
            savedSupplier,
            createSupplierDto.contact_email,
            temporalPassword,
          );
          // console.log('Email enviado exitosamente:', emailResult); // Replaced
          this.logger.log('Supplier creation email sent successfully', undefined, { // Changed info to log
            supplierId: savedSupplier.id,
            contactEmail: createSupplierDto.contact_email,
          });
        } catch (emailError) {
          // console.error('Error al enviar el email:', emailError); // Replaced
          this.logger.warn('Failed to send supplier creation email', undefined, {
            supplierId: savedSupplier.id,
            contactEmail: createSupplierDto.contact_email,
            error: emailError.message,
          });
          // No lanzamos el error para no revertir la creación del proveedor
        }
      } catch (error) {
        this.logger.error( // error method signature: error(message: any, context?: string, trace?: string, ...meta: any[])
          'Supplier creation failed due to error creating employee', // message
          undefined, // context (use instance context)
          error.stack, // trace
          { // ...meta (as an object)
            supplierName: createSupplierDto.supplier_name,
            originalError: error.message,
          }
        );
        // Si falla la creación del empleado, eliminar el proveedor
        await this.supplierRepository.remove(savedSupplier); // Also remove subscription?
        throw new BadRequestException(
          'Error al crear el empleado creador: ' + error.message,
        );
      }
    }

    return this.findOne(savedSupplier.id); // findOne will fetch the complete supplier with relations
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
    this.logger.log('Attempting to update supplier', undefined, { supplierId: id });
    const supplier = await this.findOne(id); // findOne already logs if not found (via exception)

    if (
      updateSupplierDto.supplier_name &&
      updateSupplierDto.supplier_name !== supplier.supplier_name
    ) {
      const existingSupplier = await this.supplierRepository.findOne({
        where: { supplier_name: updateSupplierDto.supplier_name },
      });

      if (existingSupplier && existingSupplier.id !== id) {
        this.logger.warn('Supplier update failed: Name already exists', undefined, {
          supplierId: id,
          conflictingName: updateSupplierDto.supplier_name,
        });
        throw new BadRequestException('Ya existe un proveedor con ese nombre');
      }
    }

    // Actualizar datos del proveedor
    if (updateSupplierDto.supplier_name)
      supplier.supplier_name = updateSupplierDto.supplier_name;
    if (updateSupplierDto.supplier_creator)
      supplier.supplier_creator = updateSupplierDto.supplier_creator;
    if (updateSupplierDto.contact_email)
      supplier.contact_email = updateSupplierDto.contact_email;
    if (updateSupplierDto.phone_number)
      supplier.phone_number = updateSupplierDto.phone_number;
    if (updateSupplierDto.address) supplier.address = updateSupplierDto.address;
    if (updateSupplierDto.description)
      supplier.description = updateSupplierDto.description;
    if (updateSupplierDto.logo_url)
      supplier.logo_url = updateSupplierDto.logo_url;
    if (updateSupplierDto.additional_info) {
      supplier.additional_info =
        typeof updateSupplierDto.additional_info === 'string'
          ? JSON.parse(updateSupplierDto.additional_info) // Ensure this is safe
          : updateSupplierDto.additional_info;
    }

    await this.supplierRepository.save(supplier);

    // Actualizar datos de suscripción
    if (supplier.subscription) {
      if (updateSupplierDto.is_subscribed !== undefined)
        supplier.subscription.is_subscribed = updateSupplierDto.is_subscribed;
      if (updateSupplierDto.has_card_subscription !== undefined)
        supplier.subscription.has_card_subscription =
          updateSupplierDto.has_card_subscription;
      if (updateSupplierDto.has_sensor_subscription !== undefined)
        supplier.subscription.has_sensor_subscription =
          updateSupplierDto.has_sensor_subscription;
      if (updateSupplierDto.employee_count !== undefined)
        supplier.subscription.max_employee_count =
          updateSupplierDto.employee_count;
      if (updateSupplierDto.card_count !== undefined)
        supplier.subscription.max_card_count = updateSupplierDto.card_count;

      await this.subscriptionRepository.save(supplier.subscription);
    }
    this.logger.log('Supplier updated successfully', undefined, { supplierId: id });
    return this.findOne(id);
  }

  async remove(id: string) {
    this.logger.log('Attempting to delete supplier', undefined, { supplierId: id });
    const supplier = await this.findOne(id); // findOne will throw if not found

    // Verificar si hay empleados
    const employees = await this.employeeService.findBySupplier(id);

    if (employees.length > 0) {
      this.logger.warn('Supplier deletion failed: Employees associated', undefined, {
        supplierId: id,
        employeeCount: employees.length,
      });
      throw new BadRequestException(
        'No se puede eliminar el proveedor porque tiene empleados asociados',
      );
    }

    await this.supplierRepository.remove(supplier);
    this.logger.log('Supplier deleted successfully', undefined, { supplierId: id });
    // Original method returns the result of remove, which might be void or the removed entity.
    // For logging, success is noted. TypeORM's remove usually returns void or the entity.
  }

  // --- NUEVO MÉTODO PARA ACTUALIZAR URL DE IMAGEN DE PERFIL ---
  async updateProfileImageUrl(id: string, imageUrl: string) {
    const supplier = await this.supplierRepository.findOneBy({ id });
    if (!supplier) {
      // this.logger.warn('Supplier profile image update failed: Supplier not found', undefined, JSON.stringify({ supplierId: id }));
      throw new BadRequestException('El proveedor no existe');
    }

    supplier.profile_image_url = imageUrl; // Cambiar la URL de la imagen de perfil
    await this.supplierRepository.save(supplier);
    this.logger.log('Supplier profile image URL updated', undefined, {
      supplierId: id,
      newImageUrl: imageUrl,
    });
    return supplier; // Opcional: devolver el proveedor actualizado
  }
}
