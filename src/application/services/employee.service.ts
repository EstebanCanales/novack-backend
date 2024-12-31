import { Injectable } from '@nestjs/common';
import { CreateEmployeeDto } from '../dtos/employee';
import { UpdateEmployeeDto } from '../dtos/employee';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, Supplier } from 'src/domain/entities';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    const supplier = await this.supplierRepository.findOne({
      where: { id: createEmployeeDto.supplier_id },
    });

    const employee = this.employeeRepository.create({
      ...createEmployeeDto,
      supplier,
    });

    return await this.employeeRepository.save(employee);
  }

  async findAll() {
    return await this.employeeRepository.find({
      relations: ['supplier'],
    });
  }

  async findOne(id: string) {
    return await this.employeeRepository.findOne({
      where: { id },
      relations: ['supplier'],
    });
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const employee = await this.findOne(id);

    if (updateEmployeeDto.supplier_id) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: updateEmployeeDto.supplier_id },
      });
      employee.supplier = supplier;
    }

    Object.assign(employee, updateEmployeeDto);
    return await this.employeeRepository.save(employee);
  }

  async remove(id: string) {
    const employee = await this.findOne(id);
    return await this.employeeRepository.remove(employee);
  }
}

