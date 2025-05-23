import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { IEmployeeRepository } from '../../domain/repositories/employee.repository.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from './email.service';

@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject('IEmployeeRepository')
    private readonly employeeRepository: IEmployeeRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Genera un token de verificación de email
   */
  async generateVerificationToken(employeeId: string): Promise<string> {
    const employee = await this.employeeRepository.findById(employeeId);
    
    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    if (employee.credentials?.is_email_verified) {
      throw new BadRequestException('El email ya está verificado');
    }

    // Generar token único
    const verificationToken = uuidv4();
    
    // Establecer fecha de expiración (24 horas)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Guardar el token en las credenciales
    await this.employeeRepository.updateCredentials(employeeId, {
      verification_token: verificationToken,
      reset_token_expires: expiresAt
    });
    
    return verificationToken;
  }

  /**
   * Envía un email de verificación al empleado
   */
  async sendVerificationEmail(employeeId: string): Promise<boolean> {
    const employee = await this.employeeRepository.findById(employeeId);
    
    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    if (employee.credentials?.is_email_verified) {
      throw new BadRequestException('El email ya está verificado');
    }
    
    // Generar token
    const verificationToken = await this.generateVerificationToken(employeeId);
    
    // Construir URL de verificación
    const baseUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
    const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;
    
    // Enviar email
    await this.emailService.sendEmailVerification(
      employee.email,
      `${employee.first_name} ${employee.last_name}`,
      verificationUrl
    );
    
    return true;
  }
  
  /**
   * Reenvía un email de verificación al empleado
   */
  async resendVerificationEmail(employeeId: string): Promise<boolean> {
    const employee = await this.employeeRepository.findById(employeeId);
    
    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    if (employee.credentials?.is_email_verified) {
      throw new BadRequestException('El email ya está verificado');
    }
    
    // Limpiar token anterior si existe
    if (employee.credentials?.verification_token) {
      await this.employeeRepository.updateCredentials(employeeId, {
        verification_token: null,
        reset_token_expires: null
      });
    }
    
    // Generar nuevo token y enviar email
    return this.sendVerificationEmail(employeeId);
  }

  /**
   * Verifica un token de verificación de email
   */
  async verifyEmail(token: string): Promise<boolean> {
    const employee = await this.employeeRepository.findByVerificationToken(token);
    
    if (!employee || !employee.credentials) {
      throw new BadRequestException('Token inválido o expirado');
    }
    
    const now = new Date();
    if (employee.credentials.reset_token_expires && employee.credentials.reset_token_expires < now) {
      throw new BadRequestException('El token ha expirado');
    }
    
    // Actualizar estado de verificación
    await this.employeeRepository.updateCredentials(employee.id, {
      is_email_verified: true,
      verification_token: null,
      reset_token_expires: null
    });
    
    return true;
  }

  /**
   * Comprueba si un email está verificado
   */
  async isEmailVerified(employeeId: string): Promise<boolean> {
    const employee = await this.employeeRepository.findById(employeeId);
    
    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }
    
    return !!employee.credentials?.is_email_verified;
  }
} 
