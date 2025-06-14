import { Test, TestingModule } from '@nestjs/testing';
import { SupplierService } from '../supplier.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier, SupplierSubscription } from 'src/domain/entities';
import { BadRequestException } from '@nestjs/common';
import { CreateSupplierDto } from '../../dtos/supplier/create-supplier.dto'; // Adjusted path
import { UpdateSupplierDto } from '../../dtos/supplier/update-supplier.dto'; // Adjusted path
import { EmployeeService } from '../employee.service';
import { EmailService } from '../email.service';
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service';
import { StripeService } from '../stripe.service';

// --- Mock Data Definitions ---
const mockBaseSupplierSubscription: SupplierSubscription = {
  id: 'sub_uuid_123',
  is_subscribed: false,
  has_card_subscription: false,
  has_sensor_subscription: false,
  has_ai_feature_subscription: false,
  max_employee_count: 0,
  max_card_count: 0,
  subscription_start_date: null,
  subscription_end_date: null,
  subscription_details: {},
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_payment_method_id: null,
  stripe_price_id: null,
  subscription_status: 'incomplete',
  created_at: new Date(),
  updated_at: new Date(),
  supplier_id: 'sup_uuid_123',
  supplier: null, // Supplier relation will be set if needed
};

const mockBaseSupplier: Supplier = {
  id: 'sup_uuid_123',
  supplier_name: 'Mock Supplier Inc.',
  supplier_creator: 'Mock Creator',
  contact_email: 'contact@mocksupplier.com',
  phone_number: '123456789',
  address: '123 Mock St',
  description: 'A mock supplier for testing.',
  logo_url: 'http://logo.url/mock.png',
  profile_image_url: null,
  additional_info: {},
  employees: [],
  visitors: [],
  cards: [],
  subscription: mockBaseSupplierSubscription, // Link to subscription
  created_at: new Date(),
  updated_at: new Date(),
};
// Link supplier back to subscription for bidirectional relation if needed by code under test
if (mockBaseSupplier.subscription) {
    mockBaseSupplier.subscription.supplier = mockBaseSupplier;
}


const mockStripeCustomerOutput = { id: 'cus_test_stripe_customer_id' };

const mockCreateSupplierDtoBase: CreateSupplierDto = {
    supplier_name: 'Test DTO Supplier',
    supplier_creator: 'DTO Creator',
    contact_email: 'dto@supplier.com',
    phone_number: '987654321',
    address: 'DTO Address',
    description: 'DTO Description',
    logo_url: 'http://dto.logo.url/dto.png',
    is_subscribed: false,
    has_card_subscription: false,
    has_sensor_subscription: false,
    has_ai_feature_subscription: false, // Added
    employee_count: 5,
    card_count: 5,
};
// --- End Mock Data Definitions ---


// --- Mock Implementations ---
const mockSupplierRepoImpl = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockSubscriptionRepoImpl = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
};

const mockEmployeeServiceImpl = {
  create: jest.fn(),
  findBySupplier: jest.fn(),
};

const mockEmailServiceImpl = {
  sendSupplierCreationEmail: jest.fn(),
};

const mockStripeServiceImpl = {
  findOrCreateCustomer: jest.fn(),
};

const mockLoggerServiceImpl = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};
// --- End Mock Implementations ---


describe('SupplierService', () => {
  let service: SupplierService;
  let supplierRepository: Repository<Supplier>;
  let subscriptionRepository: Repository<SupplierSubscription>;
  let employeeService: EmployeeService;
  let emailService: EmailService;
  let logger: StructuredLoggerService;
  let stripeService: StripeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierService,
        { provide: getRepositoryToken(Supplier), useValue: mockSupplierRepoImpl },
        { provide: getRepositoryToken(SupplierSubscription), useValue: mockSubscriptionRepoImpl },
        { provide: EmployeeService, useValue: mockEmployeeServiceImpl },
        { provide: EmailService, useValue: mockEmailServiceImpl },
        { provide: StructuredLoggerService, useValue: mockLoggerServiceImpl },
        { provide: StripeService, useValue: mockStripeServiceImpl },
      ],
    }).compile();

    service = module.get<SupplierService>(SupplierService);
    supplierRepository = module.get<Repository<Supplier>>(getRepositoryToken(Supplier));
    subscriptionRepository = module.get<Repository<SupplierSubscription>>(getRepositoryToken(SupplierSubscription));
    employeeService = module.get<EmployeeService>(EmployeeService);
    emailService = module.get<EmailService>(EmailService);
    logger = module.get<StructuredLoggerService>(StructuredLoggerService);
    stripeService = module.get<StripeService>(StripeService);

    jest.clearAllMocks(); // Clear all mocks before each test
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Tests for 'create' method (Stripe aspects are under 'Stripe Integration' describe block) ---
  describe('create (Non-Stripe aspects)', () => {
    const createDto = { ...mockCreateSupplierDtoBase };
    const savedSupplier = { ...mockBaseSupplier, id: 'sup_created_id', ...createDto };
    const savedSubscription = { ...mockBaseSupplierSubscription, id: 'sub_created_id', supplier: savedSupplier };

    beforeEach(() => {
        // Common setup for successful supplier creation (non-Stripe part)
        (supplierRepository.findOne as jest.Mock).mockResolvedValue(null); // No existing supplier by name
        (supplierRepository.create as jest.Mock).mockReturnValue(savedSupplier);
        (supplierRepository.save as jest.Mock).mockResolvedValue(savedSupplier);
        (subscriptionRepository.create as jest.Mock).mockReturnValue(savedSubscription);
        (subscriptionRepository.save as jest.Mock).mockResolvedValue(savedSubscription); // First save for subscription
        (employeeService.create as jest.Mock).mockResolvedValue({ id: 'emp_id' } as any);
        (emailService.sendSupplierCreationEmail as jest.Mock).mockResolvedValue(true as any);
        // Mock for the findOne call at the end of the create method
        // This is tricky because 'service.findOne' itself uses supplierRepository.findOne.
        // We are testing 'create', so we mock its direct dependencies.
        // The final `return this.findOne(...)` will use the mocks already set up for supplierRepository.
        // For this specific call, we ensure it gets the fully assembled supplier for the return.
        (supplierRepository.findOne as jest.Mock).mockResolvedValueOnce(null) // For name check
                                                 .mockResolvedValueOnce(savedSupplier); // For the final return this.findOne()
    });

    it('should save has_ai_feature_subscription from DTO', async () => {
      const dtoWithAiFeature = { ...createDto, has_ai_feature_subscription: true };
      const expectedSubscriptionData = {
        ...savedSubscription, // Contains other defaults from mockBaseSupplierSubscription
        is_subscribed: dtoWithAiFeature.is_subscribed,
        has_card_subscription: dtoWithAiFeature.has_card_subscription,
        has_sensor_subscription: dtoWithAiFeature.has_sensor_subscription,
        has_ai_feature_subscription: true, // This is being tested
        max_employee_count: dtoWithAiFeature.employee_count,
        max_card_count: dtoWithAiFeature.card_count,
        supplier: savedSupplier,
      };
      (subscriptionRepository.create as jest.Mock).mockReturnValue(expectedSubscriptionData);
      (subscriptionRepository.save as jest.Mock).mockResolvedValue(expectedSubscriptionData);


      await service.create(dtoWithAiFeature);

      expect(subscriptionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ has_ai_feature_subscription: true })
      );
      expect(subscriptionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ has_ai_feature_subscription: true })
      );
    });
  });


  // --- Tests for Stripe Integration ---
  describe('Stripe Integration', () => {
    describe('create method (Stripe aspects)', () => {
      const createDtoSubscribed = { ...mockCreateSupplierDtoBase, is_subscribed: true, contact_email: 'stripe@test.com', supplier_name: 'Stripe Test Inc' };
      const savedSupplier = { ...mockBaseSupplier, id: 'sup_stripe_create', ...createDtoSubscribed };
      // Initial subscription state before Stripe customer ID is added
      const initialSubscription = {
          ...mockBaseSupplierSubscription,
          id: 'sub_stripe_create_init',
          supplier: savedSupplier,
          is_subscribed: true,
          stripe_customer_id: null,
          has_ai_feature_subscription: createDtoSubscribed.has_ai_feature_subscription,
      };

      beforeEach(() => {
        (supplierRepository.findOne as jest.Mock).mockResolvedValue(null); // No existing supplier by name
        (supplierRepository.create as jest.Mock).mockReturnValue(savedSupplier);
        (supplierRepository.save as jest.Mock).mockResolvedValue(savedSupplier);
        (subscriptionRepository.create as jest.Mock).mockReturnValue(initialSubscription);
        // Important: subscriptionRepository.save will be called twice if Stripe customer is created.
        // 1. Initial save of subscription.
        // 2. Save after stripe_customer_id is added.
        // We mock it to return the entity passed to it.
        (subscriptionRepository.save as jest.Mock).mockImplementation(entity => Promise.resolve(entity));
        (employeeService.create as jest.Mock).mockResolvedValue({ id: 'emp_stripe_id' } as any);
        (emailService.sendSupplierCreationEmail as jest.Mock).mockResolvedValue(true as any);
        // Mock for the final `this.findOne(savedSupplier.id)` call in `create`
        // It should return the supplier with its subscription potentially updated with stripe_customer_id
        const finalSupplierWithSubscription = {
            ...savedSupplier,
            subscription: { ...initialSubscription, stripe_customer_id: mockStripeCustomerOutput.id }
        };
        (service.findOne as jest.Mock) = jest.fn().mockResolvedValue(finalSupplierWithSubscription);
      });

      it('should call stripeService.findOrCreateCustomer if is_subscribed is true', async () => {
        (stripeService.findOrCreateCustomer as jest.Mock).mockResolvedValueOnce(mockStripeCustomerOutput);
        await service.create(createDtoSubscribed);
        expect(stripeService.findOrCreateCustomer).toHaveBeenCalledWith(
          createDtoSubscribed.contact_email,
          createDtoSubscribed.supplier_name,
          savedSupplier.id,
        );
      });

      it('should save stripe_customer_id to subscription if is_subscribed is true and Stripe customer created', async () => {
        (stripeService.findOrCreateCustomer as jest.Mock).mockResolvedValueOnce(mockStripeCustomerOutput);
        await service.create(createDtoSubscribed);
        // Called once for initial subscription, once for Stripe customer ID update
        expect(subscriptionRepository.save).toHaveBeenCalledTimes(2);
        expect(subscriptionRepository.save).toHaveBeenLastCalledWith(
          expect.objectContaining({
            id: initialSubscription.id,
            stripe_customer_id: mockStripeCustomerOutput.id,
          }),
        );
        expect(logger.log).toHaveBeenCalledWith(`Stripe customer ${mockStripeCustomerOutput.id} linked to supplier ${savedSupplier.id} and subscription ${initialSubscription.id}`);
      });

      it('should not call stripeService.findOrCreateCustomer if is_subscribed is false', async () => {
        const createDtoNotSubscribed = { ...mockCreateSupplierDtoBase, is_subscribed: false };
        // Need to adjust the mock for `this.findOne` if it's called at the end of create
        (service.findOne as jest.Mock) = jest.fn().mockResolvedValue({ ...savedSupplier, subscription: initialSubscription });

        await service.create(createDtoNotSubscribed);
        expect(stripeService.findOrCreateCustomer).not.toHaveBeenCalled();
      });

      it('should log error and complete supplier creation if stripeService.findOrCreateCustomer fails', async () => {
        const stripeError = new Error('Stripe Connection Error');
        (stripeService.findOrCreateCustomer as jest.Mock).mockRejectedValueOnce(stripeError);
        // Adjust findOne mock for this path
        (service.findOne as jest.Mock) = jest.fn().mockResolvedValue({ ...savedSupplier, subscription: initialSubscription });


        await service.create(createDtoSubscribed);
        expect(logger.error).toHaveBeenCalledWith(
          `Failed to create/link Stripe customer for supplier ${savedSupplier.id}: ${stripeError.message}`,
          stripeError.stack,
        );
        // Supplier and initial subscription should still be saved
        expect(supplierRepository.save).toHaveBeenCalledWith(savedSupplier);
        expect(subscriptionRepository.save).toHaveBeenCalledWith(initialSubscription); // Only initial save
        expect(subscriptionRepository.save).toHaveBeenCalledTimes(1);
      });
    });

    describe('updateStripeCustomerId', () => {
        const supplierId = 'sup_for_stripe_id_update';
        const newStripeCustomerId = 'cus_new_stripe_id';
        const supplierWithSub = {
            ...mockBaseSupplier,
            id: supplierId,
            subscription: { ...mockBaseSupplierSubscription, id: 'sub_for_update', stripe_customer_id: 'cus_old_id' }
        };

        it('should update stripe_customer_id successfully', async () => {
            (service.findOne as jest.Mock) = jest.fn().mockResolvedValue(supplierWithSub); // Mock internal call to this.findOne
            (subscriptionRepository.save as jest.Mock).mockImplementation(entity => Promise.resolve(entity));

            const result = await service.updateStripeCustomerId(supplierId, newStripeCustomerId);

            expect(service.findOne).toHaveBeenCalledWith(supplierId);
            expect(subscriptionRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'sub_for_update', stripe_customer_id: newStripeCustomerId })
            );
            expect(result.stripe_customer_id).toBe(newStripeCustomerId);
            expect(logger.log).toHaveBeenCalledWith(`Updating Stripe Customer ID for supplier ${supplierId} to ${newStripeCustomerId}`);
        });

        it('should throw error if supplier has no subscription record', async () => {
            (service.findOne as jest.Mock) = jest.fn().mockResolvedValue({ ...supplierWithSub, subscription: null });

            await expect(service.updateStripeCustomerId(supplierId, newStripeCustomerId))
                .rejects.toThrow(`Supplier ${supplierId} does not have a subscription record.`);
            expect(logger.error).toHaveBeenCalledWith(`Supplier ${supplierId} does not have a subscription record to update stripe_customer_id.`);
        });
         it('should throw error if supplier is not found by findOne', async () => {
            (service.findOne as jest.Mock) = jest.fn().mockRejectedValue(new BadRequestException(`El proveedor no existe`)); // Simulate findOne throwing

            await expect(service.updateStripeCustomerId(supplierId, newStripeCustomerId))
                .rejects.toThrow(`El proveedor no existe`);
        });
    });

    describe('activateSubscription', () => {
      const supplierId = 'sup_activate';
      const stripeSubId = 'sub_stripe_activate';
      const priceId = 'price_activate';
      const customerId = 'cus_activate';
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const supplierWithInactiveSub = {
        ...mockBaseSupplier, id: supplierId,
        subscription: { ...mockBaseSupplierSubscription, id: 'sub_local_activate', is_subscribed: false, subscription_status: 'pending' }
      };

      it('should activate subscription successfully', async () => {
        (service.findOne as jest.Mock) = jest.fn().mockResolvedValue(supplierWithInactiveSub);
        (subscriptionRepository.save as jest.Mock).mockImplementation(entity => Promise.resolve(entity));

        const result = await service.activateSubscription(supplierId, stripeSubId, priceId, customerId, endDate, 'active');

        expect(service.findOne).toHaveBeenCalledWith(supplierId);
        const savedSub = (subscriptionRepository.save as jest.Mock).mock.calls[0][0];
        expect(savedSub.is_subscribed).toBe(true);
        expect(savedSub.stripe_subscription_id).toBe(stripeSubId);
        expect(savedSub.stripe_price_id).toBe(priceId);
        expect(savedSub.stripe_customer_id).toBe(customerId);
        expect(savedSub.subscription_end_date).toEqual(endDate);
        expect(savedSub.subscription_status).toBe('active');
        expect(savedSub.subscription_start_date).toBeInstanceOf(Date);
        expect(logger.log).toHaveBeenCalledWith(`Activating subscription for supplier ${supplierId} with Stripe ID ${stripeSubId}`);
        expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Local subscription for supplier'));
      });

      it('should throw error if subscription record not found', async () => {
        (service.findOne as jest.Mock) = jest.fn().mockResolvedValue({ ...mockBaseSupplier, id: supplierId, subscription: null });
        await expect(service.activateSubscription(supplierId, stripeSubId, priceId, customerId, endDate))
          .rejects.toThrow(`Supplier ${supplierId} has no subscription record.`);
        expect(logger.error).toHaveBeenCalledWith(`Cannot activate subscription: Supplier ${supplierId} has no subscription record.`);
      });
    });

    describe('updateSubscriptionPaymentDetails', () => {
      const stripeSubId = 'sub_stripe_update_details';
      const newEndDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const newStatus = 'active_renewed_details';
      const existingSub = { ...mockBaseSupplierSubscription, id: 'sub_local_update_details', stripe_subscription_id: stripeSubId };

      it('should update payment details successfully', async () => {
        (subscriptionRepository.findOne as jest.Mock).mockResolvedValue(existingSub);
        (subscriptionRepository.save as jest.Mock).mockImplementation(entity => Promise.resolve(entity));

        const result = await service.updateSubscriptionPaymentDetails(stripeSubId, newEndDate, newStatus);

        expect(subscriptionRepository.findOne).toHaveBeenCalledWith({ where: { stripe_subscription_id: stripeSubId } });
        const savedSub = (subscriptionRepository.save as jest.Mock).mock.calls[0][0];
        expect(savedSub.subscription_end_date).toEqual(newEndDate);
        expect(savedSub.subscription_status).toBe(newStatus);
        expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Updating payment details'));
        expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Local subscription local_sub_update_details'));
      });

      it('should return null and log warning if local subscription not found', async () => {
        (subscriptionRepository.findOne as jest.Mock).mockResolvedValue(null);
        const result = await service.updateSubscriptionPaymentDetails(stripeSubId, newEndDate, newStatus);
        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(`Cannot update payment details: No local subscription found for Stripe ID ${stripeSubId}`);
        expect(subscriptionRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('deactivateSubscription', () => {
      const stripeSubId = 'sub_stripe_deactivate';
      const reason = 'user_cancelled';
      const existingSubActive = { ...mockBaseSupplierSubscription, id: 'sub_local_deactivate', stripe_subscription_id: stripeSubId, is_subscribed: true, subscription_status: 'active' };

      it('should deactivate subscription successfully', async () => {
        (subscriptionRepository.findOne as jest.Mock).mockResolvedValue(existingSubActive);
        (subscriptionRepository.save as jest.Mock).mockImplementation(entity => Promise.resolve(entity));

        const result = await service.deactivateSubscription(stripeSubId, reason);

        expect(subscriptionRepository.findOne).toHaveBeenCalledWith({ where: { stripe_subscription_id: stripeSubId } });
        const savedSub = (subscriptionRepository.save as jest.Mock).mock.calls[0][0];
        expect(savedSub.is_subscribed).toBe(false);
        expect(savedSub.subscription_status).toBe(reason);
        expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Deactivating subscription'));
        expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Local subscription sub_local_deactivate'));
      });

      it('should return null and log warning if local subscription not found', async () => {
        (subscriptionRepository.findOne as jest.Mock).mockResolvedValue(null);
        const result = await service.deactivateSubscription(stripeSubId, reason);
        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(`Cannot deactivate: No local subscription found for Stripe ID ${stripeSubId}`);
        expect(subscriptionRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});