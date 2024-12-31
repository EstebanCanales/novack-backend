import { Injectable, BadRequestException } from '@nestjs/common';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from 'src/application/dtos/supplier';
import { Repository } from 'typeorm';
import { Supplier, Employee } from 'src/domain/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeService } from './employee.service';
import { EmailService } from './email.service';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly employeeService: EmployeeService,
    private readonly emailService: EmailService,
  ) {}

  async create(createSupplierDto: CreateSupplierDto) {
    // Verificar si ya existe un proveedor con el mismo nombre
    const existingSupplier = await this.supplierRepository.findOne({
      where: { supplier_name: createSupplierDto.supplier_name },
    });

    if (existingSupplier) {
      throw new BadRequestException('Ya existe un proveedor con ese nombre');
    }

    // Crear el proveedor
    const supplier = this.supplierRepository.create(createSupplierDto);
    const savedSupplier = await this.supplierRepository.save(supplier);

    // Crear el empleado creador
    if (createSupplierDto.supplier_creator) {
      const temporalPassword = 'Temporal123';
      try {
        const employee = await this.employeeService.create({
          name: createSupplierDto.supplier_creator,
          email: createSupplierDto.contact_email,
          password: temporalPassword,
          is_creator: true,
          supplier_id: savedSupplier.id,
        });

        console.log('Empleado creado exitosamente:', employee);

        // Enviar email con la información
        try {
          console.log('Intentando enviar email al proveedor...');
          const emailResult = await this.emailService.sendSupplierCreationEmail(
            savedSupplier,
            createSupplierDto.contact_email,
            temporalPassword,
          );
          console.log('Email enviado exitosamente:', emailResult);
        } catch (emailError) {
          console.error('Error al enviar el email:', emailError);
          // No lanzamos el error para no revertir la creación del proveedor
        }
      } catch (error) {
        // Si falla la creación del empleado, eliminar el proveedor
        await this.supplierRepository.remove(savedSupplier);
        throw new BadRequestException(
          'Error al crear el empleado creador: ' + error.message,
        );
      }
    }

    return savedSupplier;
  }

  async findAll() {
    return await this.supplierRepository.find({
      relations: ['employees'],
    });
  }

  async findOne(id: string) {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
      relations: ['employees'],
    });

    if (!supplier) {
      throw new BadRequestException('El proveedor no existe');
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    const supplier = await this.findOne(id);

    if (
      updateSupplierDto.supplier_name &&
      updateSupplierDto.supplier_name !== supplier.supplier_name
    ) {
      const existingSupplier = await this.supplierRepository.findOne({
        where: { supplier_name: updateSupplierDto.supplier_name },
      });

      if (existingSupplier) {
        throw new BadRequestException('Ya existe un proveedor con ese nombre');
      }
    }

    Object.assign(supplier, updateSupplierDto);
    return await this.supplierRepository.save(supplier);
  }

  async remove(id: string) {
    const supplier = await this.findOne(id);

    // Verificar si hay empleados
    const employees = await this.employeeRepository.find({
      where: { supplier: { id } },
    });

    if (employees.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar el proveedor porque tiene empleados asociados',
      );
    }

    return await this.supplierRepository.remove(supplier);
  }
}
