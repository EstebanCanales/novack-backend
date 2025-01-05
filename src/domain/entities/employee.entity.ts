import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';

@Entity({ name: 'employees' })
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: false })
  is_creator: boolean;

  @Column({ default: false })
  is_2fa_enabled: boolean;

  @Column({ nullable: true })
  two_factor_secret?: string;

  @Column({ nullable: true })
  two_factor_recovery_codes?: string;

  @Column({ default: false })
  is_email_verified: boolean;

  @Column({ nullable: true })
  email_verification_token?: string;

  @Column({ nullable: true })
  email_verification_expires?: Date;

  @Column({ default: 0 })
  login_attempts: number;

  @Column({ nullable: true })
  locked_until?: Date;


  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Supplier, (supplier) => supplier.employees)
  supplier: Supplier;
}
