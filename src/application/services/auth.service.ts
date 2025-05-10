import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmployeeService } from './employee.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeAuth } from '../../domain/entities';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = 10;
  private readonly LOCK_TIME_MINUTES = 15;

  constructor(
    private readonly employeeService: EmployeeService,
    private readonly jwtService: JwtService,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(EmployeeAuth)
    private readonly employeeAuthRepository: Repository<EmployeeAuth>,
  ) {}

  async validateEmployee(email: string, password: string) {
    const employeeData = await this.employeeService.findByEmail(email);
    if (!employeeData || !employeeData.auth) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const { auth, ...employee } = employeeData;

    // Verificar si la cuenta está bloqueada
    if (auth.locked_until && auth.locked_until > new Date()) {
      const remainingMinutes = Math.ceil(
        (auth.locked_until.getTime() - new Date().getTime()) / (1000 * 60)
      );
      throw new UnauthorizedException(
        `Cuenta bloqueada. Intente nuevamente en ${remainingMinutes} minutos`
      );
    }

    const isPasswordValid = await bcrypt.compare(password, auth.password);
    if (!isPasswordValid) {
      // Incrementar el contador de intentos fallidos
      auth.login_attempts += 1;

      // Si excede el máximo de intentos, bloquear la cuenta
      if (auth.login_attempts >= this.MAX_LOGIN_ATTEMPTS) {
        auth.locked_until = new Date(
          Date.now() + this.LOCK_TIME_MINUTES * 60 * 1000
        );
        await this.employeeAuthRepository.save(auth);
        throw new UnauthorizedException(
          `Demasiados intentos fallidos. Cuenta bloqueada por ${this.LOCK_TIME_MINUTES} minutos`
        );
      }

      await this.employeeAuthRepository.save(auth);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Restablecer los intentos fallidos si el login es exitoso
    if (auth.login_attempts > 0) {
      auth.login_attempts = 0;
      auth.locked_until = null;
      auth.last_login_at = new Date();
      await this.employeeAuthRepository.save(auth);
    }

    return employee;
  }

  async login(email: string, password: string) {
    const employee = await this.validateEmployee(email, password);
    
    const payload = {
      sub: employee.id,
      email: employee.email,
      name: employee.name,
      is_creator: employee.is_creator,
      supplier_id: employee.supplier?.id,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        is_creator: employee.is_creator,
        supplier: employee.supplier,
      },
    };
  }

  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }
} 
