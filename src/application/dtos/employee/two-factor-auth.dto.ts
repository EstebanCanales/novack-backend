import { IsString, IsNotEmpty, Length, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty({
    description: 'Código de verificación proporcionado por la app o enviado por correo',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class Verify2FADto {
  @ApiProperty({
    description: 'Código de verificación proporcionado por la app o enviado por correo',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class Disable2FADto {
  @ApiProperty({
    description: 'Código de verificación proporcionado por la app o enviado por correo',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

export class RecoveryCodeDto {
  @ApiProperty({
    description: 'Código de recuperación para acceder sin 2FA',
    example: 'ABCD-1234-EFGH-5678',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}

// Alias de RecoveryCodeDto para mantener compatibilidad con el código existente
export class BackupCodeDto {
  @ApiProperty({
    description: 'Código de respaldo para casos de emergencia cuando no se puede usar 2FA',
    example: 'Z45PJK8SD3',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(12)
  code: string;
} 