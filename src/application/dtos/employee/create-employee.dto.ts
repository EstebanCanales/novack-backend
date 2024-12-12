import { IsString, IsEmail, IsBoolean, IsOptional } from 'class-validator';

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
}
