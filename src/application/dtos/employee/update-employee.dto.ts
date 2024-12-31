import { IsString, IsEmail, IsUUID, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmployeeDto {
    @ApiPropertyOptional({ 
        description: 'Nombre completo del empleado',
        example: 'Juan Pérez García',
        minLength: 3,
        maxLength: 100
    })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ 
        description: 'Correo electrónico del empleado (único)',
        example: 'juan.perez@empresa.com',
        format: 'email'
    })
    @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
    @IsOptional()
    email?: string;

    @ApiPropertyOptional({ 
        description: 'Nueva contraseña del empleado (mínimo 6 caracteres)',
        example: 'newpassword123',
        minLength: 6
    })
    @IsString()
    @IsOptional()
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    password?: string;

    @ApiPropertyOptional({ 
        description: 'Indica si el empleado es el creador del proveedor',
        example: false
    })
    @IsBoolean()
    @IsOptional()
    is_creator?: boolean;

    @ApiPropertyOptional({ 
        description: 'ID UUID del proveedor al que pertenece el empleado',
        example: '123e4567-e89b-12d3-a456-426614174000',
        format: 'uuid'
    })
    @IsUUID()
    @IsOptional()
    supplier_id?: string;
}
