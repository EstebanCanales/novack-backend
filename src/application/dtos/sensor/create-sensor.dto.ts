import { IsString } from 'class-validator';

export class CreateSensorDto {
    @IsString()
    location: string;

    @IsString()
    status: string;
}
