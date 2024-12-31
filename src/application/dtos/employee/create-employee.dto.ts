import { IsString, IsEmail, IsUUID, IsNotEmpty, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
    @ApiProperty({ 
        description: 'Nombre completo del empleado',
        example: 'Juan Pérez García',
        minLength: 3,
        maxLength: 100
    })
    @IsString()
    @IsNotEmpty({ message: 'El nombre es requerido' })
    name: string;

    @ApiProperty({ 
        description: 'Correo electrónico del empleado (único)',
        example: 'juan.perez@empresa.com',
        format: 'email'
    })
    @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
    @IsNotEmpty({ message: 'El correo electrónico es requerido' })
    email: string;

    @ApiProperty({ 
        description: 'Contraseña del empleado (mínimo 6 caracteres)',
        example: 'password123',
        minLength: 6
    })
    @IsString()
    @IsNotEmpty({ message: 'La contraseña es requerida' })
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    password: string;

    @ApiPropertyOptional({ 
        description: 'Indica si el empleado es el creador del proveedor',
        example: false,
        default: false
    })
    @IsBoolean()
    @IsOptional()
    is_creator?: boolean;

    @ApiProperty({ 
        description: 'ID UUID del proveedor al que pertenece el empleado',
        example: '123e4567-e89b-12d3-a456-426614174000',
        format: 'uuid'
    })
    @IsUUID()
    @IsNotEmpty({ message: 'El ID del proveedor es requerido' })
    supplier_id: string;
}
