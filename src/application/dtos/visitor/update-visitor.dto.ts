import { IsString, IsEmail, IsDateString, IsOptional } from 'class-validator';

export class UpdateVisitorDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsDateString()
    @IsOptional()
    check_in_time?: Date;

    @IsDateString()
    @IsOptional()
    check_out_time?: Date;
}
