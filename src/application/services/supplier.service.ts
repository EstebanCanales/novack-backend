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
import { StripeService } from './stripe.service';

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
    @Inject(forwardRef(() => StripeService))
    private readonly stripeService: StripeService,
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
      has_ai_feature_subscription: createSupplierDto.has_ai_feature_subscription || false,
      max_employee_count: createSupplierDto.employee_count || 0,
      max_card_count: createSupplierDto.card_count || 0,
      supplier: savedSupplier,
    });

    const savedSubscription = await this.subscriptionRepository.save(subscription);

    this.logger.log('Supplier and initial subscription created successfully', undefined, { // Updated log message
      supplierId: savedSupplier.id,
      subscriptionId: savedSubscription.id, // Added subscription ID to log
      supplierName: savedSupplier.supplier_name,
    });

    // Link Stripe customer if subscribed
    if (savedSupplier && savedSubscription.is_subscribed) {
      try {
        const customer = await this.stripeService.findOrCreateCustomer(
          savedSupplier.contact_email,
          savedSupplier.supplier_name,
          savedSupplier.id,
        );
        if (customer) {
          savedSubscription.stripe_customer_id = customer.id;
          await this.subscriptionRepository.save(savedSubscription); // Save updated subscription
          this.logger.log(`Stripe customer ${customer.id} linked to supplier ${savedSupplier.id} and subscription ${savedSubscription.id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create/link Stripe customer for supplier ${savedSupplier.id}: ${error.message}`, error.stack);
        // Decide if this error should be fatal or just logged. For now, log and continue.
      }
    }

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
      if (updateSupplierDto.has_ai_feature_subscription !== undefined) {
        supplier.subscription.has_ai_feature_subscription =
          updateSupplierDto.has_ai_feature_subscription;
      }
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

  // Methods for Stripe Webhook Event Handling

  async updateStripeCustomerId(supplierId: string, stripeCustomerId: string): Promise<SupplierSubscription> {
    const supplier = await this.findOne(supplierId); // Ensures supplier exists and loads subscription
    if (!supplier.subscription) {
      this.logger.error(`Supplier ${supplierId} does not have a subscription record to update stripe_customer_id.`);
      throw new Error(`Supplier ${supplierId} does not have a subscription record.`);
    }
    supplier.subscription.stripe_customer_id = stripeCustomerId;
    this.logger.log(`Updating Stripe Customer ID for supplier ${supplierId} to ${stripeCustomerId}`);
    return this.subscriptionRepository.save(supplier.subscription);
  }

  async activateSubscription(
    supplierId: string,
    stripeSubscriptionId: string,
    stripePriceId: string,
    stripeCustomerId: string,
    subscriptionEndDate: Date,
    status: string = 'active',
  ): Promise<SupplierSubscription> {
    this.logger.log(`Activating subscription for supplier ${supplierId} with Stripe ID ${stripeSubscriptionId}`);
    const supplier = await this.findOne(supplierId);
    if (!supplier.subscription) {
      this.logger.error(`Cannot activate subscription: Supplier ${supplierId} has no subscription record.`);
      throw new Error(`Supplier ${supplierId} has no subscription record.`);
    }

    const sub = supplier.subscription;
    sub.is_subscribed = true;
    sub.stripe_subscription_id = stripeSubscriptionId;
    sub.stripe_price_id = stripePriceId;
    sub.stripe_customer_id = stripeCustomerId;
    sub.subscription_end_date = subscriptionEndDate;
    sub.subscription_start_date = new Date();
    sub.subscription_status = status;

    this.logger.log(`Local subscription for supplier ${supplierId} updated. Stripe ID: ${stripeSubscriptionId}, Status: ${status}, End Date: ${subscriptionEndDate}`);
    return this.subscriptionRepository.save(sub);
  }

  async updateSubscriptionPaymentDetails(
    stripeSubscriptionId: string,
    newSubscriptionEndDate: Date,
    status: string,
  ): Promise<SupplierSubscription | null> {
    this.logger.log(`Updating payment details for Stripe subscription ${stripeSubscriptionId}. New end date: ${newSubscriptionEndDate}, Status: ${status}`);
    const subscription = await this.subscriptionRepository.findOne({ where: { stripe_subscription_id: stripeSubscriptionId } });
    if (!subscription) {
      this.logger.warn(`Cannot update payment details: No local subscription found for Stripe ID ${stripeSubscriptionId}`);
      return null;
    }
    subscription.subscription_end_date = newSubscriptionEndDate;
    subscription.subscription_status = status;

    this.logger.log(`Local subscription ${subscription.id} (Stripe ID: ${stripeSubscriptionId}) updated. Status: ${status}, New End Date: ${newSubscriptionEndDate}`);
    return this.subscriptionRepository.save(subscription);
  }

  async deactivateSubscription(
    stripeSubscriptionId: string,
    reason: string = 'cancelled',
  ): Promise<SupplierSubscription | null> {
    this.logger.log(`Deactivating subscription for Stripe ID ${stripeSubscriptionId} due to: ${reason}`);
    const subscription = await this.subscriptionRepository.findOne({ where: { stripe_subscription_id: stripeSubscriptionId } });
    if (!subscription) {
      this.logger.warn(`Cannot deactivate: No local subscription found for Stripe ID ${stripeSubscriptionId}`);
      return null;
    }
    subscription.is_subscribed = false;
    subscription.subscription_status = reason;

    this.logger.log(`Local subscription ${subscription.id} (Stripe ID: ${stripeSubscriptionId}) deactivated. Status: ${reason}`);
    return this.subscriptionRepository.save(subscription);
  }
}
