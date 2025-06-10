import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from 'src/application/services/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { LoginDto, LoginSmsVerifyDto } from 'src/application/dtos/auth/login.dto'; // LoginSmsVerifyDto was also missing
import { RefreshTokenDto } from 'src/application/dtos/auth/refresh-token.dto';
import { LogoutDto } from 'src/application/dtos/auth/logout.dto';
// AuthenticateEmployeeUseCase import removed as it's not directly used by AuthController


describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;
  // mockAuthenticateEmployeeUseCase removed


  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      verifySmsOtpAndLogin: jest.fn(),
    };

    // mockAuthenticateEmployeeUseCase initialization removed

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        // AuthenticateEmployeeUseCase provider removed
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

    // Define a more complete base mock request object
    const mockRequestBase = {
      headers: { 'user-agent': 'jest-test' },
      ip: '127.0.0.1',
      cookies: {},
      signedCookies: {},
      get: jest.fn(),
      header: jest.fn(),
      accepts: jest.fn(),
      is: jest.fn(),
      params: {},
      query: {},
      body: {},
      method: 'POST',
      url: '/auth/login', // Example URL
      route: { path: '/auth/login' },
      user: null,
      app: {} as any, // Mock app object
      res: {} as any, // Mock res object
      next: jest.fn(), // Mock next function
      aborted: false,
      httpVersion: '1.1',
      httpVersionMajor: 1,
      httpVersionMinor: 1,
      complete: true,
      connection: {} as any,
      socket: {} as any,
      trailers: {},
      rawTrailers: [],
      setTimeout: jest.fn() as any,
      statusCode: 200,
      statusMessage: 'OK',
      destroy: jest.fn(),
      logIn: jest.fn(), // For Passport compatibility
      logOut: jest.fn(),
      isAuthenticated: jest.fn(),
      isUnauthenticated: jest.fn(),
      session: {} as any, // Mock session object
      flash: jest.fn(),
    } as any; // Using 'as any' for brevity in example, can be 'as unknown as Request'

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
      const req = { ...mockRequestBase, body: loginDto, url: '/auth/login', method: 'POST' };

      const result = await controller.login(loginDto, req);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto.email, loginDto.password, req);
    });

    it('should throw UnauthorizedException on login failure', async () => {
      const errorMessage = 'Credenciales inválidas';
      const error = new UnauthorizedException(errorMessage);
      (mockAuthService.login as jest.Mock).mockRejectedValueOnce(error);
      const req = { ...mockRequestBase, body: loginDto, url: '/auth/login', method: 'POST' };

      // En este caso, necesitamos usar un único expect y guardar la promesa para que el test no la resuelva antes de tiempo
      await expect(controller.login(loginDto, req)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refresh_token: 'valid-refresh-token',
    };

    // Define a more complete base mock request object for this context too
    const mockRequestBase = {
      headers: { 'user-agent': 'jest-test' },
      ip: '127.0.0.1',
      cookies: {},
      signedCookies: {},
      get: jest.fn(),
      header: jest.fn(),
      accepts: jest.fn(),
      is: jest.fn(),
      params: {},
      query: {},
      body: {},
      method: 'POST', // Or GET, etc., depending on the test
      url: '/auth/refresh', // Example URL
      route: { path: '/auth/refresh' },
      user: null,
      app: {} as any,
      res: {} as any,
      next: jest.fn(),
      aborted: false,
      httpVersion: '1.1',
      httpVersionMajor: 1,
      httpVersionMinor: 1,
      complete: true,
      connection: {} as any,
      socket: {} as any,
      trailers: {},
      rawTrailers: [],
      setTimeout: jest.fn() as any,
      statusCode: 200,
      statusMessage: 'OK',
      destroy: jest.fn(),
      logIn: jest.fn(),
      logOut: jest.fn(),
      isAuthenticated: jest.fn(),
      isUnauthenticated: jest.fn(),
      session: {} as any,
      flash: jest.fn(),
    } as any;

    const mockResponse = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 900,
      token_type: 'Bearer',
    };

    it('should return new tokens on successful refresh', async () => {
      (mockAuthService.refreshToken as jest.Mock).mockResolvedValueOnce(mockResponse);
      const req = { ...mockRequestBase, body: refreshTokenDto, url: '/auth/refresh', method: 'POST' };


      const result = await controller.refreshToken(refreshTokenDto, req);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshTokenDto.refresh_token, req);
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