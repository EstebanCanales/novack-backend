import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { Employee} from '../../domain/entities';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import * as otplib from 'otplib';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { IEmployeeRepository } from '../../domain/repositories/employee.repository.interface';
import { EmployeeCredentials } from '../../domain/entities/employee-credentials.entity';

@Injectable()
export class TwoFactorAuthService {
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @Inject('IEmployeeRepository')
    private readonly employeeRepository: IEmployeeRepository
  ) {}

  /**
   * Genera un código de 6 dígitos para las implementaciones
   * sin autenticación TOTP (legacy)
   */
  private generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Genera un secreto para TOTP seguro
   */
  private generateTOTPSecret(): string {
    return otplib.authenticator.generateSecret();
  }

  /**
   * Genera una URL de autenticación para aplicaciones como Google Authenticator
   * @param email Email del empleado
   * @param secret Secreto TOTP
   * @returns URL de autenticación
   */
  private generateAuthenticatorUrl(email: string, secret: string): string {
    const issuer = this.configService.get('APP_NAME', 'SPCEDES');
    return otplib.authenticator.keyuri(email, issuer, secret);
  }

  /**
   * Genera un secreto de autenticación de dos factores
   */
  async generateTwoFactorSecret(employeeId: string, method: 'totp' | 'email' = 'totp'): Promise<{ secret: string; qrCodeUrl: string }> {
    const employee = await this.employeeRepository.findById(employeeId);
    
    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    const secret = authenticator.generateSecret();
    
    // Generar URI para el QR
    const appName = 'SPCedes';
    const otpAuthUrl = authenticator.keyuri(employee.email, appName, secret);
    
    // Guardar el secreto (pero aún no activar 2FA)
    await this.employeeRepository.updateCredentials(employeeId, {
      two_factor_secret: secret
    });
    
    // Generar QR code como data URL
    const qrCodeUrl = await toDataURL(otpAuthUrl);
    
    return {
      secret,
      qrCodeUrl
    };
  }

  /**
   * Activa la autenticación de dos factores
   */
  async enableTwoFactor(employeeId: string, token: string): Promise<boolean> {
    const employee = await this.employeeRepository.findById(employeeId);
    
    if (!employee || !employee.credentials) {
      throw new BadRequestException('Empleado no encontrado');
    }
    
    if (!employee.credentials.two_factor_secret) {
      throw new BadRequestException('No hay secreto generado para 2FA');
    }
    
    // Verificar el token proporcionado
    const isValid = this.verifyToken(employee.credentials.two_factor_secret, token);
    
    if (!isValid) {
      throw new BadRequestException('Token inválido');
    }
    
    // Activar 2FA
    await this.employeeRepository.updateCredentials(employeeId, {
      two_factor_enabled: true
    });
    
    return true;
  }

  /**
   * Desactiva la autenticación de dos factores
   */
  async disableTwoFactor(employeeId: string, token: string): Promise<boolean> {
    const employee = await this.employeeRepository.findById(employeeId);
    
    if (!employee || !employee.credentials) {
      throw new BadRequestException('Empleado no encontrado');
    }
    
    if (!employee.credentials.two_factor_enabled) {
      throw new BadRequestException('La autenticación de dos factores no está activada');
    }
    
    // Verificar el token proporcionado
    const isValid = this.verifyToken(employee.credentials.two_factor_secret, token);
    
    if (!isValid) {
      throw new BadRequestException('Token inválido');
    }
    
    // Desactivar 2FA
    await this.employeeRepository.updateCredentials(employeeId, {
      two_factor_enabled: false,
      two_factor_secret: null
    });
    
    return true;
  }

  /**
   * Verifica un token TOTP
   */
  verifyToken(secret: string, token: string): boolean {
    return authenticator.verify({ token, secret });
  }

  /**
   * Valida el token 2FA durante el proceso de login
   */
  async validateTwoFactorToken(employeeId: string, token: string): Promise<boolean> {
    const employee = await this.employeeRepository.findById(employeeId);
    
    if (!employee || !employee.credentials) {
      throw new BadRequestException('Empleado no encontrado');
    }
    
    if (!employee.credentials.two_factor_enabled) {
      // Si 2FA no está habilitado, consideramos la validación exitosa
      return true;
    }
    
    if (!employee.credentials.two_factor_secret) {
      throw new BadRequestException('Configuración 2FA incompleta');
    }
    
    // Verificar el token proporcionado
    return this.verifyToken(employee.credentials.two_factor_secret, token);
  }

  /**
   * Genera un código de respaldo para casos de emergencia
   * @param employeeId ID del empleado
   * @returns Código de respaldo único
   */
  async generateBackupCode(employeeId: string): Promise<string> {
    const employee = await this.employeeRepository.findById(employeeId);
    
    if (!employee || !employee.credentials || !employee.credentials.two_factor_enabled) {
      throw new BadRequestException('2FA no está activado para este empleado');
    }

    // Generar un código de respaldo único de 10 caracteres
    const backupCode = Math.random().toString(36).substring(2, 12).toUpperCase();
    
    // Preparar el array de códigos de respaldo
    const backupCodes = employee.credentials.backup_codes || [];
    backupCodes.push({
      code: backupCode,
      created_at: new Date().toISOString(),
      used: false
    });
    
    // Guardar los códigos de respaldo
    await this.employeeRepository.updateCredentials(employee.id, {
      backup_codes: backupCodes
    });
    
    return backupCode;
  }
  
  /**
   * Verifica un código de respaldo y lo marca como usado
   * @param employeeId ID del empleado
   * @param code Código de respaldo
   * @returns true si es válido, false si no
   */
  async verifyBackupCode(employeeId: string, code: string): Promise<boolean> {
    const employee = await this.employeeRepository.findById(employeeId);
    
    if (!employee || !employee.credentials || !employee.credentials.two_factor_enabled || !employee.credentials.backup_codes) {
      return false;
    }
    
    // Buscar el código de respaldo
    const backupCodes = [...employee.credentials.backup_codes];
    const backupCodeIndex = backupCodes.findIndex(
      bc => bc.code === code && !bc.used
    );
    
    if (backupCodeIndex === -1) {
      return false;
    }
    
    // Marcar como usado
    backupCodes[backupCodeIndex].used = true;
    backupCodes[backupCodeIndex].used_at = new Date().toISOString();
    
    // Actualizar en la base de datos
    await this.employeeRepository.updateCredentials(employee.id, {
      backup_codes: backupCodes
    });
    
    return true;
  }

  /**
   * Activa la autenticación de dos factores
   * Alias para enableTwoFactor para mantener compatibilidad con el controlador
   */
  async enable2FA(employeeId: string, token: string): Promise<boolean> {
    return this.enableTwoFactor(employeeId, token);
  }

  /**
   * Desactiva la autenticación de dos factores
   * Alias para disableTwoFactor para mantener compatibilidad con el controlador
   */
  async disable2FA(employeeId: string, token: string): Promise<boolean> {
    return this.disableTwoFactor(employeeId, token);
  }

  /**
   * Verifica un token 2FA
   * Alias para validateTwoFactorToken para mantener compatibilidad con el controlador
   */
  async verify2FA(employeeId: string, token: string): Promise<boolean> {
    return this.validateTwoFactorToken(employeeId, token);
  }
} 
