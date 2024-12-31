import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateEmployeeDto } from '../dtos/employee';
import { UpdateEmployeeDto } from '../dtos/employee';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, Supplier } from 'src/domain/entities';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  async create(createEmployeeDto: CreateEmployeeDto) {
    // Verificar si el email ya está registrado
    const existingEmployee = await this.employeeRepository.findOne({
      where: { email: createEmployeeDto.email },
    });

    if (existingEmployee) {
      throw new BadRequestException('El correo electrónico ya está registrado');
    }

    const supplier = await this.supplierRepository.findOne({
      where: { id: createEmployeeDto.supplier_id },
    });

    if (!supplier) {
      throw new BadRequestException('El proveedor no existe');
    }

    // Si es el creador, verificar que no haya otro creador
    if (createEmployeeDto.is_creator) {
      const existingCreator = await this.employeeRepository.findOne({
        where: { supplier: { id: supplier.id }, is_creator: true },
      });

      if (existingCreator) {
        throw new BadRequestException('El proveedor ya tiene un creador asignado');
      }
    }

    // Hashear la contraseña
    const hashedPassword = await this.hashPassword(createEmployeeDto.password);

    const employee = this.employeeRepository.create({
      ...createEmployeeDto,
      password: hashedPassword,
      supplier,
    });

    return await this.employeeRepository.save(employee);
  }

  async findAll() {
    return await this.employeeRepository.find({
      relations: ['supplier'],
      select: ['id', 'name', 'email', 'is_creator', 'created_at', 'updated_at'],
    });
  }

  async findOne(id: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['supplier'],
      select: ['id', 'name', 'email', 'is_creator', 'created_at', 'updated_at'],
    });

    if (!employee) {
      throw new BadRequestException('El empleado no existe');
    }

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['supplier'],
    });

    if (!employee) {
      throw new BadRequestException('El empleado no existe');
    }

    if (updateEmployeeDto.email && updateEmployeeDto.email !== employee.email) {
      const existingEmployee = await this.employeeRepository.findOne({
        where: { email: updateEmployeeDto.email },
      });

      if (existingEmployee) {
        throw new BadRequestException('El correo electrónico ya está registrado');
      }
    }

    if (updateEmployeeDto.supplier_id) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: updateEmployeeDto.supplier_id },
      });

      if (!supplier) {
        throw new BadRequestException('El proveedor no existe');
      }

      // Si está cambiando de proveedor y es creador, verificar el nuevo proveedor
      if (employee.is_creator) {
        const existingCreator = await this.employeeRepository.findOne({
          where: { supplier: { id: supplier.id }, is_creator: true },
        });

        if (existingCreator) {
          throw new BadRequestException('El proveedor ya tiene un creador asignado');
        }
      }

      employee.supplier = supplier;
    }

    // Si se proporciona una nueva contraseña, hashearla
    if (updateEmployeeDto.password) {
      updateEmployeeDto.password = await this.hashPassword(updateEmployeeDto.password);
    }

    Object.assign(employee, updateEmployeeDto);
    return await this.employeeRepository.save(employee);
  }

  async remove(id: string) {
    const employee = await this.findOne(id);

    if (employee.is_creator) {
      throw new BadRequestException('No se puede eliminar al creador del proveedor');
    }

    return await this.employeeRepository.remove(employee);
  }
}
