import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StripeController } from './stripe.controller';
import { StripeService } from '../../application/services/stripe.service';
import { StructuredLoggerService } from '../../infrastructure/logging/structured-logger.service';
import { HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import Stripe from 'stripe'; // Import Stripe type for mockStripeEvent

// --- Mock Data Definitions ---
const mockCheckoutDto = { supplierId: 'sup_1a2b3c', priceId: 'price_4d5e6f' };
const mockSessionId = 'cs_test_session_12345';
const mockStripeEventBase: Partial<Stripe.Event> = {
    id: 'evt_test_webhook_event',
    object: 'event',
    api_version: '2023-10-16', // Match the version used in StripeService
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
};
const mockWebhookPayload = {
  type: 'checkout.session.completed',
  data: { object: { id: 'cs_123', /* other checkout session data */ } },
};
const mockStripeValidEvent: Stripe.Event = {
  ...mockStripeEventBase,
  type: 'checkout.session.completed',
  data: { object: mockWebhookPayload.data.object as any },
} as Stripe.Event;


// --- Mock Implementations ---
const mockStripeServiceImpl = {
  createCheckoutSession: jest.fn(),
  handleWebhookEvent: jest.fn(),
};

const mockConfigServiceImpl = {
  get: jest.fn((key: string) => {
    if (key === 'CLIENT_APP_URL') return 'http://localhost:3001';
    return null;
  }),
};

const mockLoggerServiceImpl = {
  setContext: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
// --- End Mock Implementations ---

describe('StripeController', () => {
  let controller: StripeController;
  let stripeService: typeof mockStripeServiceImpl;
  // No need to get configService or loggerService from module if only used for providing mocks

  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeController],
      providers: [
        { provide: StripeService, useValue: mockStripeServiceImpl },
        { provide: ConfigService, useValue: mockConfigServiceImpl },
        { provide: StructuredLoggerService, useValue: mockLoggerServiceImpl },
      ],
    }).compile();

    controller = module.get<StripeController>(StripeController);
    stripeService = module.get<typeof mockStripeServiceImpl>(StripeService);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockRequest = { // Initialize mockRequest here for use in webhook tests
        headers: {},
        // rawBody will be set per test case for webhook tests
    };

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /checkout/session (createCheckoutSession)', () => {
    it('should successfully create a checkout session and return session ID', async () => {
      stripeService.createCheckoutSession.mockResolvedValueOnce({ id: mockSessionId } as any);

      await controller.createCheckoutSession(mockCheckoutDto, mockResponse as Response);

      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(
        mockCheckoutDto.supplierId,
        mockCheckoutDto.priceId,
        `http://localhost:3001/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        `http://localhost:3001/payment/cancel`,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith({ sessionId: mockSessionId });
    });

    it('should return 400 if supplierId is missing (controller level check)', async () => {
      // This tests the controller's explicit check. ValidationPipe would normally handle this.
      const dtoWithMissingSupplierId = { ...mockCheckoutDto, supplierId: '' };
      await controller.createCheckoutSession(dtoWithMissingSupplierId, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'supplierId and priceId are required.' });
    });

    it('should return 400 if priceId is missing (controller level check)', async () => {
      const dtoWithMissingPriceId = { ...mockCheckoutDto, priceId: '' };
      await controller.createCheckoutSession(dtoWithMissingPriceId, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'supplierId and priceId are required.' });
    });

    it('should return 500 if stripeService.createCheckoutSession throws an error', async () => {
      const serviceError = new Error('Stripe service error');
      stripeService.createCheckoutSession.mockRejectedValueOnce(serviceError);

      await controller.createCheckoutSession(mockCheckoutDto, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Failed to create checkout session.' });
      expect(mockLoggerServiceImpl.error).toHaveBeenCalledWith(
        `Error creating checkout session: ${serviceError.message}`,
        serviceError.stack,
        { supplierId: mockCheckoutDto.supplierId }
      );
    });
  });

  describe('POST /webhook (handleWebhook)', () => {
    const validSignature = 'valid_stripe_signature';
    const rawBodyPayload = Buffer.from(JSON.stringify(mockWebhookPayload));

    it('should successfully process a valid webhook event', async () => {
      mockRequest.headers['stripe-signature'] = validSignature;
      mockRequest.rawBody = rawBodyPayload;
      stripeService.handleWebhookEvent.mockResolvedValueOnce(mockStripeValidEvent as any);

      await controller.handleWebhook(validSignature, mockRequest as Request, mockResponse as Response);

      expect(stripeService.handleWebhookEvent).toHaveBeenCalledWith(rawBodyPayload, validSignature);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({ received: true });
    });

    it('should return 400 if stripe-signature is missing', async () => {
      mockRequest.rawBody = rawBodyPayload;
      // Signature is undefined when calling controller.handleWebhook
      await controller.handleWebhook(undefined, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.send).toHaveBeenCalledWith('Missing Stripe signature.');
      expect(stripeService.handleWebhookEvent).not.toHaveBeenCalled();
    });

    it('should return 500 if req.rawBody is not available', async () => {
        mockRequest.headers['stripe-signature'] = validSignature;
        mockRequest.rawBody = undefined; // Simulate rawBody not being available

        await controller.handleWebhook(validSignature, mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(mockResponse.send).toHaveBeenCalledWith('Server configuration error for raw body.');
        expect(stripeService.handleWebhookEvent).not.toHaveBeenCalled();
    });

    it('should return 400 if StripeService throws StripeSignatureVerificationError', async () => {
      mockRequest.headers['stripe-signature'] = 'invalid_signature';
      mockRequest.rawBody = rawBodyPayload;

      const sigError = new Error('Invalid Signature');
      (sigError as any).type = 'StripeSignatureVerificationError'; // Mimic Stripe error type
      stripeService.handleWebhookEvent.mockRejectedValueOnce(sigError);

      await controller.handleWebhook('invalid_signature', mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.send).toHaveBeenCalledWith(`Webhook Error: ${sigError.message}`);
    });

    it('should return 500 if StripeService throws other errors', async () => {
      mockRequest.headers['stripe-signature'] = validSignature;
      mockRequest.rawBody = rawBodyPayload;
      const otherError = new Error('Webhook processing error');
      stripeService.handleWebhookEvent.mockRejectedValueOnce(otherError);

      await controller.handleWebhook(validSignature, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.send).toHaveBeenCalledWith(`Webhook Error: ${otherError.message}`);
    });
  });
});
