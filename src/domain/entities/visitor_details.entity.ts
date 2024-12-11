import {
	Column,
	Entity,
	JoinColumn,
	PrimaryGeneratedColumn,
	OneToOne,
} from "typeorm";
import { Visitor } from "./visitor.entity";

@Entity("visitor_details")
export class VisitorDetails {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column("varchar", { nullable: false })
	name: string;

	@Column("varchar")
	state: string;

	@Column("varchar")
	location: string;

	@Column("varchar")
	compains: string;

	@Column("varchar")
	appointmant: string;

	@Column("varchar")
	appointmant_description: string;

	@Column("varchar")
	left_time: string;

	@OneToOne(
		() => Visitor,
		(visitor) => visitor.details,
	)
	@JoinColumn({ name: "visitor_id" })
	visitor: Visitor;

	@OneToOne(() => Visitor)
	@JoinColumn({ name: "check_in_visitor_id", referencedColumnName: "id" })
	check_in_visitor: Visitor;

	@OneToOne(() => Visitor)
	@JoinColumn({ name: "check_out_visitor_id", referencedColumnName: "id" })
	check_out_visitor: Visitor;
}
