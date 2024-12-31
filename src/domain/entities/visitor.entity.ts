import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { Card } from './card.entity';

@Entity({ name: 'visitors' })
export class Visitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column()
  location: string;

  @Column({ type: 'json', default: { invitado1: 'ninguno' } })
  complaints: Record<string, string>;

  @Column({ default: 'pendiente' })
  state: string;

  @Column()
  appointment: string;

  @Column()
  appointment_description: string;

  @Column({ type: 'timestamp' })
  check_in_time: Date;

  @Column({ type: 'timestamp', nullable: true })
  check_out_time: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Supplier, (supplier) => supplier.id)
  supplier: Supplier;

  @OneToMany(() => Card, (card) => card.visitor)
  cards: Card[];
}
