import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';

@Entity({ name: 'supplier_subscriptions' })
export class SupplierSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: false })
  is_subscribed: boolean;

  @Column({ default: false })
  has_card_subscription: boolean;

  @Column({ default: false })
  has_sensor_subscription: boolean;

  @Column({ default: 0 })
  max_employee_count: number;

  @Column({ default: 0 })
  max_card_count: number;

  @Column({ type: 'timestamp', nullable: true })
  subscription_start_date: Date;
  
  @Column({ type: 'timestamp', nullable: true })
  subscription_end_date: Date;

  @Column({ type: 'jsonb', nullable: true })
  subscription_details: Record<string, any>;

  @Column({ type: 'boolean', default: false, name: 'has_ai_feature_subscription' })
  has_ai_feature_subscription: boolean;

  @Column({ type: 'varchar', nullable: true, name: 'stripe_customer_id' }) // Explicitly naming with underscore for DB
  stripe_customer_id: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'stripe_subscription_id' })
  stripe_subscription_id: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'stripe_payment_method_id' }) // Optional, for specific payment method tracking
  stripe_payment_method_id: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'stripe_price_id' }) // To store the ID of the Stripe Price
  stripe_price_id: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'subscription_status' }) // e.g., 'active', 'past_due', 'canceled'
  subscription_status: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  supplier_id: string;

  // Relación con Supplier - sin decorador para evitar referencias circulares
  supplier?: Supplier;
} 