import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';

@Entity({ name: 'sensor_readings' })
export class SensorReading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @Column({ nullable: true })
  sensor_id: string;
}

@Entity({ name: 'sensors' })
export class Sensor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sensor_id: string;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column()
  location: string;

  @Column()
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  configuration: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  last_maintenance: Date;

  @ManyToOne(() => Supplier, (supplier) => supplier.sensors)
  supplier: Supplier;

  @OneToMany(() => SensorReading, (reading) => reading.sensor_id)
  readings: SensorReading[];
}
