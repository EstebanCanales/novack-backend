import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { Supplier } from '../../domain/entities/supplier.entity';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly adminEmail: string = 'jack.bright.director@gmail.com';
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
  }

  async sendSupplierCreationEmail(
    supplier: Supplier,
    email: string,
    temporalPassword: string,
  ) {
    try {
      // Verificar que el proveedor tenga una suscripción
      if (!supplier.subscription) {
        throw new BadRequestException('El proveedor no tiene información de suscripción');
      }

      const emailContent = `
        <h1>Bienvenido a SP Cedes</h1>
        <p>Estimado/a ${supplier.supplier_name},</p>
        
        <p>Su cuenta ha sido creada exitosamente. A continuación, se detallan sus credenciales de acceso:</p>
        
        <ul>
          <li>Email: ${email}</li>
          <li>Contraseña temporal: ${temporalPassword}</li>
        </ul>
        
        <p>Por favor, inicie sesión y cambie su contraseña lo antes posible.</p>
        
        <h2>Detalles de su suscripción:</h2>
        <ul>
          <li>Suscripción general: ${supplier.subscription.is_subscribed ? 'Activa' : 'Inactiva'}</li>
          <li>Tarjetas: ${supplier.subscription.has_card_subscription ? 'Activa' : 'Inactiva'}</li>
          <li>Sensores: ${supplier.subscription.has_sensor_subscription ? 'Activa' : 'Inactiva'}</li>
        </ul>
        <p><strong>Tarjetas asignadas:</strong> ${supplier.subscription.max_card_count}</p>
        <p><strong>Empleados permitidos:</strong> ${supplier.subscription.max_employee_count}</p>
        
        <p>Si tiene alguna pregunta o necesita asistencia, no dude en contactar a nuestro equipo de soporte.</p>
        
        <p>Atentamente,<br>
        El equipo de SP Cedes</p>
      `;

      const result = await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: [email],
        subject: 'Bienvenido a SP Cedes - Credenciales de acceso',
        html: emailContent,
      });

      return result;
    } catch (error) {
      this.logger.error(`Error al enviar email de creación: ${error.message}`);
      throw new BadRequestException(`Error al enviar email: ${error.message}`);
    }
  }

  async sendSupplierUpdateEmail(
    supplier: Supplier,
    changes: string,
  ) {
    try {
      // Verificar que el proveedor tenga una suscripción
      if (!supplier.subscription) {
        throw new BadRequestException('El proveedor no tiene información de suscripción');
      }

      const emailContent = `
        <h1>Actualización de Cuenta SP Cedes</h1>
        <p>Estimado/a ${supplier.supplier_name},</p>
        
        <p>Su cuenta ha sido actualizada. A continuación, se detallan los cambios realizados:</p>
        
        <p>${changes}</p>
        
        <h2>Estado actual de su suscripción:</h2>
        <ul>
          <li>Suscripción general: ${supplier.subscription.is_subscribed ? 'Activa' : 'Inactiva'}</li>
          <li>Tarjetas: ${supplier.subscription.has_card_subscription ? 'Activa' : 'Inactiva'}</li>
          <li>Sensores: ${supplier.subscription.has_sensor_subscription ? 'Activa' : 'Inactiva'}</li>
        </ul>
        <p><strong>Tarjetas asignadas:</strong> ${supplier.subscription.max_card_count}</p>
        <p><strong>Empleados permitidos:</strong> ${supplier.subscription.max_employee_count}</p>
        
        <p>Si usted no solicitó estos cambios o tiene alguna pregunta, póngase en contacto con nuestro equipo de soporte inmediatamente.</p>
        
        <p>Atentamente,<br>
        El equipo de SP Cedes</p>
      `;

      const result = await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: [supplier.contact_email],
        subject: 'SP Cedes - Actualización de su cuenta',
        html: emailContent,
      });

      return result;
    } catch (error) {
      this.logger.error(`Error al enviar email de actualización: ${error.message}`);
      throw new BadRequestException(`Error al enviar email: ${error.message}`);
    }
  }

  async sendVisitorWelcomeEmail(
    to: string,
    visitorName: string,
    appointmentDate: Date,
    location: string,
    qrCodeUrl?: string,
  ) {
    const { data, error } = await this.resend.emails.send({
      from: 'SP-CEDES <no-reply@spcedes.com>',
      to: [to],
      subject: '¡Bienvenido a SP-CEDES!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">¡Bienvenido a SP-CEDES, ${visitorName}!</h1>
          
          <p>Tu visita ha sido programada para el ${appointmentDate.toLocaleDateString(
            'es-PE',
            {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            },
          )}.</p>
          
          <p>Ubicación de tu visita: <strong>${location}</strong></p>
          
          ${
            qrCodeUrl
              ? `
            <div style="text-align: center; margin: 20px 0;">
              <p>Tu código QR para acceso:</p>
              <img src="${qrCodeUrl}" alt="Código QR" style="max-width: 200px;"/>
            </div>
          `
              : ''
          }
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Recordatorios importantes:</h3>
            <ul style="padding-left: 20px;">
              <li>Llega 10 minutos antes de tu cita</li>
              <li>Trae un documento de identificación válido</li>
              <li>Sigue los protocolos de seguridad del edificio</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 0.9em;">
            Si tienes alguna pregunta o necesitas reprogramar tu visita, por favor contáctanos.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 0.8em;">
            © ${new Date().getFullYear()} SP-CEDES. Todos los derechos reservados.
          </div>
        </div>
      `,
    });

    if (error) {
      throw new Error(`Error al enviar email: ${error.message}`);
    }

    return data;
  }

  async sendVisitorCheckoutEmail(
    to: string,
    visitorName: string,
    checkInTime: Date,
    checkOutTime: Date,
    location: string,
  ) {
    const { data, error } = await this.resend.emails.send({
      from: 'SP-CEDES <no-reply@spcedes.com>',
      to: [to],
      subject: 'Resumen de tu visita a SP-CEDES',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Gracias por tu visita, ${visitorName}</h1>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Detalles de tu visita:</h3>
            <p><strong>Entrada:</strong> ${checkInTime.toLocaleDateString(
              'es-PE',
              {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              },
            )}</p>
            <p><strong>Salida:</strong> ${checkOutTime.toLocaleDateString(
              'es-PE',
              {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              },
            )}</p>
            <p><strong>Ubicación:</strong> ${location}</p>
          </div>
          
          <p style="color: #666;">
            Esperamos que tu visita haya sido satisfactoria. Si tienes algún comentario o sugerencia,
            no dudes en contactarnos.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 0.8em;">
            © ${new Date().getFullYear()} SP-CEDES. Todos los derechos reservados.
          </div>
        </div>
      `,
    });

    if (error) {
      throw new Error(`Error al enviar email: ${error.message}`);
    }

    return data;
  }

  async send2FASetupEmail(
    to: string,
    employeeName: string,
    qrCodeUrl: string | null,
    code: string,
  ) {
    const { data, error } = await this.resend.emails.send({
      from: 'SP-CEDES <no-reply@spcedes.com>',
      to: [to],
      subject: 'Configuración de Autenticación de Dos Factores',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Configuración de 2FA</h1>
          
          <p>Hola ${employeeName},</p>
          
          <p>Has solicitado activar la autenticación de dos factores (2FA) para tu cuenta.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
            <p style="font-size: 1.2em; margin-bottom: 10px;">Tu código de verificación es:</p>
            <code style="font-size: 2em; color: #007bff;">${code}</code>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #856404; margin: 0;">
              <strong>⚠️ Importante:</strong> Mantén este código seguro y no lo compartas con nadie.
            </p>
          </div>
          
          <p style="color: #666;">
            Si no solicitaste esta configuración, por favor contacta inmediatamente con soporte técnico.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 0.8em;">
            © ${new Date().getFullYear()} SP-CEDES. Todos los derechos reservados.
          </div>
        </div>
      `,
    });

    if (error) {
      throw new Error(`Error al enviar email: ${error.message}`);
    }

    return data;
  }

  async sendEmailVerification(
    to: string,
    employeeName: string,
    verificationToken: string,
  ) {
    console.log('Enviando email de verificación:', {
      to,
      employeeName,
      verificationToken,
    });

    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    console.log('Frontend URL:', baseUrl);
    const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;
    console.log('Verification URL:', verificationUrl);

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'SP-CEDES <no-reply@spcedes.com>',
        to: [to],
        subject: 'Verifica tu correo electrónico - SP-CEDES',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Verifica tu correo electrónico</h1>
            
            <p>Hola ${employeeName},</p>
            
            <p>Gracias por registrarte en SP-CEDES. Para completar tu registro, por favor verifica tu dirección de correo electrónico:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                Verificar correo electrónico
              </a>
            </div>
            
            <p style="color: #666;">
              Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; word-break: break-all;">
              <a href="${verificationUrl}" style="color: #007bff;">${verificationUrl}</a>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #856404; margin: 0;">
                <strong>⚠️ Importante:</strong> Este enlace expirará en 24 horas por razones de seguridad.
              </p>
            </div>
            
            <p style="color: #666;">
              Si no solicitaste esta verificación, puedes ignorar este correo.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 0.8em;">
              © ${new Date().getFullYear()} SP-CEDES. Todos los derechos reservados.
            </div>
          </div>
        `,
      });

      console.log('Respuesta de Resend:', { data, error });

      if (error) {
        console.error('Error al enviar email de verificación:', error);
        throw new Error(
          `Error al enviar email de verificación: ${error.message}`,
        );
      }

      return data;
    } catch (error) {
      console.error('Error al enviar email de verificación:', error);
      throw error;
    }
  }

  async sendEmailVerificationSuccess(to: string, employeeName: string) {
    const { data, error } = await this.resend.emails.send({
      from: 'SP-CEDES <no-reply@spcedes.com>',
      to: [to],
      subject: '¡Correo electrónico verificado exitosamente! - SP-CEDES',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">¡Correo verificado exitosamente!</h1>
          
          <p>Hola ${employeeName},</p>
          
          <p>Tu dirección de correo electrónico ha sido verificada exitosamente. Ahora puedes acceder a todas las funcionalidades de SP-CEDES.</p>
          
          <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #155724; margin: 0;">
              <strong>✅ Cuenta verificada:</strong> Ya puedes iniciar sesión y utilizar todas las funciones de la plataforma.
            </p>
          </div>
          
          <p style="color: #666;">
            Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 0.8em;">
            © ${new Date().getFullYear()} SP-CEDES. Todos los derechos reservados.
          </div>
        </div>
      `,
    });

    if (error) {
      throw new Error(
        `Error al enviar email de verificación exitosa: ${error.message}`,
      );
    }

    return data;
  }
}

