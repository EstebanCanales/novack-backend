import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from '../auth.controller';
import { AuthService } from '../../../application/services/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    validateToken: jest.fn(),
  };

  const mockEmployee = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    is_creator: true,
    supplier: null,
  };

  const mockLoginResponse = {
    access_token: 'mock.jwt.token',
    employee: mockEmployee,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return access token and employee data on successful login', async () => {
      // Preparar
      const loginDto = {
        email: 'juan@example.com',
        password: 'password123',
      };
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      // Ejecutar
      const result = await controller.login(loginDto);

      // Verificar
      expect(result).toEqual(mockLoginResponse);
      expect(authService.login).toHaveBeenCalledWith(loginDto.email, loginDto.password);
    });

    it('should propagate UnauthorizedException from auth service', async () => {
      // Preparar
      const loginDto = {
        email: 'juan@example.com',
        password: 'wrongPassword',
      };
      const errorMessage = 'Credenciales inválidas';
      mockAuthService.login.mockRejectedValue(new UnauthorizedException(errorMessage));

      // Ejecutar y verificar
      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(controller.login(loginDto)).rejects.toThrow(errorMessage);
      expect(authService.login).toHaveBeenCalledWith(loginDto.email, loginDto.password);
    });

    it('should transform other errors into UnauthorizedException', async () => {
      // Preparar
      const loginDto = {
        email: 'juan@example.com',
        password: 'password123',
      };
      mockAuthService.login.mockRejectedValue(new Error('Database error'));

      // Ejecutar y verificar
      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(controller.login(loginDto)).rejects.toThrow('Error al iniciar sesión');
      expect(authService.login).toHaveBeenCalledWith(loginDto.email, loginDto.password);
    });
  });
}); 