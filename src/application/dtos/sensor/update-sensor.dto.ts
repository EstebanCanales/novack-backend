import { IsString, IsOptional } from 'class-validator';

export class UpdateSensorDto {
    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    status?: string;
}
