import { IsString, IsOptional } from 'class-validator';

export class UpdateVisitorDetailsDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    state?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    compains?: string;

    @IsString()
    @IsOptional()
    appointmant?: string;

    @IsString()
    @IsOptional()
    appointmant_description?: string;

    @IsString()
    @IsOptional()
    left_time?: string;
}
