import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateEmployeeDto } from '../dtos/employee';
import { UpdateEmployeeDto } from '../dtos/employee';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeAuth, Supplier } from 'src/domain/entities';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(EmployeeAuth)
    private readonly employeeAuthRepository: Repository<EmployeeAuth>,
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
      relations: ['subscription'],
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

    // Crear el empleado
    const employee = this.employeeRepository.create({
      name: createEmployeeDto.name,
      email: createEmployeeDto.email,
      is_creator: createEmployeeDto.is_creator,
      phone: createEmployeeDto.phone,
      position: createEmployeeDto.position,
      department: createEmployeeDto.department,
      supplier,
    });

    const savedEmployee = await this.employeeRepository.save(employee);

    // Crear la autenticación del empleado
    const employeeAuth = this.employeeAuthRepository.create({
      password: hashedPassword,
      is_email_verified: false,
      employee: savedEmployee
    });

    await this.employeeAuthRepository.save(employeeAuth);

    return savedEmployee;
  }

  async findAll() {
    return await this.employeeRepository.find({
      relations: ['supplier'],
    });
  }

  async findOne(id: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['supplier'],
    });

    if (!employee) {
      throw new BadRequestException('El empleado no existe');
    }

    return employee;
  }

  async findOneWithAuth(id: string) {
    const employee = await this.findOne(id);
    
    const auth = await this.employeeAuthRepository.findOne({
      where: { employee: { id } }
    });

    if (!auth) {
      throw new BadRequestException('La autenticación del empleado no existe');
    }

    return { ...employee, auth };
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['supplier'],
    });

    if (!employee) {
      throw new BadRequestException('El empleado no existe');
    }

    const auth = await this.employeeAuthRepository.findOne({
      where: { employee: { id } }
    });

    if (!auth) {
      throw new BadRequestException('La autenticación del empleado no existe');
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

    // Si se proporciona una nueva contraseña, hashearla y actualizar auth
    if (updateEmployeeDto.password) {
      const hashedPassword = await this.hashPassword(updateEmployeeDto.password);
      auth.password = hashedPassword;
      await this.employeeAuthRepository.save(auth);
    }

    // Actualizar los datos del empleado
    if (updateEmployeeDto.name) employee.name = updateEmployeeDto.name;
    if (updateEmployeeDto.email) employee.email = updateEmployeeDto.email;
    if (updateEmployeeDto.phone) employee.phone = updateEmployeeDto.phone;
    if (updateEmployeeDto.position) employee.position = updateEmployeeDto.position;
    if (updateEmployeeDto.department) employee.department = updateEmployeeDto.department;
    if (updateEmployeeDto.is_creator !== undefined) employee.is_creator = updateEmployeeDto.is_creator;

    return await this.employeeRepository.save(employee);
  }

  async remove(id: string) {
    const employee = await this.findOne(id);

    if (employee.is_creator) {
      throw new BadRequestException('No se puede eliminar al creador del proveedor');
    }

    // Eliminar primero la autenticación para evitar errores de clave foránea
    const auth = await this.employeeAuthRepository.findOne({
      where: { employee: { id } }
    });

    if (auth) {
      await this.employeeAuthRepository.remove(auth);
    }

    return await this.employeeRepository.remove(employee);
  }

  async findByEmail(email: string) {
    const employee = await this.employeeRepository.findOne({
      where: { email },
      relations: ['supplier'],
    });

    if (!employee) {
      return null;
    }

    const auth = await this.employeeAuthRepository.findOne({
      where: { employee: { id: employee.id } }
    });

    return { ...employee, auth };
  }

  async findBySupplier(supplier_id: string) {
    return await this.employeeRepository.find({
      where: { supplier: { id: supplier_id } },
    });
  }

  // --- NUEVO MÉTODO PARA ACTUALIZAR URL DE IMAGEN DE PERFIL ---
  async updateProfileImageUrl(id: string, imageUrl: string) {
    const employee = await this.employeeRepository.findOneBy({ id });
    if (!employee) {
      throw new BadRequestException('El empleado no existe');
    }

    employee.profile_image_url = imageUrl;
    await this.employeeRepository.save(employee);
    return employee; // Opcional: devolver el empleado actualizado
  }
}
