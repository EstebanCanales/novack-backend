import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from 'src/application/services/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { LoginDto, LoginSmsVerifyDto } from 'src/application/dtos/auth/login.dto'; // LoginSmsVerifyDto was also missing
import { RefreshTokenDto } from 'src/application/dtos/auth/refresh-token.dto';
import { LogoutDto } from 'src/application/dtos/auth/logout.dto';
// Import AuthenticateEmployeeUseCase if it's a provider in the controller's actual module,
// or if the controller directly depends on it (which it does).
import { AuthenticateEmployeeUseCase } from 'src/application/use-cases/auth/authenticate-employee.use-case';


describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;
  let mockAuthenticateEmployeeUseCase: Partial<AuthenticateEmployeeUseCase>;


  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      verifySmsOtpAndLogin: jest.fn(), // Added for new endpoint
    };

    mockAuthenticateEmployeeUseCase = { // Mock for the use case
        execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        // Provide the mock for AuthenticateEmployeeUseCase
        { provide: AuthenticateEmployeeUseCase, useValue: mockAuthenticateEmployeeUseCase },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockResponse = {
      access_token: 'test-token',
      refresh_token: 'test-refresh-token',
      expires_in: 900,
      token_type: 'Bearer',
      employee: {
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
      },
    };

    it('should return token and employee data on successful login', async () => {
      (mockAuthService.login as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Create a mock request object
      const mockRequest = {
        headers: {
          'user-agent': 'test-user-agent',
        },
        ip: '127.0.0.1',
      };

      const result = await controller.login(loginDto, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto.email, loginDto.password, mockRequest);
    });

    it('should throw UnauthorizedException on login failure', async () => {
      const errorMessage = 'Credenciales inválidas';
      const error = new UnauthorizedException(errorMessage);
      (mockAuthService.login as jest.Mock).mockRejectedValueOnce(error);

      // Create a mock request object
      const mockRequest = {
        headers: {
          'user-agent': 'test-user-agent',
        },
        ip: '127.0.0.1',
      };

      // En este caso, necesitamos usar un único expect y guardar la promesa para que el test no la resuelva antes de tiempo
      await expect(controller.login(loginDto, mockRequest)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refresh_token: 'valid-refresh-token',
    };

    const mockResponse = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 900,
      token_type: 'Bearer',
    };

    it('should return new tokens on successful refresh', async () => {
      (mockAuthService.refreshToken as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Create a mock request object
      const mockRequest = {
        headers: {
          'user-agent': 'test-user-agent',
        },
        ip: '127.0.0.1',
      };

      const result = await controller.refreshToken(refreshTokenDto, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshTokenDto.refresh_token, mockRequest);
    });
  });

  describe('logout', () => {
    const logoutDto: LogoutDto = {
      refresh_token: 'valid-refresh-token',
    };

    it('should successfully logout', async () => {
      (mockAuthService.logout as jest.Mock).mockResolvedValueOnce({ message: 'Logged out successfully' });

      const result = await controller.logout(logoutDto);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockAuthService.logout).toHaveBeenCalledWith(logoutDto.refresh_token);
    });
  });
});