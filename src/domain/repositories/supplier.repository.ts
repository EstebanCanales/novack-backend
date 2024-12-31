import { Supplier } from '../entities/supplier.entity';

export interface SupplierRepository {
  findAll(): Promise<Supplier[]>;
  findOne(id: string): Promise<Supplier | null>;
  findByName(name: string): Promise<Supplier | null>;
  findOneOrFail(id: string): Promise<Supplier>;
  create(data: Partial<Supplier>): Supplier;
  save(supplier: Supplier): Promise<Supplier>;
  update(id: string, data: Partial<Supplier>): Promise<void>;
  delete(id: string): Promise<boolean>;
}
