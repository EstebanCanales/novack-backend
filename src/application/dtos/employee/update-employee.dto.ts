import { IsString, IsEmail, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdateEmployeeDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    role?: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsUUID()
    @IsOptional()
    supplier_id?: string;

    @IsString()
    @IsOptional()
    supplier_name?: string;
}
