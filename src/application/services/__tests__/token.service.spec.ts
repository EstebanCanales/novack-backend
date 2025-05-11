import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../token.service';
import { Employee, RefreshToken } from '../../../domain/entities';
import { UnauthorizedException } from '@nestjs/common';

describe('TokenService', () => {
  let service: TokenService;
  let mockJwtService: Partial<JwtService>;
  let mockConfigService: Partial<ConfigService>;
  let mockRefreshTokenRepository: Partial<Repository<RefreshToken>>;
  let mockEmployeeRepository: Partial<Repository<Employee>>;

  beforeEach(async () => {
    mockJwtService = {
      sign: jest.fn().mockReturnValue('test.jwt.token'),
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'test-id' }),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'test-secret';
          case 'JWT_ACCESS_EXPIRATION':
            return '15m';
          case 'JWT_REFRESH_EXPIRATION_DAYS':
            return '7';
          default:
            return defaultValue;
        }
      }),
    };

    mockRefreshTokenRepository = {
      create: jest.fn().mockImplementation((entity) => entity),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({
        id: 'refresh-token-id',
        ...entity,
      })),
      findOne: jest.fn(),
      update: jest.fn().mockImplementation(() => Promise.resolve({ affected: 1 })),
    };

    mockEmployeeRepository = {
      exists: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepository,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTokens', () => {
    const mockEmployee = {
      id: 'employee-id',
      email: 'test@example.com',
      name: 'Test User',
      is_creator: false,
      supplier: { id: 'supplier-id' },
    } as Employee;

    const mockRequest = {
      headers: {
        'user-agent': 'test-user-agent',
      },
      ip: '127.0.0.1',
    } as any;

    it('should generate access and refresh tokens', async () => {
      const result = await service.generateTokens(mockEmployee, mockRequest);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('expires_in');
      expect(result).toHaveProperty('token_type', 'Bearer');
      
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(mockRefreshTokenRepository.create).toHaveBeenCalled();
      expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
    });
  });

  describe('refreshAccessToken', () => {
    const mockRefreshToken = 'valid-refresh-token';
    const mockStoredToken = {
      id: 'token-id',
      token: 'hashed-token',
      employee_id: 'employee-id',
      is_revoked: false,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day in future
      employee: {
        id: 'employee-id',
        email: 'test@example.com',
      } as Employee,
    };

    beforeEach(() => {
      // Mock the hashToken method without exposing it
      jest.spyOn(service as any, 'hashToken').mockReturnValue('hashed-token');
    });

    it('should refresh tokens when valid refresh token is provided', async () => {
      (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValueOnce(mockStoredToken);
      jest.spyOn(service, 'generateTokens').mockResolvedValueOnce({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 900,
        token_type: 'Bearer',
      });

      const result = await service.refreshAccessToken(mockRefreshToken);

      expect(result).toHaveProperty('access_token', 'new-access-token');
      expect(result).toHaveProperty('refresh_token', 'new-refresh-token');
      expect(mockRefreshTokenRepository.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.refreshAccessToken(mockRefreshToken))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValueOnce({
        ...mockStoredToken,
        is_revoked: true,
      });

      await expect(service.refreshAccessToken(mockRefreshToken))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValueOnce({
        ...mockStoredToken,
        expires_at: new Date(Date.now() - 1000), // Expired token
      });

      await expect(service.refreshAccessToken(mockRefreshToken))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });

  describe('validateToken', () => {
    const mockToken = 'valid.jwt.token';

    it('should return payload for valid token', async () => {
      const mockPayload = { sub: 'test-id' };
      (mockJwtService.verifyAsync as jest.Mock).mockResolvedValueOnce(mockPayload);
      (mockEmployeeRepository.exists as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.validateToken(mockToken);

      expect(result).toEqual(mockPayload);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      (mockJwtService.verifyAsync as jest.Mock).mockRejectedValueOnce(new Error());

      await expect(service.validateToken(mockToken))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user no longer exists', async () => {
      const mockPayload = { sub: 'test-id' };
      (mockJwtService.verifyAsync as jest.Mock).mockResolvedValueOnce(mockPayload);
      (mockEmployeeRepository.exists as jest.Mock).mockResolvedValueOnce(false);

      await expect(service.validateToken(mockToken))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });
}); 