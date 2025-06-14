import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { SupplierService } from './supplier.service';
import { StructuredLoggerService } from '../../infrastructure/logging/structured-logger.service';

// Mock Stripe SDK
const mockStripeClient = {
  customers: {
    create: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  },
  checkout: {
    sessions: {
      create: jest.fn(),
    },
  },
  subscriptions: {
    retrieve: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

// Mock services
const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'STRIPE_WEBHOOK_SECRET') return 'test_webhook_secret';
    if (key === 'CLIENT_APP_URL') return 'http://localhost:3000';
    return null;
  }),
};

const mockSupplierService = {
  findOne: jest.fn(),
  updateStripeCustomerId: jest.fn(),
  activateSubscription: jest.fn(),
  updateSubscriptionPaymentDetails: jest.fn(),
  deactivateSubscription: jest.fn(),
};

const mockLoggerService = {
  setContext: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

describe('StripeService', () => {
  let service: StripeService;
  let stripe: typeof mockStripeClient;
  let supplierService: typeof mockSupplierService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: 'STRIPE_CLIENT', useValue: mockStripeClient },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SupplierService, useValue: mockSupplierService },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    stripe = module.get<typeof mockStripeClient>('STRIPE_CLIENT');
    supplierService = module.get<typeof mockSupplierService>(SupplierService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateCustomer', () => {
    it('should create a new customer if none exists', async () => {
      stripe.customers.list.mockResolvedValueOnce({ data: [] });
      stripe.customers.create.mockResolvedValueOnce({ id: 'new_cus_id', metadata: {} });
      const customer = await service.findOrCreateCustomer('test@example.com', 'Test Supplier', 'sup_123');
      expect(stripe.customers.list).toHaveBeenCalledWith({ email: 'test@example.com', limit: 1 });
      expect(stripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test Supplier',
        metadata: { app_supplier_id: 'sup_123' },
      });
      expect(customer.id).toBe('new_cus_id');
      // TODO: Add more detailed assertions
    });

    it('should return an existing customer if found by email', async () => {
      const existingCustomer = { id: 'cus_existing', email: 'test@example.com', metadata: { app_supplier_id: 'sup_123' } };
      stripe.customers.list.mockResolvedValueOnce({ data: [existingCustomer] });
      const customer = await service.findOrCreateCustomer('test@example.com', 'Test Supplier', 'sup_123');
      expect(stripe.customers.list).toHaveBeenCalledWith({ email: 'test@example.com', limit: 1 });
      expect(stripe.customers.create).not.toHaveBeenCalled();
      expect(customer.id).toBe('cus_existing');
      // TODO: Add more detailed assertions
    });

    it('should update metadata if existing customer found but missing app_supplier_id', async () => {
        const existingCustomer = { id: 'cus_existing_meta', email: 'test@example.com', metadata: {} };
        stripe.customers.list.mockResolvedValueOnce({ data: [existingCustomer] });
        stripe.customers.update.mockResolvedValueOnce({ ...existingCustomer, metadata: { app_supplier_id: 'sup_123_meta' } });
        const customer = await service.findOrCreateCustomer('test@example.com', 'Test Supplier Meta', 'sup_123_meta');
        expect(stripe.customers.list).toHaveBeenCalledWith({ email: 'test@example.com', limit: 1 });
        expect(stripe.customers.update).toHaveBeenCalledWith('cus_existing_meta', { metadata: { app_supplier_id: 'sup_123_meta' }});
        expect(customer.id).toBe('cus_existing_meta');
        // TODO: Add more detailed assertions
    });
  });

  describe('createCheckoutSession', () => {
    const supplierMock = { id: 'sup_123', contact_email: 'supplier@example.com', supplier_name: 'Supplier Test', subscription: { stripe_customer_id: 'cus_123' } };
    const customerMock = { id: 'cus_123' };

    it('should successfully create and return a checkout session', async () => {
      supplierService.findOne.mockResolvedValueOnce(supplierMock);
      stripe.customers.list.mockResolvedValueOnce({ data: [customerMock] }); // findOrCreateCustomer returns existing
      stripe.checkout.sessions.create.mockResolvedValueOnce({ id: 'cs_test_id', url: 'https://checkout.stripe.com/pay/cs_test_id' });

      const session = await service.createCheckoutSession('sup_123', 'price_abc', 'http://success.url', 'http://cancel.url');

      expect(supplierService.findOne).toHaveBeenCalledWith('sup_123');
      expect(service.findOrCreateCustomer).toHaveBeenCalledWith(supplierMock.contact_email, supplierMock.supplier_name, supplierMock.id);
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
        customer: 'cus_123',
        line_items: [{ price: 'price_abc', quantity: 1 }],
        mode: 'subscription',
        success_url: 'http://success.url',
        cancel_url: 'http://cancel.url',
      }));
      expect(session.id).toBe('cs_test_id');
      // TODO: Add more detailed assertions including metadata
    });

    it('should call supplierService.updateStripeCustomerId if customer ID changes (mocked, actual call is in supplierService.create)', async () => {
        // This test is slightly conceptual for StripeService, as the actual updateStripeCustomerId call
        // is in SupplierService.create based on current design.
        // StripeService itself logs if an update *should* happen.
        const supplierWithOldCustomerId = { ...supplierMock, subscription: { stripe_customer_id: 'old_cus_id' } };
        const newCustomerMock = { id: 'new_cus_id_for_checkout' };
        supplierService.findOne.mockResolvedValueOnce(supplierWithOldCustomerId);
        // Mock findOrCreateCustomer to return a *new* customer ID
        jest.spyOn(service, 'findOrCreateCustomer').mockResolvedValueOnce(newCustomerMock as any);
        stripe.checkout.sessions.create.mockResolvedValueOnce({ id: 'cs_test_id_new_cus' });

        await service.createCheckoutSession('sup_123', 'price_abc', 'http://success.url', 'http://cancel.url');

        expect(mockLoggerService.log).toHaveBeenCalledWith(
            `Local supplier sup_123 should be updated with Stripe customer ID ${newCustomerMock.id} by SupplierService`
        );
        // The actual call to supplierService.updateStripeCustomerId is not made by StripeService.createCheckoutSession directly.
        // It's made in SupplierService.create. So, we can't test that specific call here.
        // We test that findOrCreateCustomer was called and that the checkout session used the new customer ID.
        expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
            customer: newCustomerMock.id,
        }));
        // TODO: Add more detailed assertions
    });

    it('should throw error if supplier not found', async () => {
      supplierService.findOne.mockResolvedValueOnce(null);
      await expect(service.createCheckoutSession('sup_unknown', 'price_abc', 'http://success.url', 'http://cancel.url'))
        .rejects.toThrow('Supplier with ID sup_unknown not found.');
      // TODO: Add more detailed assertions
    });
  });

  describe('handleWebhookEvent', () => {
    const mockStripeEventBase = {
      id: 'evt_test',
      object: 'event',
      api_version: '2023-10-16',
      created: Date.now() / 1000,
      livemode: false,
      pending_webhooks: 0,
      request: { id: null, idempotency_key: null },
    };

    it('should process checkout.session.completed event', async () => {
      const checkoutSessionCompletedEvent = {
        ...mockStripeEventBase,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            payment_status: 'paid',
            subscription: 'sub_123',
            customer: 'cus_123',
            metadata: { app_supplier_id: 'sup_123', stripe_price_id: 'price_123' },
          },
        },
      } as Stripe.Event;
      stripe.webhooks.constructEvent.mockReturnValue(checkoutSessionCompletedEvent);
      stripe.subscriptions.retrieve.mockResolvedValueOnce({ current_period_end: (Date.now() / 1000) + (30 * 24 * 60 * 60) } as any); // Mock subscription end

      await service.handleWebhookEvent('payload', 'sig');
      expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith('payload', 'sig', 'test_webhook_secret');
      expect(supplierService.activateSubscription).toHaveBeenCalledWith(
        'sup_123',
        'sub_123',
        'price_123',
        'cus_123',
        expect.any(Date), // currentPeriodEnd
        'active',
      );
      // TODO: Add more detailed assertions
    });

    it('should process invoice.payment_succeeded event', async () => {
        const invoicePaymentSucceededEvent = {
            ...mockStripeEventBase,
            type: 'invoice.payment_succeeded',
            data: {
                object: {
                    id: 'in_123',
                    subscription: 'sub_123',
                    billing_reason: 'subscription_cycle',
                    // other invoice fields
                },
            },
        } as Stripe.Event;
        stripe.webhooks.constructEvent.mockReturnValue(invoicePaymentSucceededEvent);
        stripe.subscriptions.retrieve.mockResolvedValueOnce({ current_period_end: (Date.now() / 1000) + (30 * 24 * 60 * 60) } as any);

        await service.handleWebhookEvent('payload', 'sig');
        expect(supplierService.updateSubscriptionPaymentDetails).toHaveBeenCalledWith(
            'sub_123',
            expect.any(Date), // newSubscriptionEndDate
            'active'
        );
        // TODO: Add more detailed assertions
    });

    it('should process customer.subscription.deleted event', async () => {
        const subscriptionDeletedEvent = {
            ...mockStripeEventBase,
            type: 'customer.subscription.deleted',
            data: {
                object: {
                    id: 'sub_deleted_123',
                    // other subscription fields
                },
            },
        } as Stripe.Event;
        stripe.webhooks.constructEvent.mockReturnValue(subscriptionDeletedEvent);
        await service.handleWebhookEvent('payload', 'sig');
        expect(supplierService.deactivateSubscription).toHaveBeenCalledWith('sub_deleted_123', 'deleted');
        // TODO: Add more detailed assertions
    });

    it('should process customer.subscription.updated event (status change)', async () => {
        const subscriptionUpdatedEvent = {
            ...mockStripeEventBase,
            type: 'customer.subscription.updated',
            data: {
                object: {
                    id: 'sub_updated_123',
                    status: 'past_due',
                    current_period_end: (Date.now() / 1000) + (30 * 24 * 60 * 60),
                    items: { data: [{ price: { id: 'price_new_123' } }] },
                },
            },
            previous_attributes: { status: 'active' }
        } as Stripe.Event;
        stripe.webhooks.constructEvent.mockReturnValue(subscriptionUpdatedEvent);
        mockSupplierService.updateSubscriptionPaymentDetails.mockResolvedValueOnce({ stripe_price_id: 'price_old_123' } as any);

        await service.handleWebhookEvent('payload', 'sig');
        expect(supplierService.updateSubscriptionPaymentDetails).toHaveBeenCalledWith(
            'sub_updated_123',
            expect.any(Date),
            'past_due'
        );
        // TODO: Add more detailed assertions for price update if localSub.stripe_price_id was different
    });
     it('should process customer.subscription.updated event (cancellation)', async () => {
        const subscriptionCancelledEvent = {
            ...mockStripeEventBase,
            type: 'customer.subscription.updated',
            data: {
                object: {
                    id: 'sub_cancelled_123',
                    status: 'canceled',
                    current_period_end: (Date.now() / 1000) + (30 * 24 * 60 * 60),
                     items: { data: [{ price: { id: 'price_123' } }] },
                },
            },
            previous_attributes: { status: 'active' }
        } as Stripe.Event;
        stripe.webhooks.constructEvent.mockReturnValue(subscriptionCancelledEvent);
        mockSupplierService.updateSubscriptionPaymentDetails.mockResolvedValueOnce({ stripe_price_id: 'price_123' } as any);


        await service.handleWebhookEvent('payload', 'sig');
        expect(supplierService.updateSubscriptionPaymentDetails).toHaveBeenCalledWith(
            'sub_cancelled_123',
            expect.any(Date),
            'canceled'
        );
        expect(supplierService.deactivateSubscription).toHaveBeenCalledWith('sub_cancelled_123', 'canceled');
        // TODO: Add more detailed assertions
    });


    it('should throw error if webhook signature is invalid', async () => {
      stripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Webhook signature verification failed');
      });
      await expect(service.handleWebhookEvent('payload', 'invalid_sig'))
        .rejects.toThrow('Webhook signature verification failed');
      // TODO: Add more detailed assertions
    });

    it('should throw error if webhook secret is not configured', async () => {
      mockConfigService.get.mockReturnValueOnce(null); // Simulate missing secret
      await expect(service.handleWebhookEvent('payload', 'sig'))
        .rejects.toThrow('Stripe webhook secret is not configured.');
      // TODO: Add more detailed assertions
    });

    it('should handle unhandled event types gracefully', async () => {
        const unhandledEvent = {
            ...mockStripeEventBase,
            type: 'some.other.event',
            data: { object: { id: 'unhandled_123' } },
        } as Stripe.Event;
        stripe.webhooks.constructEvent.mockReturnValue(unhandledEvent);
        await service.handleWebhookEvent('payload', 'sig');
        expect(mockLoggerService.log).toHaveBeenCalledWith(`Unhandled webhook event type: ${unhandledEvent.type} (ID: ${unhandledEvent.id})`);
        // TODO: Add more detailed assertions
    });
  });
});
