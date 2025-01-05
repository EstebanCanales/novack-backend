import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Employee } from '../../domain/entities';
import { EmailService } from './email.service';

@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly emailService: EmailService,
  ) {}

  async sendVerificationEmail(employeeId: string) {
    console.log('Iniciando envío de email de verificación para empleado:', employeeId);

    try {
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
      });

      console.log('Empleado encontrado:', employee);

      if (!employee) {
        throw new NotFoundException('Empleado no encontrado');
      }

      if (employee.is_email_verified) {
        throw new BadRequestException('El correo ya está verificado');
      }

      // Generar token y establecer expiración
      const verificationToken = uuidv4();
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24); // Expira en 24 horas

      console.log('Token generado:', {
        verificationToken,
        expirationDate,
      });

      // Guardar token y fecha de expiración
      employee.email_verification_token = verificationToken;
      employee.email_verification_expires = expirationDate;
      await this.employeeRepository.save(employee);

      console.log('Token guardado en la base de datos');

      // Enviar email de verificación
      await this.emailService.sendEmailVerification(
        employee.email,
        employee.name,
        verificationToken,
      );

      console.log('Email de verificación enviado exitosamente');

      return {
        message: 'Email de verificación enviado exitosamente',
      };
    } catch (error) {
      console.error('Error al enviar email de verificación:', error);
      throw error;
    }
  }

  async verifyEmail(token: string) {
    const employee = await this.employeeRepository.findOne({
      where: { email_verification_token: token },
    });

    if (!employee) {
      throw new BadRequestException('Token de verificación inválido');
    }

    if (employee.is_email_verified) {
      throw new BadRequestException('El correo ya está verificado');
    }

    if (!employee.email_verification_expires || new Date() > employee.email_verification_expires) {
      throw new BadRequestException('El token de verificación ha expirado');
    }

    // Marcar como verificado y limpiar campos de verificación
    employee.is_email_verified = true;
    employee.email_verification_token = null;
    employee.email_verification_expires = null;
    await this.employeeRepository.save(employee);

    // Enviar email de confirmación
    await this.emailService.sendEmailVerificationSuccess(
      employee.email,
      employee.name,
    );

    return {
      message: 'Correo electrónico verificado exitosamente',
    };
  }

  async resendVerificationEmail(employeeId: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    if (employee.is_email_verified) {
      throw new BadRequestException('El correo ya está verificado');
    }

    // Verificar si ha pasado al menos 5 minutos desde el último envío
    if (
      employee.email_verification_expires &&
      new Date(employee.email_verification_expires).getTime() - 24 * 60 * 60 * 1000 + 5 * 60 * 1000 > new Date().getTime()
    ) {
      throw new BadRequestException('Debes esperar 5 minutos antes de solicitar un nuevo código');
    }

    return this.sendVerificationEmail(employeeId);
  }
} 