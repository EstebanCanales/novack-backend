import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToOne,
	JoinColumn,
} from "typeorm";
import { Supplier } from "./supplier.entity";

@Entity("supplier_details")
export class SupplierDetails {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column("varchar", { nullable: true })
	name: string;

	@Column("text", { nullable: true })
	description: string;

	@Column("varchar", { nullable: true })
	logo_url: string;

	@Column("varchar", { nullable: true })
	contact_email: string;

	@Column("varchar", { nullable: true })
	phone_number: string;

	@Column("varchar", { nullable: true })
	address: string;

	@Column("jsonb", { nullable: true })
	additional_info: Record<string, any>;

	@CreateDateColumn({ type: "timestamp" })
	created_at: Date;

	@UpdateDateColumn({ type: "timestamp" })
	updated_at: Date;

	@OneToOne(
		() => Supplier,
		(supplier) => supplier.details,
	)
	@JoinColumn()
	supplier: Supplier;
}
