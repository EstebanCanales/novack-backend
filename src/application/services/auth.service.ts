import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Employee } from '../../domain/entities';
import { EmployeeCredentials } from '../../domain/entities/employee-credentials.entity';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { IEmployeeRepository } from '../../domain/repositories/employee.repository.interface';

@Injectable()
export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = 10;
  private readonly LOCK_TIME_MINUTES = 15;

  constructor(
    @Inject('IEmployeeRepository')
    private readonly employeeRepository: IEmployeeRepository,
    private readonly jwtService: JwtService
  ) {}

  async login(email: string, password: string, req: Request) {
    // Buscar empleado por correo
    const employee = await this.employeeRepository.findByEmail(email);
    
    if (!employee || !employee.credentials) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(
      password,
      employee.credentials.password_hash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar si el correo está verificado
    if (!employee.credentials.is_email_verified) {
      throw new UnauthorizedException('El correo electrónico no ha sido verificado');
    }

    // Actualizar último login
    await this.employeeRepository.updateCredentials(employee.id, {
      last_login: new Date()
    });

    // Generar token
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

  async refreshToken(refreshToken: string, req: Request) {
    // En una implementación real, verificaríamos el refresh token contra una base de datos
    // y generaríamos un nuevo access token
    throw new UnauthorizedException('Función no implementada');
  }

  async logout(refreshToken: string) {
    // En una implementación real, invalidaríamos el refresh token
    return true;
  }
}
