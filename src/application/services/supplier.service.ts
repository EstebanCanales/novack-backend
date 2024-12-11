import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from 'src/domain/entities';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private suppliersRepository: Repository<Supplier>
  ) {}

  async create(supplierData: Partial<Supplier>): Promise<Supplier> {
    const supplier = this.suppliersRepository.create(supplierData);
    return await this.suppliersRepository.save(supplier);
  }

  async findAll(): Promise<Supplier[]> {
    return await this.suppliersRepository.find();
  }

  async findOne(id: string): Promise<Supplier | null> {
    return await this.suppliersRepository.findOneBy({ id });
  }

  async update(id: string, supplierData: Partial<Supplier>): Promise<Supplier | null> {
    await this.suppliersRepository.update(id, supplierData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.suppliersRepository.delete(id);
  }
}
