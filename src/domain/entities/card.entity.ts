import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Supplier } from './';
import { Visitor } from './';

@Entity({ name: 'cards' })
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  issued_at: Date;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  accuracy: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Supplier, (supplier) => supplier.id)
  supplier: Supplier;

  @ManyToOne(() => Visitor, (visitor) => visitor.id)
  visitor: Visitor;
}
