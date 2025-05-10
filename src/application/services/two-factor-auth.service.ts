import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../domain/entities';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwoFactorAuthService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async generateTwoFactorSecret(employeeId: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Generar código de 6 dígitos
    const code = this.generateSixDigitCode();

    // Almacenar código
    employee.two_factor_secret = code;
    await this.employeeRepository.save(employee);

    // Enviar email con el código
    await this.emailService.send2FASetupEmail(
      employee.email,
      employee.name,
      null,
      code,
    );

    return {
      message: 'Código de 6 dígitos enviado por correo electrónico',
    };
  }

  async enable2FA(employeeId: string, code: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee || !employee.two_factor_secret) {
      throw new BadRequestException('Configuración 2FA no iniciada');
    }

    if (code !== employee.two_factor_secret) {
      throw new BadRequestException('Código inválido');
    }

    employee.is_2fa_enabled = true;
    await this.employeeRepository.save(employee);

    return {
      message: '2FA activado exitosamente',
    };
  }

  async verify2FA(employeeId: string, code: string): Promise<boolean> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee || !employee.is_2fa_enabled || !employee.two_factor_secret) {
      throw new BadRequestException('2FA no está configurado');
    }

    return code === employee.two_factor_secret;
  }

  async disable2FA(employeeId: string, code: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee || !employee.is_2fa_enabled) {
      throw new BadRequestException('2FA no está activado');
    }

    if (code !== employee.two_factor_secret) {
      throw new BadRequestException('Código inválido');
    }

    employee.is_2fa_enabled = false;
    employee.two_factor_secret = null;
    await this.employeeRepository.save(employee);

    return {
      message: '2FA desactivado exitosamente',
    };
  }
} 
