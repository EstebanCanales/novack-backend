import { IsInt, IsBoolean, IsString, IsEmail, ValidateIf, IsNotEmpty, Min } from "class-validator";

export class CreateSupplierDto {
	@IsString()
	@IsNotEmpty({ message: 'El nombre del proveedor es requerido' })
	supplier_name: string;

	@IsInt()
	@Min(1, { message: 'Debe haber al menos un empleado' })
	@IsNotEmpty({ message: 'La cantidad de empleados es requerida' })
	employee_count: number;

	@IsInt()
	@Min(1, { message: 'Debe haber al menos una tarjeta' })
	@IsNotEmpty({ message: 'La cantidad de tarjetas es requerida' })
	card_count: number;

	@IsEmail({}, { message: 'El correo electrónico debe ser válido' })
	@IsNotEmpty({ message: 'El correo electrónico es requerido' })
	contact_email: string;

	@IsString()
	@IsNotEmpty({ message: 'El número de teléfono es requerido' })
	phone_number: string;

	@IsString()
	@IsNotEmpty({ message: 'La dirección es requerida' })
	address: string;

	@IsString()
	@IsNotEmpty({ message: 'La descripción es requerida' })
	description: string;

	@IsString()
	@IsNotEmpty({ message: 'La URL del logo es requerida' })
	logo_url: string;

	@IsString()
	@IsNotEmpty({ message: 'La información adicional es requerida' })
	additinal_info: string;

	@IsBoolean()
	@IsNotEmpty({ message: 'El estado de suscripción es requerido' })
	is_subscribed: boolean;

	@IsBoolean()
	@ValidateIf((o) => o.is_subscribed === true)
	@IsNotEmpty({ message: 'El estado de suscripción de tarjetas es requerido cuando is_subscribed es true' })
	has_card_subscription: boolean;

	@IsBoolean()
	@ValidateIf((o) => o.is_subscribed === true)
	@IsNotEmpty({ message: 'El estado de suscripción de sensores es requerido cuando is_subscribed es true' })
	has_sensor_subscription: boolean;
}
