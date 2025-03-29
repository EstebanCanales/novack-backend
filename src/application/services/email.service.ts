import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { Supplier } from '../../domain/entities/supplier.entity';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly adminEmail: string = 'jack.bright.director@gmail.com';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
  }

  async sendSupplierCreationEmail(
    supplier: Supplier,
    creatorEmail: string,
    creatorPassword: string,
  ) {
    try {
      // Email para el creador del proveedor
      const creatorEmailResult = await this.resend.emails.send({
        from: 'SP-CEDES <onboarding@resend.dev>',
        to: [creatorEmail],
        subject: 'Bienvenido a SP-CEDES - Información de tu cuenta',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">¡Bienvenido a SP-CEDES!</h1>
            
            <p>Hola ${supplier.supplier_creator},</p>
            
            <p>Tu cuenta de proveedor ha sido creada exitosamente. A continuación, encontrarás los detalles de acceso:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Credenciales de acceso:</h3>
              <p><strong>Email:</strong> ${creatorEmail}</p>
              <p><strong>Contraseña temporal:</strong> ${creatorPassword}</p>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #856404; margin: 0;">
                <strong>⚠️ Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña en tu primer inicio de sesión.
              </p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Información del proveedor:</h3>
              <p><strong>Nombre:</strong> ${supplier.supplier_name}</p>
              <p><strong>Email de contacto:</strong> ${supplier.contact_email}</p>
              <p><strong>Teléfono:</strong> ${supplier.phone_number}</p>
              <p><strong>Dirección:</strong> ${supplier.address}</p>
              <p><strong>Descripción:</strong> ${supplier.description}</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Suscripciones activas:</h3>
              <ul style="padding-left: 20px;">
                <li>Suscripción general: ${supplier.is_subscribed ? 'Activa' : 'Inactiva'}</li>
                <li>Tarjetas: ${supplier.has_card_subscription ? 'Activa' : 'Inactiva'}</li>
                <li>Sensores: ${supplier.has_sensor_subscription ? 'Activa' : 'Inactiva'}</li>
              </ul>
              <p><strong>Tarjetas asignadas:</strong> ${supplier.card_count}</p>
              <p><strong>Empleados permitidos:</strong> ${supplier.employee_count}</p>
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

      console.log('Email enviado al creador exitosamente:', creatorEmailResult);

      // Email para el administrador
      const adminEmailResult = await this.resend.emails.send({
        from: 'SP-CEDES <onboarding@resend.dev>',
        to: [this.adminEmail],
        subject: `Nuevo proveedor registrado: ${supplier.supplier_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Nuevo proveedor registrado</h1>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Información del proveedor:</h3>
              <p><strong>Nombre:</strong> ${supplier.supplier_name}</p>
              <p><strong>Creador:</strong> ${supplier.supplier_creator}</p>
              <p><strong>Email del creador:</strong> ${creatorEmail}</p>
              <p><strong>Email de contacto:</strong> ${supplier.contact_email}</p>
              <p><strong>Teléfono:</strong> ${supplier.phone_number}</p>
              <p><strong>Dirección:</strong> ${supplier.address}</p>
              <p><strong>Descripción:</strong> ${supplier.description}</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Detalles de suscripción:</h3>
              <ul style="padding-left: 20px;">
                <li>Suscripción general: ${supplier.is_subscribed ? 'Activa' : 'Inactiva'}</li>
                <li>Tarjetas: ${supplier.has_card_subscription ? 'Activa' : 'Inactiva'}</li>
                <li>Sensores: ${supplier.has_sensor_subscription ? 'Activa' : 'Inactiva'}</li>
              </ul>
              <p><strong>Tarjetas asignadas:</strong> ${supplier.card_count}</p>
              <p><strong>Empleados permitidos:</strong> ${supplier.employee_count}</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 0.8em;">
              © ${new Date().getFullYear()} SP-CEDES. Todos los derechos reservados.
            </div>
          </div>
        `,
      });

      console.log(
        'Email enviado al administrador exitosamente:',
        adminEmailResult,
      );

      return { creatorEmailResult, adminEmailResult };
    } catch (error) {
      console.error('Error al enviar los emails:', error);
      throw error;
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

