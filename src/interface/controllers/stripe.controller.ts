import { Controller, Post, Body, Req, Res, Headers, Inject, HttpStatus, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { StripeService } from '../../application/services/stripe.service'; // Adjust path
import { StructuredLoggerService } from '../../infrastructure/logging/structured-logger.service'; // Adjust path
import { Public } from '../../application/decorators/public.decorator'; // For public webhook endpoint

// DTO for checkout session request
class CreateCheckoutSessionDto {
  supplierId: string;
  priceId: string; // Stripe Price ID
  // successUrl: string; // Optional: client can construct this or server can enforce
  // cancelUrl: string; // Optional
}

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext(StripeController.name);
  }

  /**
   * Endpoint to create a Stripe Checkout session.
   * This should be a protected endpoint, accessible by authenticated users/suppliers.
   */
  @Post('checkout/session')
  // Apply appropriate auth guards here, e.g., @UseGuards(AuthGuard)
  async createCheckoutSession(@Body() body: CreateCheckoutSessionDto, @Res() res: Response) {
    this.logger.log(`Received request to create checkout session for supplier: ${body.supplierId}, price: ${body.priceId}`);
    if (!body.supplierId || !body.priceId) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'supplierId and priceId are required.' });
    }

    try {
      // Construct success and cancel URLs. These could come from config or be dynamic.
      // For example, append session_id for success URL for client-side confirmation.
      const baseUrl = this.configService.get<string>('CLIENT_APP_URL') || 'http://localhost:3001'; // Fallback if not set
      const successUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/payment/cancel`;

      const session = await this.stripeService.createCheckoutSession(
        body.supplierId,
        body.priceId,
        successUrl,
        cancelUrl,
      );
      // Return the session ID or the full session URL for redirection
      // Stripe recommends redirecting on the client-side using stripe.redirectToCheckout({ sessionId: session.id });
      // So, just returning the session ID is common.
      return res.status(HttpStatus.CREATED).json({ sessionId: session.id });
    } catch (error) {
      this.logger.error(`Error creating checkout session: ${error.message}`, error.stack, { supplierId: body.supplierId });
      // Provide a generic error message to the client
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Failed to create checkout session.' });
    }
  }

  /**
   * Endpoint to handle incoming Stripe webhooks.
   * This endpoint must be public but secured by verifying the Stripe signature.
   */
  @Public() // Custom decorator to bypass global authentication guards if any
  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request, // Use raw body by configuring NestJS or use a custom body parser for webhooks
    @Res() res: Response,
  ) {
    this.logger.log('Received Stripe webhook');
    if (!signature) {
      this.logger.warn('Webhook request missing Stripe signature.');
      return res.status(HttpStatus.BAD_REQUEST).send('Missing Stripe signature.');
    }
    if (!req.rawBody) { // req.rawBody needs to be enabled in main.ts: app.use(express.raw({ type: 'application/json' }));
        this.logger.error('Raw body is not available for webhook processing. Ensure express.raw middleware is configured.');
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server configuration error for raw body.');
    }

    try {
      // The rawBody contains the JSON payload as a Buffer
      await this.stripeService.handleWebhookEvent(req.rawBody, signature);
      this.logger.log('Webhook event processed successfully.');
      return res.status(HttpStatus.OK).json({ received: true });
    } catch (error) {
      this.logger.error(`Webhook handling error: ${error.message}`, error.stack);
      // Specific error messages for Stripe signature verification issues
      if (error.type === 'StripeSignatureVerificationError') {
        return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${error.message}`);
      }
      // Generic error for other issues
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(`Webhook Error: ${error.message}`);
    }
  }
}
