import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeAuth } from '../../domain/entities';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import * as otplib from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorAuthService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(EmployeeAuth)
    private readonly employeeAuthRepository: Repository<EmployeeAuth>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
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
   * Inicia el proceso de configuración de autenticación de dos factores
   * @param employeeId ID del empleado
   * @param method Método de 2FA: 'totp' para app o 'email' para envío de código
   * @returns Datos de configuración según el método elegido
   */
  async generateTwoFactorSecret(employeeId: string, method: 'totp' | 'email' = 'totp') {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    if (method === 'email') {
      // Generar código de 6 dígitos y enviar por email (método antiguo)
      const code = this.generateSixDigitCode();
      employee.two_factor_secret = code;
      await this.employeeRepository.save(employee);
      
      await this.emailService.send2FASetupEmail(
        employee.email,
        employee.name,
        null,
        code,
      );

      return {
        method: 'email',
        message: 'Código de 6 dígitos enviado por correo electrónico',
      };
    } else {
      // Método TOTP con aplicación autenticadora
      const secret = this.generateTOTPSecret();
      employee.two_factor_secret = secret;
      employee.two_factor_method = 'totp';
      await this.employeeRepository.save(employee);
      
      // Generar URL y código QR para el autenticador
      const authenticatorUrl = this.generateAuthenticatorUrl(employee.email, secret);
      const qrCodeDataUrl = await QRCode.toDataURL(authenticatorUrl);
      
      return {
        method: 'totp',
        secret,
        qrCodeUrl: qrCodeDataUrl,
        message: 'Escanea el código QR con tu aplicación de autenticación',
        manualEntryCode: secret,
        authenticatorUrl,
      };
    }
  }

  /**
   * Habilita la autenticación de dos factores
   */
  async enable2FA(employeeId: string, code: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee || !employee.two_factor_secret) {
      throw new BadRequestException('Configuración 2FA no iniciada');
    }

    // Verificar el código según el método
    let isValid = false;
    if (employee.two_factor_method === 'totp') {
      isValid = otplib.authenticator.verify({
        token: code,
        secret: employee.two_factor_secret
      });
    } else {
      isValid = code === employee.two_factor_secret;
    }

    if (!isValid) {
      throw new BadRequestException('Código inválido');
    }

    employee.is_2fa_enabled = true;
    await this.employeeRepository.save(employee);

    return {
      message: '2FA activado exitosamente',
      method: employee.two_factor_method || 'email',
    };
  }

  /**
   * Verifica un código 2FA
   */
  async verify2FA(employeeId: string, code: string): Promise<boolean> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee || !employee.is_2fa_enabled || !employee.two_factor_secret) {
      throw new BadRequestException('2FA no está configurado');
    }

    // Verificar según el método configurado
    if (employee.two_factor_method === 'totp') {
      return otplib.authenticator.verify({
        token: code,
        secret: employee.two_factor_secret
      });
    } else {
      return code === employee.two_factor_secret;
    }
  }

  /**
   * Desactiva la autenticación de dos factores
   */
  async disable2FA(employeeId: string, code: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee || !employee.is_2fa_enabled) {
      throw new BadRequestException('2FA no está activado');
    }

    // Verificar según el método configurado
    let isValid = false;
    if (employee.two_factor_method === 'totp') {
      isValid = otplib.authenticator.verify({
        token: code,
        secret: employee.two_factor_secret
      });
    } else {
      isValid = code === employee.two_factor_secret;
    }

    if (!isValid) {
      throw new BadRequestException('Código inválido');
    }

    employee.is_2fa_enabled = false;
    employee.two_factor_secret = null;
    employee.two_factor_method = null;
    await this.employeeRepository.save(employee);

    return {
      message: '2FA desactivado exitosamente',
    };
  }

  /**
   * Genera un código de respaldo para casos de emergencia
   * @param employeeId ID del empleado
   * @returns Código de respaldo único
   */
  async generateBackupCode(employeeId: string): Promise<string> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['auth'],
    });

    if (!employee || !employee.is_2fa_enabled) {
      throw new BadRequestException('2FA no está activado');
    }

    // Generar un código de respaldo único de 10 caracteres
    const backupCode = Math.random().toString(36).substring(2, 12).toUpperCase();
    
    // Si no hay auth, crear uno
    if (!employee.auth) {
      employee.auth = new EmployeeAuth();
      employee.auth.employee_id = employee.id;
    }
    
    // Guardar el código de respaldo
    employee.auth.backup_codes = employee.auth.backup_codes || [];
    employee.auth.backup_codes.push({
      code: backupCode,
      created_at: new Date().toISOString(),
      used: false
    });
    
    await this.employeeAuthRepository.save(employee.auth);
    
    return backupCode;
  }
  
  /**
   * Verifica un código de respaldo y lo marca como usado
   * @param employeeId ID del empleado
   * @param code Código de respaldo
   * @returns true si es válido, false si no
   */
  async verifyBackupCode(employeeId: string, code: string): Promise<boolean> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['auth'],
    });

    if (!employee || !employee.is_2fa_enabled || !employee.auth || !employee.auth.backup_codes) {
      return false;
    }
    
    // Buscar el código de respaldo
    const backupCodeIndex = employee.auth.backup_codes.findIndex(
      bc => bc.code === code && !bc.used
    );
    
    if (backupCodeIndex === -1) {
      return false;
    }
    
    // Marcar como usado
    employee.auth.backup_codes[backupCodeIndex].used = true;
    employee.auth.backup_codes[backupCodeIndex].used_at = new Date().toISOString();
    
    await this.employeeAuthRepository.save(employee.auth);
    
    return true;
  }
} 
