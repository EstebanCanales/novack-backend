import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from 'src/application/guards/auth.guard';
import { TwoFactorAuthService } from '../../application/services/two-factor-auth.service';
import {
  Enable2FADto,
  Verify2FADto,
  Disable2FADto,
} from '../../application/dtos/employee/two-factor-auth.dto';

@ApiTags('2fa')
@Controller('2fa')
@UseGuards(AuthGuard)
export class TwoFactorAuthController {
  constructor(private readonly twoFactorAuthService: TwoFactorAuthService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generar código 2FA',
    description: 'Genera un nuevo código de 6 dígitos y lo envía por email',
  })
  @ApiResponse({
    status: 200,
    description: 'Código generado y enviado exitosamente',
  })
  async generate(@Req() req) {
    const employeeId = req.user.id;
    return this.twoFactorAuthService.generateTwoFactorSecret(employeeId);
  }

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activar 2FA',
    description:
      'Activa 2FA para el empleado actual usando el código de 6 dígitos',
  })
  @ApiResponse({
    status: 200,
    description: '2FA activado exitosamente',
  })
  async enable(@Req() req, @Body() enable2FADto: Enable2FADto) {
    const employeeId = req.user.id;
    return this.twoFactorAuthService.enable2FA(employeeId, enable2FADto.code);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar código 2FA',
    description: 'Verifica el código de 6 dígitos',
  })
  @ApiResponse({
    status: 200,
    description: 'Código verificado exitosamente',
  })
  async verify(@Req() req, @Body() verify2FADto: Verify2FADto) {
    const employeeId = req.user.id;
    return this.twoFactorAuthService.verify2FA(employeeId, verify2FADto.code);
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactivar 2FA',
    description:
      'Desactiva 2FA para el empleado actual usando el código de 6 dígitos',
  })
  @ApiResponse({
    status: 200,
    description: '2FA desactivado exitosamente',
  })
  async disable(@Req() req, @Body() disable2FADto: Disable2FADto) {
    const employeeId = req.user.id;
    return this.twoFactorAuthService.disable2FA(employeeId, disable2FADto.code);
  }
}

