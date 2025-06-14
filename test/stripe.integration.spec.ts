import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { SupplierService } from '../src/application/services/supplier.service';
import Stripe from 'stripe';
import * as crypto from 'crypto';

// --- Mock Implementations ---
const mockStripeSDK = {
  customers: { create: jest.fn(), list: jest.fn(), update: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  subscriptions: { retrieve: jest.fn() },
  webhooks: { constructEvent: jest.fn() },
};

const mockSupplierService = {
  findOne: jest.fn(),
  updateStripeCustomerId: jest.fn(),
  activateSubscription: jest.fn(),
  updateSubscriptionPaymentDetails: jest.fn(),
  deactivateSubscription: jest.fn(),
};
// --- End Mock Implementations ---

const MOCK_WEBHOOK_SECRET = 'whsec_test_integration_secret_12345';

// Helper function to generate a Stripe signature
const generateStripeSignature = (payload: string | Buffer, secret: string): string => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload.toString()}`; // Ensure payload is string
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
};


describe('Stripe Integration (Webhook E2E)', () => {
  let app: INestApplication;
  let httpServer: any; // To use with supertest
  // Mocks that will be spied upon or have their implementations controlled per test
  let localMockStripeSDK: typeof mockStripeSDK;
  let localMockSupplierService: typeof mockSupplierService;


  beforeAll(async () => {
    localMockStripeSDK = { ...mockStripeSDK }; // Clone to reset jest.fn states if needed or re-assign
    localMockSupplierService = { ...mockSupplierService };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider('STRIPE_CLIENT')
    .useValue(localMockStripeSDK)
    .overrideProvider(SupplierService)
    .useValue(localMockSupplierService)
    .overrideProvider(ConfigService)
    .useValue({
        get: (key: string) => {
            if (key === 'STRIPE_WEBHOOK_SECRET') return MOCK_WEBHOOK_SECRET;
            if (key === 'STRIPE_SECRET_KEY') return 'sk_test_from_override'; // Needed by StripeService constructor
            if (key === 'CLIENT_APP_URL') return 'http://localhost:3000';
            // Add other config gets if your app module initialization needs them
            return process.env[key]; // Fallback to real env for other keys if necessary
        }
    })
    .compile();

    app = moduleFixture.createNestApplication();
    // Middleware for raw body should be applied from main.ts.
    // If not, it needs to be applied here: app.use('/stripe/webhook', express.raw({ type: 'application/json' }));
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Reset all mock function calls before each test
    jest.clearAllMocks();
  });


  describe('POST /stripe/webhook', () => {
    const checkoutSessionCompletedPayload = {
      id: 'evt_checkout_session_completed_test',
      type: 'checkout.session.completed',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 0,
      request: { id: null, idempotency_key: null },
      object: 'event',
      data: {
        object: {
          id: 'cs_test_checkout_123',
          payment_status: 'paid',
          subscription: 'sub_test_subscription_123',
          customer: 'cus_test_customer_123',
          metadata: {
            app_supplier_id: 'supplier_integration_test_123',
            stripe_price_id: 'price_integration_test_123',
          },
        },
      },
    };

    const invoicePaymentSucceededPayload = {
      id: 'evt_invoice_payment_succeeded_test',
      type: 'invoice.payment_succeeded',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 0,
      request: { id: null, idempotency_key: null },
      object: 'event',
      data: {
        object: {
          id: 'in_test_invoice_123',
          subscription: 'sub_test_subscription_123',
          billing_reason: 'subscription_cycle',
          current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
        },
      },
    };

    const mockStripeSubscriptionData = {
        id: 'sub_test_subscription_123',
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
        status: 'active',
        items: { data: [{price: {id: 'price_integration_test_123'}}]}
    };


    it('should process a valid checkout.session.completed event', async () => {
      const payloadString = JSON.stringify(checkoutSessionCompletedPayload);
      const signature = generateStripeSignature(payloadString, MOCK_WEBHOOK_SECRET);

      // StripeService.handleWebhookEvent will call stripe.webhooks.constructEvent
      // then stripe.subscriptions.retrieve, then supplierService.activateSubscription
      localMockStripeSDK.webhooks.constructEvent.mockReturnValue(checkoutSessionCompletedPayload as any);
      localMockStripeSDK.subscriptions.retrieve.mockResolvedValue(mockStripeSubscriptionData as any);
      localMockSupplierService.activateSubscription.mockResolvedValue({} as any); // Assume success

      const response = await request(httpServer)
        .post('/stripe/webhook')
        .set('stripe-signature', signature)
        .type('application/json')
        .send(payloadString);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({ received: true });
      expect(localMockStripeSDK.webhooks.constructEvent).toHaveBeenCalledWith(Buffer.from(payloadString), signature, MOCK_WEBHOOK_SECRET);
      expect(localMockStripeSDK.subscriptions.retrieve).toHaveBeenCalledWith(checkoutSessionCompletedPayload.data.object.subscription);
      expect(localMockSupplierService.activateSubscription).toHaveBeenCalledWith(
        checkoutSessionCompletedPayload.data.object.metadata.app_supplier_id,
        checkoutSessionCompletedPayload.data.object.subscription,
        checkoutSessionCompletedPayload.data.object.metadata.stripe_price_id,
        checkoutSessionCompletedPayload.data.object.customer,
        new Date(mockStripeSubscriptionData.current_period_end * 1000),
        'active'
      );
    });

    it('should process a valid invoice.payment_succeeded event', async () => {
      const payloadString = JSON.stringify(invoicePaymentSucceededPayload);
      const signature = generateStripeSignature(payloadString, MOCK_WEBHOOK_SECRET);

      localMockStripeSDK.webhooks.constructEvent.mockReturnValue(invoicePaymentSucceededPayload as any);
      localMockStripeSDK.subscriptions.retrieve.mockResolvedValue(mockStripeSubscriptionData as any);
      localMockSupplierService.updateSubscriptionPaymentDetails.mockResolvedValue({} as any);

      const response = await request(httpServer)
        .post('/stripe/webhook')
        .set('stripe-signature', signature)
        .type('application/json')
        .send(payloadString);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({ received: true });
      expect(localMockStripeSDK.webhooks.constructEvent).toHaveBeenCalledWith(Buffer.from(payloadString), signature, MOCK_WEBHOOK_SECRET);
      expect(localMockStripeSDK.subscriptions.retrieve).toHaveBeenCalledWith(invoicePaymentSucceededPayload.data.object.subscription);
      expect(localMockSupplierService.updateSubscriptionPaymentDetails).toHaveBeenCalledWith(
        invoicePaymentSucceededPayload.data.object.subscription,
        new Date(mockStripeSubscriptionData.current_period_end * 1000),
        'active'
      );
    });

    it('should return 400 for an invalid signature', async () => {
      const payloadString = JSON.stringify(checkoutSessionCompletedPayload);
      const invalidSignature = 't=invalid,v1=invalid_sig_value';

      // Mock constructEvent to throw a StripeSignatureVerificationError
      const sigError = new Error('Invalid signature') as Stripe.errors.StripeSignatureVerificationError;
      sigError.type = 'StripeSignatureVerificationError';
      localMockStripeSDK.webhooks.constructEvent.mockImplementation(() => { throw sigError; });

      const response = await request(httpServer)
        .post('/stripe/webhook')
        .set('stripe-signature', invalidSignature)
        .type('application/json')
        .send(payloadString);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.text).toContain('Webhook Error: Invalid signature');
    });

    it('should return 400 for a missing signature', async () => {
      const payloadString = JSON.stringify(checkoutSessionCompletedPayload);
      const response = await request(httpServer)
        .post('/stripe/webhook')
        .type('application/json')
        .send(payloadString); // No stripe-signature header

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.text).toContain('Missing Stripe signature.');
    });

    it('should return 500 if SupplierService fails during event processing', async () => {
      const payloadString = JSON.stringify(checkoutSessionCompletedPayload);
      const signature = generateStripeSignature(payloadString, MOCK_WEBHOOK_SECRET);

      localMockStripeSDK.webhooks.constructEvent.mockReturnValue(checkoutSessionCompletedPayload as any);
      localMockStripeSDK.subscriptions.retrieve.mockResolvedValue(mockStripeSubscriptionData as any);
      localMockSupplierService.activateSubscription.mockRejectedValue(new Error('Database error during activation'));

      const response = await request(httpServer)
        .post('/stripe/webhook')
        .set('stripe-signature', signature)
        .type('application/json')
        .send(payloadString);

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.text).toContain('Webhook Error: Database error during activation'); // Error message from StripeController
    });
  });
});
