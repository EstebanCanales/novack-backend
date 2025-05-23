/**
 * Caso de uso: Autenticar empleado
 * 
 * Implementa la lógica de autenticación de empleados usando sus credenciales.
 */

import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IEmployeeRepository } from '../../../domain/repositories/employee.repository.interface';
import { Employee } from '../../../domain/entities';

export interface AuthenticateEmployeeDto {
  email: string;
  password: string;
}

export interface AuthenticationResult {
  access_token: string;
  employee: Employee;
}

@Injectable()
export class AuthenticateEmployeeUseCase {
  constructor(
    @Inject('IEmployeeRepository')
    private readonly employeeRepository: IEmployeeRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(credentials: AuthenticateEmployeeDto): Promise<AuthenticationResult> {
    // Buscar empleado por email
    const employee = await this.employeeRepository.findByEmail(credentials.email);
    
    if (!employee || !employee.credentials) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      employee.credentials.password_hash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar si el email está verificado
    if (!employee.credentials.is_email_verified) {
      throw new UnauthorizedException('El email no ha sido verificado');
    }

    // Actualizar último login
    await this.employeeRepository.updateCredentials(employee.id, {
      last_login: new Date()
    });

    // Generar token JWT
    const payload = { 
      sub: employee.id,
      email: employee.email,
      supplier_id: employee.supplier_id
    };

    return {
      access_token: this.jwtService.sign(payload),
      employee
    };
  }
} 