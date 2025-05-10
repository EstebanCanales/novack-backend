import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from './employee.entity';

@Entity({ name: 'employee_auth' })
export class EmployeeAuth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  password: string;

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

  @Column({ nullable: true })
  last_login_at?: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => Employee)
  @JoinColumn()
  employee: Employee;
} 
