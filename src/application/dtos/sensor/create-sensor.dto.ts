import { IsString, IsUUID } from 'class-validator';

export class CreateSensorDto {
    @IsString()
    location: string;

    @IsString()
    status: string;

    @IsUUID()
    supplier_id: string;
}
