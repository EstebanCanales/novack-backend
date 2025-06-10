import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { Employee } from './employee.entity';

interface BackupCode {
  code: string;
  created_at: string;
  used: boolean;
  used_at?: string;
}

@Entity('employee_credentials')
export class EmployeeCredentials {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  password_hash: string;

  @Column({ nullable: true })
  two_factor_secret?: string;

  @Column({ default: false })
  two_factor_enabled: boolean;

  @Column('json', { nullable: true })
  backup_codes?: BackupCode[];

  @Column({ nullable: true })
  reset_token?: string;

  @Column({ nullable: true })
  reset_token_expires?: Date;

  @Column({ nullable: true })
  verification_token?: string;

  @Column({ default: false })
  is_email_verified: boolean;

  // SMS based 2FA fields
  @Column({ default: false })
  phone_number_verified: boolean;

  @Column({ default: false })
  is_sms_2fa_enabled: boolean;

  @Column({ type: 'varchar', nullable: true, length: 10 }) // Adjust length as appropriate for OTP
  sms_otp_code: string | null;

  @Column({ type: 'timestamp', nullable: true })
  sms_otp_code_expires_at: Date | null;

  @OneToOne(() => Employee, employee => employee.credentials, { onDelete: 'CASCADE' })
  @JoinColumn()
  employee: Employee;

  @Column()
  employee_id: string;

  @Column({ nullable: true })
  last_login?: Date;
} 