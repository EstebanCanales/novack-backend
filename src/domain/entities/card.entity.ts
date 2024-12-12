import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
} from "typeorm";
import { Supplier } from "./supplier.entity";
import { Visitor } from "./visitor.entity";

@Entity("card")
export class Card {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column("boolean", { default: true })
	is_active: boolean;

	@Column("timestamp", { nullable: true })
	issued_at: Date;

	@Column("uuid", { nullable: true })
	visitor_id: string;

	@Column("decimal", { precision: 9, scale: 6, nullable: true })
	latitude: number;

	@Column("decimal", { precision: 9, scale: 6, nullable: true })
	longitude: number;

	@Column("decimal", { precision: 5, scale: 2, nullable: true })
	accuracy: number;

	@CreateDateColumn({ type: "timestamp" })
	created_at: Date;

	@UpdateDateColumn({ type: "timestamp" })
	updated_at: Date;

	@ManyToOne(
		() => Supplier,
		(supplier) => supplier.cards,
	)
	supplier: Supplier;

	@ManyToOne(
		() => Visitor,
		(visitor) => visitor.cards,
		{ nullable: true },
	)
	visitor: Visitor;
}
