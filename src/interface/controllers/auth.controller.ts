import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthenticateEmployeeUseCase, AuthenticateEmployeeDto } from '../../application/use-cases/auth/authenticate-employee.use-case';
import { Public } from '../../application/decorators/public.decorator';
import { I18nService, I18nLang } from 'nestjs-i18n';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authenticateEmployeeUseCase: AuthenticateEmployeeUseCase,
    private readonly i18n: I18nService,
  ) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Autenticar empleado' })
  @ApiResponse({ 
    status: 200, 
    description: 'Empleado autenticado correctamente',
    schema: {
      properties: {
        message: { type: 'string' },
        access_token: { type: 'string' },
        employee: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
          },
        },
      },
    }
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() credentials: AuthenticateEmployeeDto, @I18nLang() lang: string) {
    try {
      const authResult = await this.authenticateEmployeeUseCase.execute(credentials);
      return {
        message: this.i18n.t('common.LOGIN_SUCCESS', { lang }),
        ...authResult,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Consider translating this error message as well, or use a generic one.
      // For now, keeping it as is to focus on the success message.
      throw new UnauthorizedException('Error al procesar la autenticación');
    }
  }
}
