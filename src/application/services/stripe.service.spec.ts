import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { SupplierService } from './supplier.service';
import { StructuredLoggerService } from '../../infrastructure/logging/structured-logger.service';
import { Supplier } from '../../domain/entities/supplier.entity';
import { SupplierSubscription } from '../../domain/entities/supplier-subscription.entity';

// --- Mock Data Definitions ---
const mockStripeCustomer: Stripe.Customer = {
  id: 'cus_test123',
  object: 'customer',
  email: 'test@example.com',
  name: 'Test Supplier',
  metadata: { app_supplier_id: 'sup_123' },
  // Add other necessary fields for Stripe.Customer
  address: null, balance: 0, created: 0, currency: null, default_source: null, delinquent: false,
  description: null, discount: null, invoice_prefix: null, invoice_settings: {} as any, livemode: false,
  next_invoice_sequence: 0, phone: null, preferred_locales: [], shipping: null, tax_exempt: 'none',
  subscriptions: { object: 'list', data: [], has_more: false, url: '', total_count: 0 },
  tax_ids: { object: 'list', data: [], has_more: false, url: '', total_count: 0 },
  // lastResponse: {} as any, // Not typically part of the resource itself
};

const mockCheckoutSession: Stripe.Checkout.Session = {
  id: 'cs_test123',
  object: 'checkout.session',
  amount_subtotal: 1000,
  amount_total: 1000,
  currency: 'usd',
  customer: 'cus_test123',
  payment_status: 'paid',
  status: 'complete',
  subscription: 'sub_test123',
  url: 'https://checkout.stripe.com/pay/cs_test_a1b2c3d4e5f6g7h8i9j0',
  metadata: { app_supplier_id: 'sup_123', stripe_price_id: 'price_123' },
  // Add other necessary fields
  after_expiration: null, allow_promotion_codes: null, automatic_tax: {} as any, billing_address_collection: null,
  cancel_url: '', client_reference_id: null, consent: null, consent_collection: null, created: 0,
  customer_creation: 'if_required', customer_details: {} as any, customer_email: null, expires_at: 0, livemode: false,
  locale: null, mode: 'subscription', payment_intent: null, payment_link: null, payment_method_collection: 'if_required',
  payment_method_options: {}, payment_method_types: ['card'], phone_number_collection: {} as any,
  recovered_from: null, setup_intent: null, shipping_address_collection: null, shipping_cost: null,
  shipping_details: null, shipping_options: [], submit_type: null, success_url: '', total_details: {} as any,
  // lastResponse: {} as any,
};

const mockStripeSubscription: Stripe.Subscription = {
  id: 'sub_test123',
  object: 'subscription',
  customer: 'cus_test123',
  status: 'active',
  items: {
    object: 'list',
    data: [{ id: 'si_test123', price: { id: 'price_123', object: 'price', active: true, billing_scheme: 'per_unit', created: 0, currency: 'usd', livemode: false, lookup_key: null, metadata: {}, nickname: null, product: 'prod_123', recurring: { aggregate_usage: null, interval: 'month', interval_count: 1, trial_period_days: null, usage_type: 'licensed' }, tax_behavior: 'unspecified', tiers_mode: null, transform_quantity: null, type: 'recurring', unit_amount: 1000, unit_amount_decimal: '1000' } } as Stripe.SubscriptionItem],
    has_more: false,
    url: '',
    total_count: 1,
  },
  current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
  current_period_start: Math.floor(Date.now() / 1000),
  metadata: { app_supplier_id: 'sup_123', stripe_price_id: 'price_123' },
  // Add other necessary fields
  application: null, application_fee_percent: null, automatic_tax: {} as any, billing_cycle_anchor: 0,
  billing_thresholds: null, cancel_at: null, cancel_at_period_end: false, canceled_at: null,
  collection_method: 'charge_automatically', created: 0, days_until_due: null, default_payment_method: null,
  default_source: null, default_tax_rates: [], discount: null, ended_at: null, latest_invoice: 'in_test123',
  livemode: false, next_pending_invoice_item_invoice: null, pause_collection: null, payment_settings: {} as any,
  pending_invoice_item_interval: null, pending_setup_intent: null, pending_update: null, schedule: null,
  start_date: 0, test_clock: null, transfer_data: null, trial_end: null, trial_start: null,
  // lastResponse: {} as any,
};

const mockSupplier = {
  id: 'sup_123',
  contact_email: 'supplier@example.com',
  supplier_name: 'Supplier Test',
  subscription: {
    id: 'sub_local_123',
    stripe_customer_id: 'cus_test123',
    stripe_subscription_id: null, // Initially null
    stripe_price_id: null,
    is_subscribed: false,
    subscription_status: 'incomplete',
  } as SupplierSubscription,
} as Supplier;


// --- Mock Implementations ---
const mockStripeClientImpl = {
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

const mockConfigServiceImpl = {
  get: jest.fn((key: string) => {
    if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
    if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test_123';
    if (key === 'CLIENT_APP_URL') return 'http://localhost:3001';
    return null;
  }),
};

const mockSupplierServiceImpl = {
  findOne: jest.fn(),
  updateStripeCustomerId: jest.fn(),
  activateSubscription: jest.fn(),
  updateSubscriptionPaymentDetails: jest.fn(),
  deactivateSubscription: jest.fn(),
};

const mockLoggerServiceImpl = {
  setContext: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(), // Added for completeness
  verbose: jest.fn(), // Added for completeness
};
// --- End Mock Implementations ---


describe('StripeService', () => {
  let service: StripeService;
  let stripeClient: typeof mockStripeClientImpl;
  let supplierService: typeof mockSupplierServiceImpl;
  let configService: typeof mockConfigServiceImpl; // Use the typed mock

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: 'STRIPE_CLIENT', useValue: mockStripeClientImpl },
        { provide: ConfigService, useValue: mockConfigServiceImpl },
        { provide: SupplierService, useValue: mockSupplierServiceImpl },
        { provide: StructuredLoggerService, useValue: mockLoggerServiceImpl },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    stripeClient = module.get<typeof mockStripeClientImpl>('STRIPE_CLIENT');
    supplierService = module.get<typeof mockSupplierServiceImpl>(SupplierService);
    configService = module.get<typeof mockConfigServiceImpl>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateCustomer', () => {
    it('should create a new customer if none exists', async () => {
      stripeClient.customers.list.mockResolvedValueOnce({ data: [] } as any);
      stripeClient.customers.create.mockResolvedValueOnce(mockStripeCustomer as any);

      const customer = await service.findOrCreateCustomer('new@example.com', 'New Supplier', 'sup_new');

      expect(stripeClient.customers.list).toHaveBeenCalledWith({ email: 'new@example.com', limit: 1 });
      expect(stripeClient.customers.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        name: 'New Supplier',
        metadata: { app_supplier_id: 'sup_new' },
      });
      expect(customer).toEqual(mockStripeCustomer);
    });

    it('should return an existing customer if found by email and metadata matches', async () => {
      stripeClient.customers.list.mockResolvedValueOnce({ data: [mockStripeCustomer] } as any);

      const customer = await service.findOrCreateCustomer(mockStripeCustomer.email, mockStripeCustomer.name, mockStripeCustomer.metadata.app_supplier_id);

      expect(stripeClient.customers.list).toHaveBeenCalledWith({ email: mockStripeCustomer.email, limit: 1 });
      expect(stripeClient.customers.create).not.toHaveBeenCalled();
      expect(stripeClient.customers.update).not.toHaveBeenCalled(); // Metadata matches
      expect(customer).toEqual(mockStripeCustomer);
    });

    it('should update metadata if existing customer found but missing app_supplier_id', async () => {
      const customerWithoutAppId = { ...mockStripeCustomer, id: 'cus_no_appid', metadata: { some_other_meta: 'value' } };
      const updatedCustomer = { ...customerWithoutAppId, metadata: { ...customerWithoutAppId.metadata, app_supplier_id: 'sup_123' } };
      stripeClient.customers.list.mockResolvedValueOnce({ data: [customerWithoutAppId] } as any);
      stripeClient.customers.update.mockResolvedValueOnce(updatedCustomer as any);

      const customer = await service.findOrCreateCustomer(customerWithoutAppId.email, customerWithoutAppId.name, 'sup_123');

      expect(stripeClient.customers.list).toHaveBeenCalledWith({ email: customerWithoutAppId.email, limit: 1 });
      expect(stripeClient.customers.update).toHaveBeenCalledWith('cus_no_appid', { metadata: { app_supplier_id: 'sup_123' } });
      expect(customer).toEqual(updatedCustomer);
    });
  });

  describe('createCheckoutSession', () => {
    it('should successfully create and return a checkout session', async () => {
      supplierService.findOne.mockResolvedValueOnce(mockSupplier as any);
      // Mock findOrCreateCustomer to return our mockStripeCustomer
      jest.spyOn(service, 'findOrCreateCustomer').mockResolvedValueOnce(mockStripeCustomer as any);
      stripeClient.checkout.sessions.create.mockResolvedValueOnce(mockCheckoutSession as any);

      const session = await service.createCheckoutSession('sup_123', 'price_123', 'http://success.url', 'http://cancel.url');

      expect(supplierService.findOne).toHaveBeenCalledWith('sup_123');
      expect(service.findOrCreateCustomer).toHaveBeenCalledWith(mockSupplier.contact_email, mockSupplier.supplier_name, mockSupplier.id);
      expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith({
        payment_method_types: ['card'],
        line_items: [{ price: 'price_123', quantity: 1 }],
        mode: 'subscription',
        customer: mockStripeCustomer.id,
        success_url: 'http://success.url',
        cancel_url: 'http://cancel.url',
        metadata: {
          app_supplier_id: 'sup_123',
          stripe_price_id: 'price_123',
        },
      });
      expect(session).toEqual(mockCheckoutSession);
    });

    it('should log message if Stripe customer ID on supplier subscription differs (actual update is by SupplierService)', async () => {
      const supplierWithDifferentCustId = {
        ...mockSupplier,
        subscription: { ...mockSupplier.subscription, stripe_customer_id: 'cus_old123' } as SupplierSubscription,
      };
      supplierService.findOne.mockResolvedValueOnce(supplierWithDifferentCustId as any);
      jest.spyOn(service, 'findOrCreateCustomer').mockResolvedValueOnce(mockStripeCustomer as any); // mockStripeCustomer.id is 'cus_test123'
      stripeClient.checkout.sessions.create.mockResolvedValueOnce(mockCheckoutSession as any);

      await service.createCheckoutSession('sup_123', 'price_123', 'http://success.url', 'http://cancel.url');

      expect(mockLoggerServiceImpl.log).toHaveBeenCalledWith(
        `Local supplier sup_123 should be updated with Stripe customer ID ${mockStripeCustomer.id} by SupplierService`
      );
      // Note: The subtask asks to test if `supplierService.updateStripeCustomerId` is called.
      // However, the current implementation of `StripeService.createCheckoutSession` only logs this.
      // The actual call to update the customer ID is expected to be in `SupplierService.create`.
      // This test verifies the log message as per the current code.
    });

    it('should throw error if supplier not found', async () => {
      supplierService.findOne.mockResolvedValueOnce(null);

      await expect(service.createCheckoutSession('sup_unknown', 'price_123', 'http://success.url', 'http://cancel.url'))
        .rejects.toThrow('Supplier with ID sup_unknown not found.');
      expect(stripeClient.checkout.sessions.create).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhookEvent', () => {
    const validPayload = JSON.stringify({ id: 'evt_test', type: 'test.event' });
    const validSignature = 'valid_stripe_signature';

    it('should throw error if webhook secret is not configured', async () => {
      configService.get.mockImplementationOnce((key: string) => key === 'STRIPE_WEBHOOK_SECRET' ? null : 'other_value');
      await expect(service.handleWebhookEvent(validPayload, validSignature))
        .rejects.toThrow('Stripe webhook secret is not configured.');
      expect(stripeClient.webhooks.constructEvent).not.toHaveBeenCalled();
    });

    it('should throw error if signature verification fails', async () => {
      stripeClient.webhooks.constructEvent.mockImplementationOnce(() => {
        const error = new Error('Invalid signature') as Stripe.errors.StripeSignatureVerificationError;
        error.type = 'StripeSignatureVerificationError'; // Add type property
        throw error;
      });
      await expect(service.handleWebhookEvent(validPayload, 'invalid_signature'))
        .rejects.toThrow('Webhook signature verification failed: Invalid signature');
    });

    describe('checkout.session.completed event', () => {
      const checkoutEventPayload = {
        ...mockCheckoutSession, // Use fields from mockCheckoutSession
        metadata: { app_supplier_id: 'sup_123', stripe_price_id: 'price_123' },
      };
      const stripeEvent: Stripe.Event = {
        id: 'evt_checkout_completed', type: 'checkout.session.completed',
        object: 'event', api_version: '2023-10-16', created: Date.now()/1000, livemode: false,
        pending_webhooks: 0, request: {id: null, idempotency_key: null},
        data: { object: checkoutEventPayload as any },
      };

      it('should activate subscription if payment_status is "paid"', async () => {
        stripeClient.webhooks.constructEvent.mockReturnValue(stripeEvent);
        stripeClient.subscriptions.retrieve.mockResolvedValueOnce(mockStripeSubscription as any);
        supplierService.activateSubscription.mockResolvedValueOnce({} as any); // Mock successful activation

        await service.handleWebhookEvent(validPayload, validSignature);

        expect(supplierService.activateSubscription).toHaveBeenCalledWith(
          'sup_123',
          mockCheckoutSession.subscription,
          mockCheckoutSession.metadata.stripe_price_id,
          mockCheckoutSession.customer,
          new Date(mockStripeSubscription.current_period_end * 1000),
          'active'
        );
      });

      it('should not activate subscription if payment_status is not "paid"', async () => {
        const unpaidEvent = { ...stripeEvent, data: { object: { ...checkoutEventPayload, payment_status: 'unpaid' } } };
        stripeClient.webhooks.constructEvent.mockReturnValue(unpaidEvent as any);

        await service.handleWebhookEvent(validPayload, validSignature);
        expect(supplierService.activateSubscription).not.toHaveBeenCalled();
        expect(mockLoggerServiceImpl.log).toHaveBeenCalledWith(expect.stringContaining('payment_status is unpaid'));
      });

      it('should throw error if critical metadata is missing', async () => {
        const eventMissingMeta = { ...stripeEvent, data: { object: { ...checkoutEventPayload, metadata: { app_supplier_id: 'sup_123'} } } }; // Missing stripe_price_id
        stripeClient.webhooks.constructEvent.mockReturnValue(eventMissingMeta as any);

        await expect(service.handleWebhookEvent(validPayload, validSignature))
            .rejects.toThrow('Missing critical information in checkout session event.');
      });
    });

    describe('invoice.payment_succeeded event', () => {
        const invoice = { id: 'in_123', subscription: 'sub_123', billing_reason: 'subscription_cycle' };
        const stripeEvent: Stripe.Event = {
            id: 'evt_invoice_succeeded', type: 'invoice.payment_succeeded',
            object: 'event', api_version: '2023-10-16', created: Date.now()/1000, livemode: false,
            pending_webhooks: 0, request: {id: null, idempotency_key: null},
            data: { object: invoice as any },
        };

        it('should update subscription details if billing_reason is "subscription_cycle"', async () => {
            stripeClient.webhooks.constructEvent.mockReturnValue(stripeEvent);
            stripeClient.subscriptions.retrieve.mockResolvedValueOnce(mockStripeSubscription as any);
            supplierService.updateSubscriptionPaymentDetails.mockResolvedValueOnce({} as any);

            await service.handleWebhookEvent(validPayload, validSignature);

            expect(supplierService.updateSubscriptionPaymentDetails).toHaveBeenCalledWith(
                'sub_123',
                new Date(mockStripeSubscription.current_period_end * 1000),
                'active'
            );
        });

        it('should not update if billing_reason is not "subscription_cycle"', async () => {
            const otherReasonEvent = { ...stripeEvent, data: { object: { ...invoice, billing_reason: 'subscription_create' } } };
            stripeClient.webhooks.constructEvent.mockReturnValue(otherReasonEvent as any);

            await service.handleWebhookEvent(validPayload, validSignature);
            expect(supplierService.updateSubscriptionPaymentDetails).not.toHaveBeenCalled();
            expect(mockLoggerServiceImpl.log).toHaveBeenCalledWith(expect.stringContaining('not for a subscription cycle'));
        });
    });

    describe('invoice.payment_failed event', () => {
        const failedInvoice = { id: 'in_fail_123', subscription: 'sub_fail_123' };
        const stripeEvent: Stripe.Event = {
            id: 'evt_invoice_failed', type: 'invoice.payment_failed',
            object: 'event', api_version: '2023-10-16', created: Date.now()/1000, livemode: false,
            pending_webhooks: 0, request: {id: null, idempotency_key: null},
            data: { object: failedInvoice as any },
        };
        it('should log a warning for failed invoice payment', async () => {
            stripeClient.webhooks.constructEvent.mockReturnValue(stripeEvent);
            await service.handleWebhookEvent(validPayload, validSignature);
            expect(mockLoggerServiceImpl.warn).toHaveBeenCalledWith(
                `Invoice payment failed for subscription ${failedInvoice.subscription}. Current Stripe status (from subscription object if fetched) should reflect this. Consider notifying supplier.`
            );
        });
    });

    describe('customer.subscription.updated event', () => {
        const updatedSubEventData = { ...mockStripeSubscription, id: 'sub_updated_xyz', status: 'past_due' as Stripe.Subscription.Status };
        const stripeEvent: Stripe.Event = {
            id: 'evt_sub_updated', type: 'customer.subscription.updated',
            object: 'event', api_version: '2023-10-16', created: Date.now()/1000, livemode: false,
            pending_webhooks: 0, request: {id: null, idempotency_key: null},
            data: { object: updatedSubEventData as any, previous_attributes: { status: 'active' } },
        };

        it('should update subscription details', async () => {
            stripeClient.webhooks.constructEvent.mockReturnValue(stripeEvent);
            supplierService.updateSubscriptionPaymentDetails.mockResolvedValueOnce({ stripe_price_id: 'price_123' } as any);

            await service.handleWebhookEvent(validPayload, validSignature);
            expect(supplierService.updateSubscriptionPaymentDetails).toHaveBeenCalledWith(
                updatedSubEventData.id,
                new Date(updatedSubEventData.current_period_end * 1000),
                updatedSubEventData.status
            );
        });

        it('should deactivate subscription if status changes to "canceled"', async () => {
            const canceledSubEventData = { ...updatedSubEventData, status: 'canceled' as Stripe.Subscription.Status };
            const canceledEvent = { ...stripeEvent, data: { ...stripeEvent.data, object: canceledSubEventData }};
            stripeClient.webhooks.constructEvent.mockReturnValue(canceledEvent as any);
            supplierService.updateSubscriptionPaymentDetails.mockResolvedValueOnce({ stripe_price_id: 'price_123' } as any);
            supplierService.deactivateSubscription.mockResolvedValueOnce({} as any);

            await service.handleWebhookEvent(validPayload, validSignature);

            expect(supplierService.updateSubscriptionPaymentDetails).toHaveBeenCalledWith(
                canceledSubEventData.id,
                new Date(canceledSubEventData.current_period_end * 1000),
                'canceled'
            );
            expect(supplierService.deactivateSubscription).toHaveBeenCalledWith(canceledSubEventData.id, 'canceled');
        });
    });

    describe('customer.subscription.deleted event', () => {
        const deletedSubEventData = { ...mockStripeSubscription, id: 'sub_deleted_xyz' };
        const stripeEvent: Stripe.Event = {
            id: 'evt_sub_deleted', type: 'customer.subscription.deleted',
            object: 'event', api_version: '2023-10-16', created: Date.now()/1000, livemode: false,
            pending_webhooks: 0, request: {id: null, idempotency_key: null},
            data: { object: deletedSubEventData as any },
        };
        it('should deactivate subscription', async () => {
            stripeClient.webhooks.constructEvent.mockReturnValue(stripeEvent);
            supplierService.deactivateSubscription.mockResolvedValueOnce({} as any);
            await service.handleWebhookEvent(validPayload, validSignature);
            expect(supplierService.deactivateSubscription).toHaveBeenCalledWith(deletedSubEventData.id, 'deleted');
        });
    });

    it('should log unhandled event types', async () => {
        const unhandledStripeEvent: Stripe.Event = {
            id: 'evt_unhandled', type: 'some.unhandled.type' as any, // Cast to any for testing unhandled type
            object: 'event', api_version: '2023-10-16', created: Date.now()/1000, livemode: false,
            pending_webhooks: 0, request: {id: null, idempotency_key: null},
            data: { object: { id: 'obj_unhandled' } as any },
        };
        stripeClient.webhooks.constructEvent.mockReturnValue(unhandledStripeEvent);
        await service.handleWebhookEvent(validPayload, validSignature);
        expect(mockLoggerServiceImpl.log).toHaveBeenCalledWith(
            `Unhandled webhook event type: ${unhandledStripeEvent.type} (ID: ${unhandledStripeEvent.id})`
        );
    });
  });
});
