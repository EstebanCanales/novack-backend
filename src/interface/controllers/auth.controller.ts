import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../../application/services/auth.service';
import { LoginDto } from 'src/application/dtos/auth/login.dto';
import { RefreshTokenDto } from 'src/application/dtos/auth/refresh-token.dto';
import { LogoutDto } from 'src/application/dtos/auth/logout.dto';
import { Public } from '../../application/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas',
    type: UnauthorizedException,
  })
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto, @Request() req) {
    return await this.authService.login(loginDto.email, loginDto.password, req);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refrescar token de acceso' })
  @ApiResponse({
    status: 200,
    description: 'Token refrescado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de refresco inválido o expirado',
    type: UnauthorizedException,
  })
  @HttpCode(200)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Request() req) {
    return await this.authService.refreshToken(
      refreshTokenDto.refresh_token,
      req,
    );
  }

  @Post('logout')
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente',
  })
  @HttpCode(200)
  async logout(@Body() logoutDto: LogoutDto) {
    return { success: await this.authService.logout(logoutDto.refresh_token) };
  }
}
