import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthenticateEmployeeUseCase, AuthenticateEmployeeDto } from '../../../application/use-cases/auth/authenticate-employee.use-case';
import { I18nService } from 'nestjs-i18n';
import { UnauthorizedException } from '@nestjs/common';
// Remove DTOs not used in the current controller version for login or simplify
// import { LoginDto } from '../../../domain/dtos/auth/login.dto';
// import { RefreshTokenDto } from '../../../domain/dtos/auth/refresh-token.dto';
// import { LogoutDto } from '../../../domain/dtos/auth/logout.dto';


describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthenticateEmployeeUseCase: Partial<AuthenticateEmployeeUseCase>;
  let mockI18nService: Partial<I18nService>;

  beforeEach(async () => {
    mockAuthenticateEmployeeUseCase = {
      execute: jest.fn(),
    };

    mockI18nService = {
      t: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthenticateEmployeeUseCase,
          useValue: mockAuthenticateEmployeeUseCase,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    const loginDto: AuthenticateEmployeeDto = { // Use the correct DTO
      employee_email: 'test@example.com', // Adjusted to AuthenticateEmployeeDto
      employee_password: 'password123',
    };

    const mockAuthResult = { // Result from AuthenticateEmployeeUseCase
      access_token: 'test-token',
      employee: {
        id: 'user-id',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
      },
    };

    it('should return translated message and auth data on successful login', async () => {
      const lang = 'en';
      const translatedMessage = 'Login successful. Welcome!';
      (mockAuthenticateEmployeeUseCase.execute as jest.Mock).mockResolvedValueOnce(mockAuthResult);
      (mockI18nService.t as jest.Mock).mockReturnValueOnce(translatedMessage);

      const result = await controller.login(loginDto, lang);

      expect(mockAuthenticateEmployeeUseCase.execute).toHaveBeenCalledWith(loginDto);
      expect(mockI18nService.t).toHaveBeenCalledWith('common.LOGIN_SUCCESS', { lang });
      expect(result).toEqual({
        message: translatedMessage,
        ...mockAuthResult,
      });
    });

    it('should return translated message in Spanish on successful login', async () => {
      const lang = 'es';
      const translatedMessage = 'Inicio de sesión exitoso. ¡Bienvenido!';
      (mockAuthenticateEmployeeUseCase.execute as jest.Mock).mockResolvedValueOnce(mockAuthResult);
      (mockI18nService.t as jest.Mock).mockReturnValueOnce(translatedMessage);

      const result = await controller.login(loginDto, lang);

      expect(mockAuthenticateEmployeeUseCase.execute).toHaveBeenCalledWith(loginDto);
      expect(mockI18nService.t).toHaveBeenCalledWith('common.LOGIN_SUCCESS', { lang });
      expect(result).toEqual({
        message: translatedMessage,
        ...mockAuthResult,
      });
    });

    it('should throw UnauthorizedException on login failure from use case', async () => {
      const lang = 'en';
      const errorMessage = 'Credenciales inválidas';
      const error = new UnauthorizedException(errorMessage);
      (mockAuthenticateEmployeeUseCase.execute as jest.Mock).mockRejectedValueOnce(error);

      await expect(controller.login(loginDto, lang)).rejects.toThrow(UnauthorizedException);
      expect(mockI18nService.t).not.toHaveBeenCalled(); // Ensure t is not called on failure
    });
  });

  // Other describe blocks for refreshToken and logout can be removed or updated
  // if those methods are not part of the current AuthController or have changed.
  // For this task, focusing only on the login method and i18n.
});