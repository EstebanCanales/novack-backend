import { IsInt, IsBoolean } from "class-validator";

export class CreateSupplierDto {
    @IsInt()
    employee_count: number;

    @IsInt()
    card_count: number;

    @IsBoolean()
    is_subscribed: boolean;

    @IsBoolean()
    has_card_subscription: boolean;

    @IsBoolean()
    has_sensor_subscription: boolean;
}
