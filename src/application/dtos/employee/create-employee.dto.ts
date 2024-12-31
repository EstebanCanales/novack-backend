import { IsString, IsEmail, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateEmployeeDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    role: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsUUID()
    supplier_id: string;

    @IsString()
    supplier_name: string;
}
