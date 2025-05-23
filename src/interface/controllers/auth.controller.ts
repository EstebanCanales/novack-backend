import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthenticateEmployeeUseCase, AuthenticateEmployeeDto } from '../../application/use-cases/auth/authenticate-employee.use-case';
import { Public } from '../../application/decorators/public.decorator';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authenticateEmployeeUseCase: AuthenticateEmployeeUseCase
  ) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Autenticar empleado' })
  @ApiResponse({ 
    status: 200, 
    description: 'Empleado autenticado correctamente',
    schema: {
      properties: {
        access_token: { type: 'string' },
        employee: { 
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() credentials: AuthenticateEmployeeDto) {
    try {
      return await this.authenticateEmployeeUseCase.execute(credentials);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Error al procesar la autenticación');
    }
  }
}
