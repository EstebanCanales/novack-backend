import { IsString } from 'class-validator';

export class CreateVisitorDetailsDto {
    @IsString()
    name: string;

    @IsString()
    state: string;

    @IsString()
    location: string;

    @IsString()
    compains: string;

    @IsString()
    appointmant: string;

    @IsString()
    appointmant_description: string;

    @IsString()
    left_time: string;
}
