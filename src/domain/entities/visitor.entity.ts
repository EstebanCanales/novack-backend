import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	OneToOne,
	OneToMany,
	Index,
} from "typeorm";
import { Supplier } from "./supplier.entity";
import { VisitorDetails } from "./visitor_details.entity";
import { Card } from "./card.entity";

@Entity("visitors")
export class Visitor {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column("varchar")
	name: string;

	@Column("varchar")
	email: string;

	@Column("varchar")
	phone: string;

	@Index()
	@Column("timestamp")
	check_in_time: Date;

	@Index()
	@Column("timestamp")
	check_out_time: Date;

	@CreateDateColumn({ type: "timestamp" })
	created_at: Date;

	@UpdateDateColumn({ type: "timestamp" })
	updated_at: Date;

	@ManyToOne(
		() => Supplier,
		(supplier) => supplier.visitors,
	)
	supplier: Supplier;

	@OneToMany(
		() => Card,
		(card) => card.visitor,
	)
	cards: Card[];

	@OneToOne(
		() => VisitorDetails,
		(details) => details.visitor,
	)
	details: VisitorDetails;
}
