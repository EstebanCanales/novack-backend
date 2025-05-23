import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Employee } from './employee.entity';
import { Visitor } from './visitor.entity';
import { Card } from './card.entity';
import { Sensor } from './sensor.entity';
import { SupplierSubscription } from './supplier-subscription.entity';

@Entity({ name: 'suppliers' })
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  supplier_name: string;

  @Column({ nullable: true })
  supplier_creator: string;

  @Column({ unique: true })
  contact_email: string;

  @Column()
  phone_number: string;

  @Column()
  address: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  logo_url: string;

  @Column({ type: 'jsonb', nullable: true })
  additional_info: Record<string, any>;

  @Column({ nullable: true })
  profile_image_url?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relaciones
  @OneToMany(() => Employee, (employee) => employee.supplier)
  employees: Employee[];

  @OneToMany(() => Visitor, (visitor) => visitor.supplier)
  visitors: Visitor[];

  @OneToMany(() => Card, (card) => card.supplier)
  cards: Card[];

  @OneToMany(() => Sensor, (sensor) => sensor.supplier)
  sensors: Sensor[];

  // Relación con SupplierSubscription - sin decorador para evitar referencias circulares
  subscription?: SupplierSubscription;
}
