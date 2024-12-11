import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
} from "typeorm";
import { Supplier } from "./supplier.entity";

@Entity("sensor")
export class Sensor {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column("varchar")
	location: string;

	@Column("varchar")
	status: string;

	@CreateDateColumn({ type: "timestamp" })
	created_at: Date;

	@UpdateDateColumn({ type: "timestamp" })
	updated_at: Date;

	@ManyToOne(
		() => Supplier,
		(supplier) => supplier.cards,
	)
	supplier: Supplier;
}
