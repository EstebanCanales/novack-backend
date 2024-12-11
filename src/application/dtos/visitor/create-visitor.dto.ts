import { IsString, IsEmail, IsDateString } from 'class-validator';

export class CreateVisitorDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    phone: string;

    @IsDateString()
    check_in_time: Date;

    @IsDateString()
    check_out_time: Date;
}
