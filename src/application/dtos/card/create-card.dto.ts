import { IsBoolean, IsOptional, IsDate, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCardDto {
    @ApiPropertyOptional({
        description: `Estado de activación de la tarjeta.
        - true: Tarjeta activa y disponible para uso
        - false: Tarjeta desactivada temporalmente`,
        default: true,
        example: true
    })
    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @ApiPropertyOptional({
        description: `Fecha y hora en que la tarjeta fue emitida o asignada.
        Se establece automáticamente al asignar la tarjeta a un visitante.`,
        example: '2024-12-30T10:00:00.000Z',
        format: 'date-time'
    })
    @IsDate()
    @IsOptional()
    issued_at?: Date;

    @ApiPropertyOptional({
        description: `Latitud de la última ubicación registrada de la tarjeta.
        Formato: Grados decimales`,
        example: -12.0464,
        minimum: -90,
        maximum: 90
    })
    @IsNumber()
    @IsOptional()
    latitude?: number;

    @ApiPropertyOptional({
        description: `Longitud de la última ubicación registrada de la tarjeta.
        Formato: Grados decimales`,
        example: -77.0428,
        minimum: -180,
        maximum: 180
    })
    @IsNumber()
    @IsOptional()
    longitude?: number;

    @ApiPropertyOptional({
        description: `Precisión de la ubicación GPS en metros.
        Indica el radio de precisión de las coordenadas.`,
        example: 10,
        minimum: 0,
        maximum: 1000
    })
    @IsNumber()
    @IsOptional()
    accuracy?: number;

    @ApiProperty({
        description: `ID UUID del proveedor propietario de la tarjeta.
        El proveedor debe tener una suscripción activa de tarjetas.`,
        example: '123e4567-e89b-12d3-a456-426614174000',
        format: 'uuid'
    })
    @IsUUID()
    supplier_id: string;

    @ApiPropertyOptional({
        description: `ID UUID del visitante al que se asignará la tarjeta.
        Si se proporciona, la tarjeta se asignará automáticamente al visitante.
        Si no se proporciona, la tarjeta quedará disponible para asignación.`,
        example: '987fcdeb-51a2-43f7-9abc-def012345678',
        format: 'uuid'
    })
    @IsUUID()
    @IsOptional()
    visitor_id?: string;
}
