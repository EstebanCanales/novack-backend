import {
	IsNumber,
	IsOptional,
	IsString,
	IsBoolean,
	IsInt,
	IsEmail,
	ValidateIf,
} from "class-validator";

export class UpdateSupplierDto {
	@IsOptional()
	@IsString()
	supplier_name?: string;

	@IsOptional()
	@IsInt()
	employee_count?: number;

	@IsOptional()
	@IsInt()
	card_count?: number;

	@IsOptional()
	@IsEmail()
	contact_email?: string;

	@IsOptional()
	@IsString()
	phone_number?: string;

	@IsOptional()
	@IsString()
	address?: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsString()
	logo_url?: string;

	@IsOptional()
	@IsString()
	additional_info?: string;

	@IsOptional()
	@IsBoolean()
	is_subscribed?: boolean;

	@IsOptional()
	@IsBoolean()
	@ValidateIf((o) => o.is_subscribed === true || o.is_subscribed === undefined)
	has_card_subscription?: boolean;

	@IsOptional()
	@IsBoolean()
	@ValidateIf((o) => o.is_subscribed === true || o.is_subscribed === undefined)
	has_sensor_subscription?: boolean;
}
