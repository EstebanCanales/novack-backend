import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { Card } from './card.entity';

@Entity({ name: 'visitors' })
export class Visitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column()
  location: string;

  @Column({ type: 'jsonb', nullable: true })
  additional_info: Record<string, any>;

  @Column({ default: 'pendiente' })
  state: string;

  @Column({ nullable: true })
  profile_image_url?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Supplier, (supplier) => supplier.visitors)
  supplier: Supplier;

  @OneToOne(() => Card, (card) => card.visitor)
  card: Card;

  @OneToMany(() => Appointment, (appointment) => appointment.visitor)
  appointments: Appointment[];
}

@Entity({ name: 'appointments' })
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({ type: 'timestamp' })
  scheduled_time: Date;

  @Column({ type: 'timestamp' })
  check_in_time: Date;

  @Column({ type: 'timestamp', nullable: true })
  check_out_time: Date;

  @Column({ type: 'jsonb', default: { invitado1: 'ninguno' } })
  complaints: Record<string, string>;

  @Column({ default: 'pendiente' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Visitor, (visitor) => visitor.appointments)
  visitor: Visitor;

  @ManyToOne(() => Supplier, (supplier) => supplier.id)
  supplier: Supplier;
}
