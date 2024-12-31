import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmployeeService } from './employee.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly jwtService: JwtService,
  ) {}

  async validateEmployee(email: string, password: string) {
    const employee = await this.employeeService.findByEmail(email);
    if (!employee) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
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