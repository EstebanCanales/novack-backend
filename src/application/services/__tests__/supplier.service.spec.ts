import { Test, TestingModule } from '@nestjs/testing';
import { SupplierService } from '../supplier.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier, SupplierSubscription } from 'src/domain/entities';
import { BadRequestException } from '@nestjs/common';
import { CreateSupplierDto, UpdateSupplierDto } from '../../dtos/supplier';
import { EmployeeService } from '../employee.service';
import { EmailService } from '../email.service';
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service'; // Import Logger
import { StripeService } from '../stripe.service'; // Import StripeService

describe('SupplierService', () => {
  let service: SupplierService;
  let supplierRepository: Repository<Supplier>;
  let subscriptionRepository: Repository<SupplierSubscription>;
  let employeeService: EmployeeService;
  let emailService: EmailService;
  let logger: StructuredLoggerService; // Declare logger
  let stripeService: StripeService; // Declare StripeService

  // Define the mock logger instance
  const mockLoggerInstance = {
    setContext: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  // Mock data
  const mockSubscription = {
    id: '1',
    is_subscribed: true,
    has_card_subscription: true,
    has_sensor_subscription: false,
    max_employee_count: 10,
    max_card_count: 5,
  };

  const mockSupplier = {
    id: '1',
    supplier_name: 'Test Supplier',
    supplier_creator: 'John Creator',
    contact_email: 'contact@supplier.com',
    phone_number: '123456789',
    subscription: mockSubscription,
    address: 'Test Address',
    description: 'Test description',
    logo_url: 'https://test-supplier.com/logo.png',
    is_subscribed: true,
    has_card_subscription: true,
    has_sensor_subscription: false,
    employee_count: 5,
    card_count: 3,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockCreateSupplierDto: CreateSupplierDto = {
    supplier_name: 'New Supplier',
    supplier_creator: 'John Creator',
    contact_email: 'new@supplier.com',
    phone_number: '987654321',
    address: 'New Address',
    description: 'New description',
    logo_url: 'https://new-supplier.com/logo.png',
    is_subscribed: true,
    has_card_subscription: true,
    has_sensor_subscription: false,
    employee_count: 5,
    card_count: 3
  };

  const mockUpdateSupplierDto: UpdateSupplierDto = {
    supplier_name: 'Updated Supplier',
    contact_email: 'updated@supplier.com',
    phone_number: '111222333',
    is_subscribed: true
  };

  beforeEach(async () => {
    const mockEmployeeService = {
      create: jest.fn().mockResolvedValue({ id: '1', name: 'Test Employee' }),
      findBySupplier: jest.fn().mockResolvedValue([]),
    };

    const mockEmailService = {
      sendSupplierCreationEmail: jest.fn().mockResolvedValue(true),
    };

    const mockStripeService = {
      findOrCreateCustomer: jest.fn(),
      // Add other StripeService methods if directly called and need mocking in other tests
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SupplierSubscription),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: EmployeeService,
          useValue: mockEmployeeService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: StructuredLoggerService, // Provide logger
          useValue: mockLoggerInstance,
        },
        {
          provide: StripeService, // Provide StripeService
          useValue: mockStripeService,
        }
      ],
    }).compile();

    service = module.get<SupplierService>(SupplierService);
    supplierRepository = module.get<Repository<Supplier>>(getRepositoryToken(Supplier));
    subscriptionRepository = module.get<Repository<SupplierSubscription>>(getRepositoryToken(SupplierSubscription));
    employeeService = module.get<EmployeeService>(EmployeeService);
    emailService = module.get<EmailService>(EmailService);
    logger = module.get<StructuredLoggerService>(StructuredLoggerService); // Get logger instance
    stripeService = module.get<StripeService>(StripeService); // Get StripeService instance
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new supplier successfully', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(supplierRepository, 'create').mockReturnValue(mockSupplier as any);
      jest.spyOn(supplierRepository, 'save').mockResolvedValue(mockSupplier as any);
      jest.spyOn(subscriptionRepository, 'create').mockReturnValue(mockSubscription as any);
      jest.spyOn(subscriptionRepository, 'save').mockResolvedValue(mockSubscription as any);
      jest.spyOn(employeeService, 'create').mockResolvedValue({ id: '1', name: 'John Creator' } as any);
      jest.spyOn(emailService, 'sendSupplierCreationEmail').mockResolvedValue(true as any);
      
      // Mock para findOne en la segunda llamada (dentro de service.findOne)
      jest.spyOn(supplierRepository, 'findOne')
        .mockResolvedValueOnce(null) // Primera llamada para verificar si existe
        .mockResolvedValueOnce(mockSupplier as any); // Segunda llamada dentro de findOne
      
      const result = await service.create(mockCreateSupplierDto);
      
      expect(result).toEqual(mockSupplier);
      expect(supplierRepository.save).toHaveBeenCalled();
      expect(subscriptionRepository.save).toHaveBeenCalled();
      expect(employeeService.create).toHaveBeenCalled();
      expect(emailService.sendSupplierCreationEmail).toHaveBeenCalled();

      expect(logger.log).toHaveBeenCalledWith('Attempting to create supplier', undefined, {
        supplierName: mockCreateSupplierDto.supplier_name,
        contactEmail: mockCreateSupplierDto.contact_email,
      });
      expect(logger.log).toHaveBeenCalledWith('Supplier created successfully', undefined, {
        supplierId: mockSupplier.id,
        supplierName: mockSupplier.supplier_name,
      });
      expect(logger.log).toHaveBeenCalledWith('Creator employee for supplier created successfully', undefined, {
        supplierId: mockSupplier.id,
        employeeEmail: mockCreateSupplierDto.contact_email,
      });
      expect(logger.log).toHaveBeenCalledWith('Supplier creation email sent successfully', undefined, {
        supplierId: mockSupplier.id,
        contactEmail: mockCreateSupplierDto.contact_email,
      });
    });

    it('should throw error if supplier name already exists', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(mockSupplier as any);
      
      await expect(service.create(mockCreateSupplierDto)).rejects.toThrow(BadRequestException);

      expect(logger.log).toHaveBeenCalledWith('Attempting to create supplier', undefined, {
        supplierName: mockCreateSupplierDto.supplier_name,
        contactEmail: mockCreateSupplierDto.contact_email,
      });
      expect(logger.warn).toHaveBeenCalledWith('Supplier creation failed: Name already exists', undefined, {
        supplierName: mockCreateSupplierDto.supplier_name,
      });
      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { supplier_name: mockCreateSupplierDto.supplier_name },
      });
    });

    it('should log an error and throw if employee creation fails', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(null); // No existing supplier
      jest.spyOn(supplierRepository, 'create').mockReturnValue(mockSupplier as any);
      jest.spyOn(supplierRepository, 'save').mockResolvedValue(mockSupplier as any);
      jest.spyOn(subscriptionRepository, 'create').mockReturnValue(mockSubscription as any);
      jest.spyOn(subscriptionRepository, 'save').mockResolvedValue(mockSubscription as any);

      const employeeCreateError = new Error('Employee creation failed');
      jest.spyOn(employeeService, 'create').mockRejectedValue(employeeCreateError);
      jest.spyOn(supplierRepository, 'remove').mockResolvedValue(undefined as any); // Mock remove

      await expect(service.create(mockCreateSupplierDto)).rejects.toThrow(BadRequestException);

      expect(logger.error).toHaveBeenCalledWith(
        'Supplier creation failed due to error creating employee',
        undefined,
        employeeCreateError.stack,
        {
          supplierName: mockCreateSupplierDto.supplier_name,
          originalError: employeeCreateError.message,
        }
      );
      expect(supplierRepository.remove).toHaveBeenCalledWith(mockSupplier);
    });

    it('should log a warning if sending supplier creation email fails', async () => {
      // Primero mockea la primera llamada a findOne que verifica si existe un proveedor con ese nombre
      jest.spyOn(supplierRepository, 'findOne')
        .mockResolvedValueOnce(null) // Para la verificación de nombre existente
        .mockResolvedValueOnce(mockSupplier as any); // Para la llamada a findOne al final del método
      
      jest.spyOn(supplierRepository, 'create').mockReturnValue(mockSupplier as any);
      jest.spyOn(supplierRepository, 'save').mockResolvedValue(mockSupplier as any);
      jest.spyOn(subscriptionRepository, 'create').mockReturnValue(mockSubscription as any);
      jest.spyOn(subscriptionRepository, 'save').mockResolvedValue(mockSubscription as any);
      jest.spyOn(employeeService, 'create').mockResolvedValue({ id: '1', name: 'John Creator' } as any);

      const emailError = new Error('Email send failed');
      jest.spyOn(emailService, 'sendSupplierCreationEmail').mockRejectedValue(emailError);

      await service.create(mockCreateSupplierDto); // Does not throw, just logs

      expect(logger.warn).toHaveBeenCalledWith('Failed to send supplier creation email', undefined, {
        supplierId: mockSupplier.id,
        contactEmail: mockCreateSupplierDto.contact_email,
        error: emailError.message,
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of suppliers', async () => {
      const mockSuppliers = [mockSupplier];
      jest.spyOn(supplierRepository, 'find').mockResolvedValue(mockSuppliers as any);
      
      const result = await service.findAll();
      
      expect(result).toEqual(mockSuppliers);
      expect(supplierRepository.find).toHaveBeenCalledWith({
        relations: ['employees', 'subscription', 'visitors', 'cards'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a single supplier by id', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(mockSupplier as any);
      
      const result = await service.findOne('1');
      
      expect(result).toEqual(mockSupplier);
      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['employees', 'subscription', 'visitors', 'cards'],
      });
    });

    it('should throw exception if supplier not found', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(null);
      
      await expect(service.findOne('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a supplier successfully', async () => {
      const updatedSupplierData = {
        ...mockSupplier, 
        supplier_name: mockUpdateSupplierDto.supplier_name,
        contact_email: mockUpdateSupplierDto.contact_email,
        phone_number: mockUpdateSupplierDto.phone_number,
        subscription: { // Asegúrate de que la suscripción también se "actualice" si es necesario para el resultado
          ...mockSupplier.subscription,
          is_subscribed: mockUpdateSupplierDto.is_subscribed,
        }
      };
      
      // service.update llama a this.findOne(id) dos veces potencialmente
      // 1. Al inicio para obtener el proveedor
      // 2. Al final para devolver el proveedor actualizado
      // También llama a supplierRepository.findOne para la verificación del nombre.

      jest.spyOn(supplierRepository, 'findOne')
        .mockResolvedValueOnce(mockSupplier as any) // First call in update for current supplier
        .mockResolvedValueOnce(null)                // Call for checking existing name
        .mockResolvedValueOnce(updatedSupplierData as any); // Call at the end of update, returning "updated" data
        
      jest.spyOn(supplierRepository, 'save').mockResolvedValue(updatedSupplierData as any);
      jest.spyOn(subscriptionRepository, 'save').mockResolvedValue(updatedSupplierData.subscription as any);

      const result = await service.update('1', mockUpdateSupplierDto);
      
      expect(result).toEqual(updatedSupplierData);
      expect(logger.log).toHaveBeenCalledWith('Attempting to update supplier', undefined, { supplierId: '1' });
      expect(logger.log).toHaveBeenCalledWith('Supplier updated successfully', undefined, { supplierId: '1' });
    });

    it('should throw error if supplier not found', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(null);
      
      await expect(service.update('1', mockUpdateSupplierDto)).rejects.toThrow(BadRequestException);
      expect(logger.log).toHaveBeenCalledWith('Attempting to update supplier', undefined, { supplierId: '1' });
    });

    it('should throw error and log warning if updated name already exists for another supplier', async () => {
      const existingSupplierWithSameName = { ...mockSupplier, id: '2', supplier_name: 'Existing Name' };
      
      const mockUpdateDtoWithNameChange: UpdateSupplierDto = {
        ...mockUpdateSupplierDto,
        supplier_name: 'Existing Name',
      };
      
      jest.spyOn(supplierRepository, 'findOne')
        .mockResolvedValueOnce(mockSupplier as any) // First findOne in update()
        .mockResolvedValueOnce(existingSupplierWithSameName as any); // Second findOne for name check
      
      await expect(service.update('1', mockUpdateDtoWithNameChange)).rejects.toThrow(BadRequestException);

      expect(logger.log).toHaveBeenCalledWith('Attempting to update supplier', undefined, { supplierId: '1' });
      expect(logger.warn).toHaveBeenCalledWith('Supplier update failed: Name already exists', undefined, {
        supplierId: '1',
        conflictingName: mockUpdateDtoWithNameChange.supplier_name,
      });
    });
  });

  describe('remove', () => {
    it('should remove a supplier successfully', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(mockSupplier as any);
      jest.spyOn(employeeService, 'findBySupplier').mockResolvedValue([]); // No employees
      jest.spyOn(supplierRepository, 'remove').mockResolvedValue(undefined as any);

      await service.remove('1');

      expect(logger.log).toHaveBeenCalledWith('Attempting to delete supplier', undefined, { supplierId: '1' });
      expect(supplierRepository.remove).toHaveBeenCalledWith(mockSupplier);
      expect(logger.log).toHaveBeenCalledWith('Supplier deleted successfully', undefined, { supplierId: '1' });
    });

    it('should throw error and log warning if supplier has associated employees', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(mockSupplier as any);
      jest.spyOn(employeeService, 'findBySupplier').mockResolvedValue([{ id: 'emp1' } as any]); // Has employees

      await expect(service.remove('1')).rejects.toThrow(BadRequestException);

      expect(logger.log).toHaveBeenCalledWith('Attempting to delete supplier', undefined, { supplierId: '1' });
      expect(logger.warn).toHaveBeenCalledWith('Supplier deletion failed: Employees associated', undefined, {
        supplierId: '1',
        employeeCount: 1,
      });
    });
  });

  describe('updateProfileImageUrl', () => {
    it('should update profile image url successfully', async () => {
      const newImageUrl = 'https://example.com/newimage.jpg';
      jest.spyOn(supplierRepository, 'findOneBy').mockResolvedValue(mockSupplier as any);
      jest.spyOn(supplierRepository, 'save').mockResolvedValue({ ...mockSupplier, profile_image_url: newImageUrl } as any);

      await service.updateProfileImageUrl('1', newImageUrl);

      expect(logger.log).toHaveBeenCalledWith('Supplier profile image URL updated', undefined, {
        supplierId: '1',
        newImageUrl,
      });
      expect(supplierRepository.save).toHaveBeenCalledWith(expect.objectContaining({ profile_image_url: newImageUrl }));
    });

    it('should throw error if supplier not found for image update', async () => {
      jest.spyOn(supplierRepository, 'findOneBy').mockResolvedValue(null);
      const newImageUrl = 'https://example.com/newimage.jpg';

      await expect(service.updateProfileImageUrl('1', newImageUrl)).rejects.toThrow(BadRequestException);
    });
  });

  // New describe block for Stripe related functionalities
  describe('Stripe Integration', () => {
    describe('create method with Stripe', () => {
      const createDtoSubscribed: CreateSupplierDto = {
        ...mockCreateSupplierDto,
        is_subscribed: true,
      };
      const createDtoNotSubscribed: CreateSupplierDto = {
        ...mockCreateSupplierDto,
        is_subscribed: false,
      };
      const mockSavedSupplier = { ...mockSupplier, id: 'new_sup_id' };
      const mockSavedSubscription = { ...mockSubscription, id: 'new_sub_id', supplier: mockSavedSupplier, is_subscribed: true, stripe_customer_id: null };
      const mockStripeCustomer = { id: 'cus_xyz123' };

      beforeEach(() => {
        // Common mocks for create successful path
        jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(null); // No existing supplier by name
        jest.spyOn(supplierRepository, 'create').mockReturnValue(mockSavedSupplier as any);
        jest.spyOn(supplierRepository, 'save').mockResolvedValue(mockSavedSupplier as any);
        jest.spyOn(subscriptionRepository, 'create').mockReturnValue(mockSavedSubscription as any);
        // Mock the save on subscriptionRepository to return the object that would be saved
        jest.spyOn(subscriptionRepository, 'save')
            .mockImplementation(async (sub) => sub as any); // Returns the passed subscription

        jest.spyOn(employeeService, 'create').mockResolvedValue({ id: 'emp_id' } as any);
        jest.spyOn(emailService, 'sendSupplierCreationEmail').mockResolvedValue(true as any);
         // Mock for the findOne call at the end of the create method
        jest.spyOn(service, 'findOne').mockResolvedValue(mockSavedSupplier as any);
      });

      it('should call stripeService.findOrCreateCustomer if is_subscribed is true', async () => {
        (stripeService.findOrCreateCustomer as jest.Mock).mockResolvedValueOnce(mockStripeCustomer);

        await service.create(createDtoSubscribed);

        expect(stripeService.findOrCreateCustomer).toHaveBeenCalledWith(
          mockSavedSupplier.contact_email,
          mockSavedSupplier.supplier_name,
          mockSavedSupplier.id,
        );
      });

      it('should save stripe_customer_id to the subscription if is_subscribed is true and customer created', async () => {
        (stripeService.findOrCreateCustomer as jest.Mock).mockResolvedValueOnce(mockStripeCustomer);

        await service.create(createDtoSubscribed);

        // Verify that subscriptionRepository.save was called with the stripe_customer_id
        // The first call to save is for the initial subscription, second is after stripe_customer_id is set.
        expect(subscriptionRepository.save).toHaveBeenCalledTimes(2); // Initial save, then save with stripe_customer_id
        expect(subscriptionRepository.save).toHaveBeenLastCalledWith(
          expect.objectContaining({
            id: mockSavedSubscription.id, // Ensure it's the same subscription object
            stripe_customer_id: mockStripeCustomer.id,
          }),
        );
      });

      it('should not call stripeService.findOrCreateCustomer if is_subscribed is false', async () => {
        await service.create(createDtoNotSubscribed);
        expect(stripeService.findOrCreateCustomer).not.toHaveBeenCalled();
      });

      it('should handle errors from stripeService.findOrCreateCustomer gracefully and log them', async () => {
        const stripeError = new Error('Stripe API error');
        (stripeService.findOrCreateCustomer as jest.Mock).mockRejectedValueOnce(stripeError);

        await service.create(createDtoSubscribed); // Should not throw, but log error

        expect(logger.error).toHaveBeenCalledWith(
          `Failed to create/link Stripe customer for supplier ${mockSavedSupplier.id}: ${stripeError.message}`,
          stripeError.stack
        );
         // Ensure subscription is still saved once (initial save)
        expect(subscriptionRepository.save).toHaveBeenCalledTimes(1);
      });
    });

    describe('activateSubscription', () => {
      const supplierId = 'sup_1';
      const stripeSubscriptionId = 'sub_stripe_1';
      const stripePriceId = 'price_1';
      const stripeCustomerId = 'cus_1';
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const mockExistingSupplier = {
        ...mockSupplier,
        id: supplierId,
        subscription: { ...mockSubscription, id: 'sub_local_1', is_subscribed: false, stripe_customer_id: null } as SupplierSubscription,
      };

      it('should correctly update subscription fields and save', async () => {
        jest.spyOn(service, 'findOne').mockResolvedValueOnce(mockExistingSupplier as any);
        jest.spyOn(subscriptionRepository, 'save').mockImplementation(async (sub) => sub as any);

        const result = await service.activateSubscription(supplierId, stripeSubscriptionId, stripePriceId, stripeCustomerId, endDate, 'active');

        expect(subscriptionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
          is_subscribed: true,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_price_id: stripePriceId,
          stripe_customer_id: stripeCustomerId,
          subscription_end_date: endDate,
          subscription_status: 'active',
          subscription_start_date: expect.any(Date),
        }));
        expect(result.is_subscribed).toBe(true);
        expect(result.stripe_subscription_id).toBe(stripeSubscriptionId);
      });

      it('should throw error if supplier or subscription record not found', async () => {
        jest.spyOn(service, 'findOne').mockResolvedValueOnce({ ...mockExistingSupplier, subscription: null } as any);
        await expect(service.activateSubscription(supplierId, stripeSubscriptionId, stripePriceId, stripeCustomerId, endDate))
          .rejects.toThrow(`Supplier ${supplierId} has no subscription record.`);
      });
    });

    describe('updateSubscriptionPaymentDetails', () => {
      const stripeSubId = 'sub_stripe_xyz';
      const newEndDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days
      const newStatus = 'active_renewed';
      const mockSubToUpdate = {
        ...mockSubscription,
        id: 'local_sub_xyz',
        stripe_subscription_id: stripeSubId,
        subscription_end_date: new Date(),
        subscription_status: 'active'
      };

      it('should correctly update subscription_end_date and subscription_status', async () => {
        jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValueOnce(mockSubToUpdate as any);
        jest.spyOn(subscriptionRepository, 'save').mockImplementation(async (sub) => sub as any);

        const result = await service.updateSubscriptionPaymentDetails(stripeSubId, newEndDate, newStatus);

        expect(subscriptionRepository.findOne).toHaveBeenCalledWith({ where: { stripe_subscription_id: stripeSubId } });
        expect(subscriptionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
          id: mockSubToUpdate.id,
          subscription_end_date: newEndDate,
          subscription_status: newStatus,
        }));
        expect(result.subscription_end_date).toEqual(newEndDate);
        expect(result.subscription_status).toBe(newStatus);
      });
       it('should return null if no local subscription found for Stripe ID', async () => {
        jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValueOnce(null);
        const result = await service.updateSubscriptionPaymentDetails(stripeSubId, newEndDate, newStatus);
        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(`Cannot update payment details: No local subscription found for Stripe ID ${stripeSubId}`);
      });
    });

    describe('deactivateSubscription', () => {
      const stripeSubId = 'sub_stripe_abc';
      const reason = 'payment_failed_final';
       const mockSubToDeactivate = {
        ...mockSubscription,
        id: 'local_sub_abc',
        stripe_subscription_id: stripeSubId,
        is_subscribed: true,
        subscription_status: 'active'
      };

      it('should correctly update is_subscribed and subscription_status', async () => {
        jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValueOnce(mockSubToDeactivate as any);
        jest.spyOn(subscriptionRepository, 'save').mockImplementation(async (sub) => sub as any);

        const result = await service.deactivateSubscription(stripeSubId, reason);

        expect(subscriptionRepository.findOne).toHaveBeenCalledWith({ where: { stripe_subscription_id: stripeSubId } });
        expect(subscriptionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
          id: mockSubToDeactivate.id,
          is_subscribed: false,
          subscription_status: reason,
        }));
        expect(result.is_subscribed).toBe(false);
        expect(result.subscription_status).toBe(reason);
      });
      it('should return null if no local subscription found for Stripe ID', async () => {
        jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValueOnce(null);
        const result = await service.deactivateSubscription(stripeSubId, reason);
        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(`Cannot deactivate: No local subscription found for Stripe ID ${stripeSubId}`);
      });
    });
  });
});