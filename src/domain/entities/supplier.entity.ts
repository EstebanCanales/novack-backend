import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToOne,
	OneToMany,
} from "typeorm";
import { Employee } from "./employee.entity";
import { SupplierDetails } from "./supplier_details.entity";
import { Visitor } from "./visitor.entity";
import { Card } from "./card.entity";

@Entity("suppliers")
export class Supplier {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column("int")
	employee_count: number;

	@Column("int")
	card_count: number;

	@Column("boolean")
	is_subscribed: boolean;

	@Column("boolean")
	has_card_subscription: boolean;

	@Column("boolean")
	has_sensor_subscription: boolean;

	@CreateDateColumn({ type: "timestamp" })
	created_at: Date;

	@UpdateDateColumn({ type: "timestamp" })
	updated_at: Date;

	@OneToMany(
		() => Employee,
		(employee) => employee.supplier,
	)
	employees: Employee[];

	@OneToMany(
		() => Visitor,
		(visitor) => visitor.supplier,
	)
	visitors: Visitor[];

	@OneToMany(
		() => Card,
		(card) => card.supplier,
	)
	cards: Card[];

	@OneToOne(
		() => SupplierDetails,
		(detail) => detail.supplier,
	)
	details: SupplierDetails;
}
