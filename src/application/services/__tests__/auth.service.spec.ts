import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth.service';
import { EmployeeService } from '../employee.service';
import { TokenService } from '../token.service';
import { Employee, EmployeeAuth, RefreshToken, Supplier } from '../../../domain/entities';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let mockJwtService: Partial<JwtService>;
  let mockEmployeeService: Partial<EmployeeService>;
  let mockTokenService: Partial<TokenService>;
  let mockEmployeeRepository: Partial<Repository<Employee>>;
  let mockEmployeeAuthRepository: Partial<Repository<EmployeeAuth>>;
  let mockRefreshTokenRepository: Partial<Repository<RefreshToken>>;

  beforeEach(async () => {
    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('test.jwt.token'),
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'test-id' }),
    };

    mockEmployeeService = {
      findByEmail: jest.fn(),
    };

    mockTokenService = {
      generateTokens: jest.fn().mockResolvedValue({
        access_token: 'test.access.token',
        refresh_token: 'test.refresh.token',
        expires_in: 900,
        token_type: 'Bearer',
      }),
      refreshAccessToken: jest.fn().mockResolvedValue({
        access_token: 'new.access.token',
        refresh_token: 'new.refresh.token',
        expires_in: 900,
        token_type: 'Bearer',
      }),
      revokeToken: jest.fn().mockResolvedValue(true),
      validateToken: jest.fn().mockResolvedValue({ sub: 'test-id' }),
    };

    mockEmployeeRepository = {
      findOne: jest.fn(),
    };

    mockEmployeeAuthRepository = {
      save: jest.fn(),
    };

    mockRefreshTokenRepository = {
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmployeeService,
          useValue: mockEmployeeService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepository,
        },
        {
          provide: getRepositoryToken(EmployeeAuth),
          useValue: mockEmployeeAuthRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateEmployee', () => {
    const mockEmail = 'test@example.com';
    const mockPassword = 'password123';
    const mockHashedPassword = 'hashed_password';
    const mockEmployee = {
      id: 'test-id',
      email: mockEmail,
      name: 'Test User',
      phone: '1234567890',
      position: 'Developer',
      department: 'IT',
      profile_image_url: null,
      is_creator: false,
      is_2fa_enabled: false,
      is_email_verified: false,
      login_attempts: 0,
      two_factor_secret: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      auth: {
        password: mockHashedPassword,
        login_attempts: 0,
        locked_until: null,
      },
      supplier: { id: 'supplier-id' } as Supplier,
    };

    beforeEach(() => {
      (bcrypt.compare as jest.Mock).mockReset();
    });

    it('should successfully validate employee credentials', async () => {
      (mockEmployeeService.findByEmail as jest.Mock).mockResolvedValueOnce(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.validateEmployee(mockEmail, mockPassword);

      expect(result.id).toEqual(mockEmployee.id);
      expect(result.email).toEqual(mockEmployee.email);
      expect(result.name).toEqual(mockEmployee.name);
      expect(result.is_creator).toEqual(mockEmployee.is_creator);
      expect(result.supplier).toEqual(mockEmployee.supplier);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      (mockEmployeeService.findByEmail as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.validateEmployee(mockEmail, mockPassword))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      (mockEmployeeService.findByEmail as jest.Mock).mockResolvedValueOnce(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(service.validateEmployee(mockEmail, mockPassword))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for locked account', async () => {
      const lockedEmployee = {
        ...mockEmployee,
        auth: {
          ...mockEmployee.auth,
          locked_until: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes from now
        },
      };
      (mockEmployeeService.findByEmail as jest.Mock).mockResolvedValueOnce(lockedEmployee);

      await expect(service.validateEmployee(mockEmail, mockPassword))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should increment login attempts on failed password', async () => {
      (mockEmployeeService.findByEmail as jest.Mock).mockResolvedValueOnce(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      try {
        await service.validateEmployee(mockEmail, mockPassword);
      } catch (error) {
        expect(mockEmployeeAuthRepository.save).toHaveBeenCalled();
        const saveArg = (mockEmployeeAuthRepository.save as jest.Mock).mock.calls[0][0];
        expect(saveArg.login_attempts).toBeGreaterThan(0);
      }
    });

    it('should lock account after max login attempts', async () => {
      const employeeWithMaxAttempts = {
        ...mockEmployee,
        auth: {
          ...mockEmployee.auth,
          login_attempts: 9, // One less than max
        },
      };
      (mockEmployeeService.findByEmail as jest.Mock).mockResolvedValueOnce(employeeWithMaxAttempts);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      try {
        await service.validateEmployee(mockEmail, mockPassword);
      } catch (error) {
        expect(mockEmployeeAuthRepository.save).toHaveBeenCalled();
        const saveArg = (mockEmployeeAuthRepository.save as jest.Mock).mock.calls[0][0];
        expect(saveArg.login_attempts).toBeGreaterThanOrEqual(10);
        expect(saveArg.locked_until).toBeInstanceOf(Date);
        expect(error).toBeInstanceOf(UnauthorizedException);
      }
    });
  });

  describe('login', () => {
    const mockEmail = 'test@example.com';
    const mockPassword = 'password123';
    const mockEmployee = {
      id: 'test-id',
      email: mockEmail,
      name: 'Test User',
      phone: '1234567890',
      position: 'Developer',
      department: 'IT',
      profile_image_url: null,
      is_creator: false,
      is_2fa_enabled: false,
      is_email_verified: false,
      login_attempts: 0,
      two_factor_secret: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      supplier: { id: 'supplier-id' } as Supplier,
    };
    
    const mockRequest = {
      headers: {
        'user-agent': 'test-user-agent',
      },
      ip: '127.0.0.1',
    } as unknown as Request;

    it('should return access token and employee data on successful login', async () => {
      jest.spyOn(service, 'validateEmployee').mockResolvedValueOnce(mockEmployee);
      
      const tokenResult = {
        access_token: 'test.access.token',
        refresh_token: 'test.refresh.token',
        expires_in: 900,
        token_type: 'Bearer',
      };
      (mockTokenService.generateTokens as jest.Mock).mockResolvedValueOnce(tokenResult);

      const result = await service.login(mockEmail, mockPassword, mockRequest);

      expect(result).toEqual({
        ...tokenResult,
        employee: {
          id: mockEmployee.id,
          name: mockEmployee.name,
          email: mockEmployee.email,
          is_creator: mockEmployee.is_creator,
          supplier: mockEmployee.supplier,
        },
      });
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith(mockEmployee, mockRequest);
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      jest.spyOn(service, 'validateEmployee').mockRejectedValueOnce(new UnauthorizedException());

      await expect(service.login(mockEmail, mockPassword, mockRequest))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    const mockToken = 'valid.refresh.token';
    const mockRequest = {} as Request;
    
    it('should return new tokens', async () => {
      const result = await service.refreshToken(mockToken, mockRequest);
      
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(mockTokenService.refreshAccessToken).toHaveBeenCalledWith(mockToken, mockRequest);
    });
  });
  
  describe('logout', () => {
    const mockToken = 'valid.refresh.token';
    
    it('should revoke the refresh token', async () => {
      const result = await service.logout(mockToken);
      
      expect(result).toBe(true);
      expect(mockTokenService.revokeToken).toHaveBeenCalledWith(mockToken);
    });
  });

  describe('validateToken', () => {
    const mockToken = 'valid.jwt.token';

    it('should return payload for valid token', async () => {
      const mockPayload = { sub: 'test-id' };
      (mockTokenService.validateToken as jest.Mock).mockResolvedValueOnce(mockPayload);

      const result = await service.validateToken(mockToken);

      expect(result).toEqual(mockPayload);
      expect(mockTokenService.validateToken).toHaveBeenCalledWith(mockToken);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      (mockTokenService.validateToken as jest.Mock).mockRejectedValueOnce(new UnauthorizedException());

      await expect(service.validateToken(mockToken))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });
}); 