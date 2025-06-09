import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common'; // Logger removed, InternalServerErrorException added
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { Supplier } from '../../domain/entities/supplier.entity';
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service'; // Added import
import * as fs from 'fs/promises'; // For reading template files
import * as path from 'path'; // For path manipulation

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly adminEmail: string = 'jack.bright.director@gmail.com'; // This might become a configurable "from" address or removed
  // private readonly logger = new Logger(EmailService.name); // Replaced

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLoggerService, // Injected StructuredLoggerService
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.error('RESEND_API_KEY is not configured.');
      // Potentially throw an error here or ensure Resend handles null/undefined apiKey gracefully
    }
    this.resend = new Resend(apiKey);
    this.logger.setContext('EmailService'); // Set context
  }

  private async getEmailHtml(templateName: string, data: Record<string, any>): Promise<string> {
    try {
      const templatePath = path.join(__dirname, '..', '..', 'templates', 'email', `${templateName}.html`);
      // __dirname is 'src/application/services' when running, so '..' '..' gets to 'src/'
      // For a more robust path, consider process.cwd() + '/src/templates/email/...' if __dirname is unreliable
      // const templatePath = path.resolve(process.cwd(), 'src', 'templates', 'email', `${templateName}.html`);

      let html = await fs.readFile(templatePath, 'utf-8');
      for (const key in data) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, String(data[key])); // Ensure data[key] is stringified
      }
      return html;
    } catch (error) {
      this.logger.error(`Failed to read or process email template: ${templateName}`, { error: error.message, templateName });
      // Depending on policy, could throw or return a fallback/error HTML
      throw new InternalServerErrorException(`Could not load email template: ${templateName}`);
    }
  }

  async sendSupplierCreationEmail(
    supplier: Supplier,
    email: string,
    temporalPassword: string,
  ) {
    const templateName = 'supplier-creation';
    try {
      if (!supplier.subscription) {
        // This is a business logic validation, BadRequestException might still be appropriate here
        this.logger.warn('Supplier creation email attempted for supplier without subscription info', { supplierId: supplier.id });
        throw new BadRequestException('El proveedor no tiene información de suscripción para el email.');
      }

      const html = await this.getEmailHtml(templateName, {
        supplierName: supplier.supplier_name,
        email: email,
        temporalPassword: temporalPassword,
        subscriptionGeneral: supplier.subscription.is_subscribed ? 'Activa' : 'Inactiva',
        subscriptionCards: supplier.subscription.has_card_subscription ? 'Activa' : 'Inactiva',
        subscriptionSensors: supplier.subscription.has_sensor_subscription ? 'Activa' : 'Inactiva',
        maxCardCount: supplier.subscription.max_card_count,
        maxEmployeeCount: supplier.subscription.max_employee_count,
        year: new Date().getFullYear(),
      });

      const fromAddress = this.configService.get<string>('EMAIL_FROM_ONBOARDING', 'onboarding@resend.dev');

      const { data, error } = await this.resend.emails.send({
        from: fromAddress,
        to: [email],
        subject: 'Bienvenido a SP Cedes - Credenciales de acceso',
        html: html,
      });

      if (error) {
        this.logger.error('Failed to send supplier creation email', { error: error.message, to: email, supplierId: supplier.id });
        throw new InternalServerErrorException(`Failed to send email: ${error.message}`);
      }

      this.logger.log('Supplier creation email sent successfully', { to: email, supplierId: supplier.id });
      return data;

    } catch (e) {
      // Catch errors from getEmailHtml or other synchronous parts, or re-thrown errors
      this.logger.error(`Error in sendSupplierCreationEmail process for template ${templateName}`, { error: e.message, to: email, supplierId: supplier.id });
      if (e instanceof BadRequestException || e instanceof InternalServerErrorException) {
        throw e; // Re-throw if it's already one of our handled types
      }
      throw new InternalServerErrorException(e.message || 'An unexpected error occurred while sending supplier creation email.');
    }
  }

  async sendSupplierUpdateEmail(
    supplier: Supplier,
    changes: string, // This 'changes' string might need to be HTML-formatted if it contains complex structures
  ) {
    const templateName = 'supplier-update';
    try {
      if (!supplier.subscription) {
        this.logger.warn('Supplier update email attempted for supplier without subscription info', { supplierId: supplier.id });
        throw new BadRequestException('El proveedor no tiene información de suscripción para el email.');
      }

      const html = await this.getEmailHtml(templateName, {
        supplierName: supplier.supplier_name,
        changes: changes, // Ensure 'changes' is safe HTML or properly escaped if it comes from user input.
        subscriptionGeneral: supplier.subscription.is_subscribed ? 'Activa' : 'Inactiva',
        subscriptionCards: supplier.subscription.has_card_subscription ? 'Activa' : 'Inactiva',
        subscriptionSensors: supplier.subscription.has_sensor_subscription ? 'Activa' : 'Inactiva',
        maxCardCount: supplier.subscription.max_card_count,
        maxEmployeeCount: supplier.subscription.max_employee_count,
        year: new Date().getFullYear(),
      });

      const fromAddress = this.configService.get<string>('EMAIL_FROM_INFO', 'info@resend.dev'); // Example 'from'

      const { data, error } = await this.resend.emails.send({
        from: fromAddress,
        to: [supplier.contact_email],
        subject: 'SP Cedes - Actualización de su cuenta',
        html: html,
      });

      if (error) {
        this.logger.error('Failed to send supplier update email', { error: error.message, to: supplier.contact_email, supplierId: supplier.id });
        throw new InternalServerErrorException(`Failed to send email: ${error.message}`);
      }

      this.logger.log('Supplier update email sent successfully', { to: supplier.contact_email, supplierId: supplier.id });
      return data;

    } catch (e) {
      this.logger.error(`Error in sendSupplierUpdateEmail process for template ${templateName}`, { error: e.message, to: supplier.contact_email, supplierId: supplier.id });
      if (e instanceof BadRequestException || e instanceof InternalServerErrorException) {
        throw e;
      }
      throw new InternalServerErrorException(e.message || 'An unexpected error occurred while sending supplier update email.');
    }
  }

  async sendVisitorWelcomeEmail(
    to: string,
    visitorName: string,
    appointmentDate: Date,
    location: string,
    qrCodeUrl?: string,
  ) {
    const templateName = 'visitor-welcome';
    try {
      const appointmentDateString = appointmentDate.toLocaleDateString('es-PE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      let qrCodeBlock = '';
      if (qrCodeUrl) {
        qrCodeBlock = `
          <div style="text-align: center; margin: 20px 0;">
            <p>Tu código QR para acceso:</p>
            <img src="${qrCodeUrl}" alt="Código QR" style="max-width: 200px; border: 1px solid #eee; padding: 5px;"/>
          </div>`;
      }

      const html = await this.getEmailHtml(templateName, {
        visitorName,
        appointmentDateString,
        location,
        qrCodeBlock, // Pass the pre-rendered HTML block or an empty string
        year: new Date().getFullYear(),
      });

      const fromAddress = this.configService.get<string>('EMAIL_FROM_NOREPLY', 'no-reply@spcedes.com');

      const { data, error } = await this.resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: '¡Bienvenido a SP-CEDES!',
        html,
      });

      if (error) {
        this.logger.error('Failed to send visitor welcome email', { error: error.message, to });
        throw new InternalServerErrorException(`Failed to send email: ${error.message}`);
      }
      this.logger.log('Visitor welcome email sent successfully', { to });
      return data;

    } catch (e) {
      this.logger.error(`Error in sendVisitorWelcomeEmail process for template ${templateName}`, { error: e.message, to });
      if (e instanceof InternalServerErrorException) {
        throw e;
      }
      throw new InternalServerErrorException(e.message || 'An unexpected error occurred while sending visitor welcome email.');
    }
  }

  async sendVisitorCheckoutEmail(
    to: string,
    visitorName: string,
    checkInTime: Date,
    checkOutTime: Date,
    location: string,
  ) {
    const templateName = 'visitor-checkout';
    try {
      const dateFormatOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      };
      const checkInDateString = checkInTime.toLocaleDateString('es-PE', dateFormatOptions);
      const checkOutDateString = checkOutTime.toLocaleDateString('es-PE', dateFormatOptions);

      const html = await this.getEmailHtml(templateName, {
        visitorName,
        checkInDateString,
        checkOutDateString,
        location,
        year: new Date().getFullYear(),
      });

      const fromAddress = this.configService.get<string>('EMAIL_FROM_NOREPLY', 'no-reply@spcedes.com');

      const { data, error } = await this.resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: 'Resumen de tu visita a SP-CEDES',
        html,
      });

      if (error) {
        this.logger.error('Failed to send visitor checkout email', { error: error.message, to });
        throw new InternalServerErrorException(`Failed to send email: ${error.message}`);
      }
      this.logger.log('Visitor checkout email sent successfully', { to });
      return data;

    } catch (e) {
      this.logger.error(`Error in sendVisitorCheckoutEmail process for template ${templateName}`, { error: e.message, to });
      if (e instanceof InternalServerErrorException) {
        throw e;
      }
      throw new InternalServerErrorException(e.message || 'An unexpected error occurred while sending visitor checkout email.');
    }
  }

  async send2FASetupEmail(
    to: string,
    employeeName: string,
    qrCodeUrl: string | null, // qrCodeUrl is not used in the new template, but kept for signature compatibility
    code: string,
  ) {
    const templateName = '2fa-setup';
    try {
      const html = await this.getEmailHtml(templateName, {
        employeeName,
        verificationCode: code,
        year: new Date().getFullYear(),
      });

      const fromAddress = this.configService.get<string>('EMAIL_FROM_SECURITY', 'security@spcedes.com');

      const { data, error } = await this.resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: 'Configuración de Autenticación de Dos Factores - SP-CEDES',
        html,
      });

      if (error) {
        this.logger.error('Failed to send 2FA setup email', { error: error.message, to });
        throw new InternalServerErrorException(`Failed to send email: ${error.message}`);
      }
      this.logger.log('2FA setup email sent successfully', { to });
      return data;

    } catch (e) {
      this.logger.error(`Error in send2FASetupEmail process for template ${templateName}`, { error: e.message, to });
      if (e instanceof InternalServerErrorException) {
        throw e;
      }
      throw new InternalServerErrorException(e.message || 'An unexpected error occurred while sending 2FA setup email.');
    }
  }

  async sendEmailVerification(
    to: string,
    employeeName: string,
    verificationToken: string,
  ) {
    const templateName = 'email-verification';
    this.logger.log('Attempting to send email verification', { to, employeeName });

    const baseUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;

    try {
      const html = await this.getEmailHtml(templateName, {
        employeeName,
        verificationUrl,
        year: new Date().getFullYear(),
      });

      const fromAddress = this.configService.get<string>('EMAIL_FROM_VERIFICATION', 'verify@spcedes.com');

      const { data, error } = await this.resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: 'Verifica tu correo electrónico - SP-CEDES',
        html,
      });

      if (error) {
        this.logger.error('Failed to send email verification', { error: error.message, to, verificationToken });
        throw new InternalServerErrorException(`Failed to send email: ${error.message}`);
      }

      this.logger.log('Email verification sent successfully', { to, verificationToken });
      return data;

    } catch (e) {
      this.logger.error(`Error in sendEmailVerification process for template ${templateName}`, { error: e.message, to, verificationToken });
      if (e instanceof InternalServerErrorException) {
        throw e;
      }
      throw new InternalServerErrorException(e.message || 'An unexpected error occurred while sending email verification.');
    }
  }

  async sendEmailVerificationSuccess(to: string, employeeName: string) {
    const templateName = 'email-verification-success';
    this.logger.log('Attempting to send email verification success notification', { to, employeeName });

    try {
      const html = await this.getEmailHtml(templateName, {
        employeeName,
        year: new Date().getFullYear(),
        // loginUrl: this.configService.get<string>('FRONTEND_URL_LOGIN', 'http://localhost:3000/login') // Optional placeholder
      });

      const fromAddress = this.configService.get<string>('EMAIL_FROM_NOREPLY', 'no-reply@spcedes.com');

      const { data, error } = await this.resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: '¡Correo electrónico verificado exitosamente! - SP-CEDES',
        html,
      });

      if (error) {
        this.logger.error('Failed to send email verification success notification', { error: error.message, to });
        throw new InternalServerErrorException(`Failed to send email: ${error.message}`);
      }

      this.logger.log('Email verification success notification sent successfully', { to });
      return data;

    } catch (e) {
      this.logger.error(`Error in sendEmailVerificationSuccess process for template ${templateName}`, { error: e.message, to });
      if (e instanceof InternalServerErrorException) {
        throw e;
      }
      throw new InternalServerErrorException(e.message || 'An unexpected error occurred while sending email verification success notification.');
    }
  }
}

