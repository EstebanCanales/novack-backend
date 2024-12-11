import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
} from "typeorm";
import { Supplier } from "./supplier.entity";

@Entity("employees")
export class Employee {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column("varchar")
	name: string;

	@Column("varchar", { unique: true })
	email: string;

	@Column("varchar")
	role: string;

	@Column("boolean", { default: true })
	is_active: boolean;

	@CreateDateColumn({ type: "timestamp" })
	created_at: Date;

	@UpdateDateColumn({ type: "timestamp" })
	updated_at: Date;

	@ManyToOne(
		() => Supplier,
		(supplier) => supplier.employees,
	)
	supplier: Supplier;
}
