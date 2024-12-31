import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Employee } from './employee.entity';

@Entity({ name: 'suppliers' })
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  supplier_name: string;

  @Column({ nullable: true })
  supplier_creator: string;

  @Column()
  contact_email: string;

  @Column()
  phone_number: string;

  @Column()
  address: string;

  @Column()
  description: string;

  @Column()
  logo_url: string;

  @Column()
  additional_info: string;

  @Column({ default: false })
  is_subscribed: boolean;

  @Column({ default: false })
  has_card_subscription: boolean;

  @Column({ default: false })
  has_sensor_subscription: boolean;

  @Column()
  employee_count: number;

  @Column()
  card_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Employee, (employee) => employee.supplier)
  employees: Employee[];
}
