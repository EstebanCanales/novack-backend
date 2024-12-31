import { Injectable, BadRequestException } from '@nestjs/common';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from 'src/application/dtos/supplier';
import { Repository } from 'typeorm';
import { Supplier } from 'src/domain/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from '../dtos/employee';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly employeeService: EmployeeService,
  ) {}

  private async validateSubscriptions(
    data: Partial<CreateSupplierDto | UpdateSupplierDto>,
    existingSupplier?: Supplier,
  ) {
    const isSubscribed =
      data.is_subscribed ?? existingSupplier?.is_subscribed ?? false;

    if (!isSubscribed) {
      if (data.has_card_subscription || data.has_sensor_subscription) {
        throw new BadRequestException(
          'No se pueden tener suscripciones activas si is_subscribed es false',
        );
      }
    }
  }

  async create(supplierData: CreateSupplierDto) {
    await this.validateSubscriptions(supplierData);

    if (supplierData.is_subscribed === false) {
      supplierData.has_card_subscription = false;
      supplierData.has_sensor_subscription = false;
    }

    const supplier = this.supplierRepository.create(supplierData);
    const savedSupplier = await this.supplierRepository.save(supplier);

    const employeeCount = supplierData.employee_count || 0;
    let firstEmployeeId: string | null = null;

    for (let i = 1; i <= employeeCount; i++) {
      const employeeData: CreateEmployeeDto = {
        name: `Employee ${i} - ${supplier.supplier_name}`,
        email: `employee${i}@${supplier.supplier_name.toLowerCase().replace(/\s+/g, '')}.com`,
        role: 'employee',
        is_active: true,
        supplier_id: savedSupplier.id,
        supplier_name: supplier.supplier_name,
      };
      const createdEmployee = await this.employeeService.create(employeeData);

      if (i === 1) {
        firstEmployeeId = createdEmployee.id;
      }
    }

    if (firstEmployeeId) {
      await this.supplierRepository.update(savedSupplier.id, {
        supplier_creator: firstEmployeeId,
      });
    }

    return await this.supplierRepository.findOne({
      where: { id: savedSupplier.id },
      relations: ['employees'],
    });
  }

  async findAll() {
    return await this.supplierRepository.find({
      relations: ['employees'],
    });
  }

  async findOne(id: string) {
    return await this.supplierRepository.findOne({
      where: { id },
      relations: ['employees'],
    });
  }

  async update(id: string, supplierData: UpdateSupplierDto) {
    const existingSupplier = await this.findOne(id);
    if (!existingSupplier) {
      throw new BadRequestException('Proveedor no encontrado');
    }

    await this.validateSubscriptions(supplierData, existingSupplier);

    // Si is_subscribed es false (ya sea en los datos actuales o existentes), forzar las suscripciones a false
    const willBeSubscribed =
      supplierData.is_subscribed ?? existingSupplier.is_subscribed;
    if (!willBeSubscribed) {
      supplierData.has_card_subscription = false;
      supplierData.has_sensor_subscription = false;
    }

    if (supplierData.supplier_name) {
      await Promise.all(
        existingSupplier.employees.map((employee) =>
          this.employeeService.update(employee.id, {
            supplier_name: supplierData.supplier_name,
          }),
        ),
      );
    }

    await this.supplierRepository.update(id, supplierData);
    return await this.findOne(id);
  }

  async remove(id: string) {
    const supplier = await this.findOne(id);
    return await this.supplierRepository.remove(supplier);
  }
}
