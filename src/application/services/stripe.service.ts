import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SupplierService } from './supplier.service'; // Adjust path as needed
import { StructuredLoggerService } from '../../infrastructure/logging/structured-logger.service'; // Adjust path

@Injectable()
export class StripeService {
  constructor(
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    private readonly configService: ConfigService,
    // Use forwardRef if SupplierService imports StripeService or vice-versa, creating a circular dependency
    @Inject(forwardRef(() => SupplierService))
    private readonly supplierService: SupplierService,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext(StripeService.name);
  }

  async findOrCreateCustomer(email: string, name: string, appSupplierId: string): Promise<Stripe.Customer> {
    // Attempt to find customer by metadata (app_supplier_id) or email first.
    // This is a simplified version. A more robust solution would query by app_supplier_id metadata.
    const existingCustomers = await this.stripe.customers.list({ email: email, limit: 1 });
    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0];
      // Ensure our app_supplier_id metadata is set if it's missing
      if (!customer.metadata || customer.metadata.app_supplier_id !== appSupplierId) {
          await this.stripe.customers.update(customer.id, { metadata: { app_supplier_id: appSupplierId }});
          this.logger.log(`Updated metadata for existing Stripe customer ${customer.id} for supplier ${appSupplierId}`);
      }
      this.logger.log(`Found existing Stripe customer ${customer.id} for supplier ${appSupplierId}`);
      return customer;
    }

    this.logger.log(`Creating new Stripe customer for supplier ${appSupplierId} with email ${email}`);
    const customer = await this.stripe.customers.create({
      email: email,
      name: name,
      metadata: {
        app_supplier_id: appSupplierId,
      },
    });
    this.logger.log(`Created new Stripe customer ${customer.id} for supplier ${appSupplierId}`);
    return customer;
  }

  /**
   * Creates a Stripe Checkout session for a given supplier and price.
   * @param supplierId - The ID of the supplier in the local database.
   * @param priceId - The ID of the Stripe Price object.
   * @param successUrl - The URL to redirect to on successful payment.
   * @param cancelUrl - The URL to redirect to on cancelled payment.
   * @returns The Stripe Checkout Session object.
   */
  async createCheckoutSession(
    supplierId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    this.logger.log(`Creating Stripe checkout session for supplier ${supplierId} with price ${priceId}`);
    try {
      const supplier = await this.supplierService.findOne(supplierId);
      if (!supplier) {
        this.logger.error(`Supplier with ID ${supplierId} not found.`);
        throw new Error(`Supplier with ID ${supplierId} not found.`);
      }

      // Use the new findOrCreateCustomer method
      const customer = await this.findOrCreateCustomer(supplier.contact_email, supplier.supplier_name, supplier.id);

      // Update local DB with stripe_customer_id if it's not already set or different.
      // This requires SupplierSubscription to be loaded with the supplier.
      // The SupplierService.findOne should fetch the subscription relation.
      if (supplier.subscription && supplier.subscription.stripe_customer_id !== customer.id) {
          // This line will require a new method in SupplierService, or direct repository access if allowed.
          // For now, this specific update logic will be handled by SupplierService.create or a dedicated method.
          // Consider this a placeholder for where SupplierService would ensure consistency.
          // await this.supplierService.updateStripeCustomerId(supplier.id, customer.id);
          this.logger.log(`Local supplier ${supplier.id} should be updated with Stripe customer ID ${customer.id} by SupplierService`);
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        customer: customer.id, // Use the ID from the retrieved/created customer
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          app_supplier_id: supplierId,
          stripe_price_id: priceId,
        },
      });
      this.logger.log(`Checkout session created: ${session.id} for supplier ${supplierId}`);
      return session;
    } catch (error) {
      this.logger.error(`Error creating checkout session for supplier ${supplierId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verifies and processes incoming Stripe webhook events.
   * @param payload - The raw request body from Stripe.
   * @param signature - The value of the 'Stripe-Signature' header.
   * @returns The processed Stripe event.
   */
  async handleWebhookEvent(payload: string | Buffer, signature: string): Promise<Stripe.Event> {
    this.logger.log('Received Stripe webhook event for detailed processing.');
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.error('Stripe webhook secret is not configured.');
      throw new Error('Stripe webhook secret is not configured.'); // Or a specific error type
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      this.logger.log(`Webhook event verified: ${event.id}, Type: ${event.type}`);
    } catch (error) {
      this.logger.error(`Error verifying webhook event: ${error.message}`, error.stack);
      // Consider re-throwing a specific error type if NestJS global exception filter handles it
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        this.logger.log(`Handling checkout.session.completed for session ID: ${session.id}`);
        if (session.payment_status === 'paid') {
          const appSupplierId = session.metadata?.app_supplier_id;
          const stripeSubscriptionId = session.subscription as string; // Subscription ID from the session
          const stripeCustomerId = session.customer as string; // Customer ID from the session
          const stripePriceId = session.metadata?.stripe_price_id;

          if (!appSupplierId || !stripeSubscriptionId || !stripeCustomerId || !stripePriceId) {
            this.logger.error('Checkout session completed event missing necessary metadata or IDs.', undefined, { sessionId: session.id, metadata: session.metadata });
            throw new Error('Missing critical information in checkout session event.');
          }

          // Retrieve subscription details to get the current period end
          const subscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

          this.logger.log(`Attempting to activate subscription for supplier ${appSupplierId} via checkout.session.completed.`);
          try {
            await this.supplierService.activateSubscription(
              appSupplierId,
              stripeSubscriptionId,
              stripePriceId,
              stripeCustomerId, // Pass stripeCustomerId
              currentPeriodEnd,
              'active' // Initial status
            );
            this.logger.log(`Successfully activated subscription for supplier ${appSupplierId} from session ${session.id}.`);
          } catch (error) {
            this.logger.error(`Failed to activate subscription for supplier ${appSupplierId} from session ${session.id}: ${error.message}`, error.stack);
            // Decide if this should throw and cause Stripe to retry, or if it's a non-retryable error.
            // For now, rethrow to leverage Stripe retries if it's a temporary issue.
            throw error;
          }
        } else {
          this.logger.log(`Checkout session ${session.id} completed but payment_status is ${session.payment_status}. No action taken.`);
        }
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        this.logger.log(`Handling invoice.payment_succeeded for invoice ID: ${invoice.id}`);
        if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
          const stripeSubscriptionId = invoice.subscription as string;
          // Retrieve the subscription to get the updated current_period_end
          const subscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
          const newSubscriptionEndDate = new Date(subscription.current_period_end * 1000);

          this.logger.log(`Attempting to update subscription payment details for Stripe subscription ${stripeSubscriptionId} from invoice ${invoice.id}.`);
          try {
            await this.supplierService.updateSubscriptionPaymentDetails(
              stripeSubscriptionId,
              newSubscriptionEndDate,
              'active' // Assuming payment success means it's active
            );
            this.logger.log(`Successfully updated subscription end date for ${stripeSubscriptionId} from invoice ${invoice.id}.`);
          } catch (error) {
            this.logger.error(`Failed to update subscription for ${stripeSubscriptionId} from invoice ${invoice.id}: ${error.message}`, error.stack);
            throw error; // Allow Stripe to retry
          }
        } else {
          this.logger.log(`Invoice ${invoice.id} payment succeeded but not for a subscription cycle or no subscription ID. Billing reason: ${invoice.billing_reason}. No action taken.`);
        }
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        this.logger.log(`Handling invoice.payment_failed for invoice ID: ${failedInvoice.id}`);
        if (failedInvoice.subscription) {
          const stripeSubscriptionId = failedInvoice.subscription as string;
          // Potentially update local status to 'past_due' or similar.
          // Stripe handles retries. You might want to take action after all retries fail (see customer.subscription.updated event for status changes).
          this.logger.warn(`Invoice payment failed for subscription ${stripeSubscriptionId}. Current Stripe status (from subscription object if fetched) should reflect this. Consider notifying supplier.`);
          // Example: Update status to 'past_due'
          // const subscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
          // await this.supplierService.updateSubscriptionPaymentDetails(stripeSubscriptionId, new Date(subscription.current_period_end * 1000), subscription.status as string);
        }
        break;

      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object as Stripe.Subscription;
        this.logger.log(`Handling customer.subscription.updated for Stripe subscription ID: ${updatedSubscription.id}`);
        const newStatus = updatedSubscription.status;
        const newPeriodEnd = new Date(updatedSubscription.current_period_end * 1000);
        const newPriceId = updatedSubscription.items.data.length > 0 ? updatedSubscription.items.data[0].price.id : null;

        // This event is crucial for catching various changes: plan changes, cancellations leading to 'canceled', payment failures leading to 'past_due' or 'unpaid'.
        try {
          const localSub = await this.supplierService.updateSubscriptionPaymentDetails( // This method might need more params or a more generic name
            updatedSubscription.id,
            newPeriodEnd,
            newStatus as string, // Stripe.Subscription.Status is an enum-like string
          );
          // If price changed, update it too
          if (localSub && newPriceId && localSub.stripe_price_id !== newPriceId) {
              localSub.stripe_price_id = newPriceId;
              // TODO: Ensure subscriptionRepository is accessible here or add a method in supplierService
              // await this.subscriptionRepository.save(localSub);
              // For now, this update is missed if `updateSubscriptionPaymentDetails` doesn't handle it.
              // The `supplierService.updateSubscriptionPaymentDetails` should ideally handle this.
              this.logger.log(`Stripe price ID for ${updatedSubscription.id} changed to ${newPriceId}. (Local update might be needed if not part of updateSubscriptionPaymentDetails)`);
          }
          this.logger.log(`Subscription ${updatedSubscription.id} status updated to ${newStatus}. End date: ${newPeriodEnd}.`);

          // If the subscription is now 'canceled' and was previously active, ensure local deactivation logic is robust
          if (newStatus === 'canceled' && event.previous_attributes && (event.previous_attributes as any).status !== 'canceled') {
               await this.supplierService.deactivateSubscription(updatedSubscription.id, 'canceled');
               this.logger.log(`Subscription ${updatedSubscription.id} was canceled via customer.subscription.updated event.`);
          }

        } catch (error) {
          this.logger.error(`Failed to update subscription ${updatedSubscription.id} from customer.subscription.updated event: ${error.message}`, error.stack);
          throw error;
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        this.logger.log(`Handling customer.subscription.deleted for Stripe subscription ID: ${deletedSubscription.id}`);
        try {
          await this.supplierService.deactivateSubscription(deletedSubscription.id, 'deleted'); // 'deleted' or 'canceled'
          this.logger.log(`Successfully deactivated subscription ${deletedSubscription.id} locally.`);
        } catch (error) {
          this.logger.error(`Failed to deactivate subscription ${deletedSubscription.id}: ${error.message}`, error.stack);
          throw error;
        }
        break;

      default:
        this.logger.log(`Unhandled webhook event type: ${event.type} (ID: ${event.id})`);
    }

    return event;
  }
}
