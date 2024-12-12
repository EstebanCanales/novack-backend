import { IsString, IsEmail, IsBoolean, IsOptional } from 'class-validator';

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
}
