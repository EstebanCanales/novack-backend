import { Test, TestingModule } from '@nestjs/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { TokenService } from '../token.service';
import { Employee, Supplier } from 'src/domain/entities'; // RefreshToken and EmployeeAuth removed
import { IEmployeeRepository } from 'src/domain/repositories/employee.repository.interface';
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service';
import { SmsService } from '../sms.service'; // Added SmsService
import { UnauthorizedException, InternalServerErrorException } from '@nestjs/common'; // Added InternalServerErrorException
import * as bcrypt from 'bcrypt';
import { Request } from 'express';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let mockEmployeeRepository: jest.Mocked<IEmployeeRepository>; // Use jest.Mocked for typed mocks
  let mockTokenService: jest.Mocked<TokenService>;
  let mockLoggerService: jest.Mocked<StructuredLoggerService>;
  let mockSmsService: jest.Mocked<SmsService>;

  beforeEach(async () => {
    // Removed mockJwtService, mockEmployeeService, mockEmployeeAuthRepository, mockRefreshTokenRepository

    mockEmployeeRepository = {
      findByEmailWithCredentialsAndPhone: jest.fn(),
      findByIdWithCredentialsAndPhone: jest.fn(),
      updateCredentials: jest.fn(),
      // Add other IEmployeeRepository methods if AuthService uses them directly
      create: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findBySupplier: jest.fn(),
      findByVerificationToken: jest.fn(),
      findByResetToken: jest.fn(),
      save: jest.fn(), // Ensure all methods from interface are present
    } as jest.Mocked<IEmployeeRepository>;

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
      // validateToken is part of TokenService, not directly on AuthService spec's mockTokenService for AuthService's own methods
      // If TokenService.validateToken is called by AuthService, it should be mocked on mockTokenService.
      // For now, assuming AuthService doesn't directly call validateToken itself.
    } as jest.Mocked<TokenService>;

    mockLoggerService = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as jest.Mocked<StructuredLoggerService>;

    mockSmsService = {
      sendOtp: jest.fn().mockResolvedValue(undefined),
      // Add other SmsService methods if used by AuthService
      sendGenericSms: jest.fn(),
    } as jest.Mocked<SmsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'IEmployeeRepository', // Use the injection token
          useValue: mockEmployeeRepository,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: StructuredLoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
        // Removed JwtService, EmployeeService, getRepositoryToken(Employee),
        // getRepositoryToken(EmployeeAuth), getRepositoryToken(RefreshToken)
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Removed describe('validateEmployee') block
  // Removed describe('validateToken') block

  describe('login', () => {
    const mockEmail = 'test@example.com';
    const mockPassword = 'password123';
    const mockEmployee = {
      id: 'test-id',
      email: mockEmail,
      // These will be replaced with first_name, last_name and credentials structure
      first_name: 'Test',
      last_name: 'User',
      phone: '1234567890',
      position: 'Developer',
      department: 'IT',
      profile_image_url: null,
      is_creator: false,
      supplier_id: 'supplier-id', // Added supplier_id
      credentials: { // Added credentials
        id: 'cred-id',
        password_hash: 'hashed_password', // Example, will be used by bcrypt.compare mock
        is_email_verified: true, // Assuming verified for basic login tests
        is_sms_2fa_enabled: false,
        phone_number_verified: false,
        sms_otp_code: null,
        sms_otp_code_expires_at: null,
        two_factor_secret: null,
        two_factor_enabled: false,
        login_attempts: 0,
        locked_until: null,
        last_login: null,
        verification_token: null,
        verification_token_expires_at: null,
        reset_password_token: null,
        reset_password_token_expires_at: null,
        backup_codes: [],
      },
      supplier: { id: 'supplier-id' } as Supplier, // Keep supplier object if needed for token generation
      // Remove fields not directly on Employee if they were part of old mock structure
      // is_2fa_enabled, login_attempts, two_factor_secret are now on credentials
    } as unknown as Employee; // Cast to Employee, ensure all required fields are present or mock is Partial

    const mockRequest = {
      headers: {
        'user-agent': 'test-user-agent',
      },
      ip: '127.0.0.1',
    } as unknown as Request;

    // Test cases for login will be added here in next steps
    // For now, just ensuring the describe block is present.
    it('should successfully login a user with correct credentials and no 2FA', async () => {
      mockEmployeeRepository.findByEmailWithCredentialsAndPhone.mockResolvedValue(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockTokenService.generateTokens.mockResolvedValue({
        access_token: 'new.access.token',
        refresh_token: 'new.refresh.token',
        expires_in: 900,
        token_type: 'Bearer',
      });

      const result = await service.login(mockEmail, mockPassword, mockRequest);

      expect(result).toHaveProperty('access_token', 'new.access.token');
      expect(result.employee).toBeDefined();
      expect(mockEmployeeRepository.findByEmailWithCredentialsAndPhone).toHaveBeenCalledWith(mockEmail);
      expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, mockEmployee.credentials.password_hash);
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith(mockEmployee, mockRequest);
      expect(mockEmployeeRepository.updateCredentials).toHaveBeenCalledWith(mockEmployee.id, { last_login: expect.any(Date) });
      expect(mockLoggerService.log).toHaveBeenCalledWith('Login successful (no SMS OTP required or passed), generating tokens...', expect.any(Object));
    });

    it('should throw UnauthorizedException if employee not found', async () => {
      mockEmployeeRepository.findByEmailWithCredentialsAndPhone.mockResolvedValue(null);
      await expect(service.login(mockEmail, mockPassword, mockRequest)).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith('Login failed: Invalid credentials - User not found or no credentials', { email: mockEmail });
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      mockEmployeeRepository.findByEmailWithCredentialsAndPhone.mockResolvedValue(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(mockEmail, mockPassword, mockRequest)).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith('Login failed: Invalid credentials - Password mismatch', { email: mockEmail });
    });

    it('should throw UnauthorizedException if email is not verified', async () => {
      const unverifiedEmployee = { ...mockEmployee, credentials: { ...mockEmployee.credentials, is_email_verified: false } };
      mockEmployeeRepository.findByEmailWithCredentialsAndPhone.mockResolvedValue(unverifiedEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.login(mockEmail, mockPassword, mockRequest)).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith('Login failed: Email not verified', { email: mockEmail });
    });

    it('should return smsOtpRequired if SMS 2FA is enabled and phone is verified', async () => {
      const smsEmployee = {
        ...mockEmployee,
        phone: '+1234567890', // Ensure phone is present
        credentials: {
          ...mockEmployee.credentials,
          is_sms_2fa_enabled: true,
          phone_number_verified: true,
        },
      };
      mockEmployeeRepository.findByEmailWithCredentialsAndPhone.mockResolvedValue(smsEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockSmsService.sendOtp.mockResolvedValue(undefined); // Assume SMS sends successfully

      const result = await service.login(mockEmail, mockPassword, mockRequest);

      expect(result).toEqual({
        message: 'SMS OTP verification required.',
        smsOtpRequired: true,
        userId: smsEmployee.id,
      });
      expect(mockEmployeeRepository.updateCredentials).toHaveBeenCalledWith(smsEmployee.id, {
        sms_otp_code: expect.any(String),
        sms_otp_code_expires_at: expect.any(Date),
      });
      expect(mockSmsService.sendOtp).toHaveBeenCalledWith(smsEmployee.phone, expect.any(String));
      expect(mockLoggerService.log).toHaveBeenCalledWith('SMS OTP sent for login process step', { userId: smsEmployee.id });
    });

    it('should throw InternalServerErrorException if SMS 2FA enabled but no phone number', async () => {
      const smsEmployeeNoPhone = {
        ...mockEmployee,
        phone: null, // No phone number
        credentials: {
          ...mockEmployee.credentials,
          is_sms_2fa_enabled: true,
          phone_number_verified: true, // Even if phone_number_verified is true (which would be inconsistent data)
        },
      };
      mockEmployeeRepository.findByEmailWithCredentialsAndPhone.mockResolvedValue(smsEmployeeNoPhone);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(mockEmail, mockPassword, mockRequest)).rejects.toThrow(InternalServerErrorException);
      expect(mockLoggerService.error).toHaveBeenCalledWith('SMS 2FA enabled but no phone number for user', { userId: smsEmployeeNoPhone.id });
    });

    it('should throw InternalServerErrorException if smsService.sendOtp fails', async () => {
      const smsEmployee = {
        ...mockEmployee,
        phone: '+1234567890',
        credentials: {
          ...mockEmployee.credentials,
          is_sms_2fa_enabled: true,
          phone_number_verified: true,
        },
      };
      mockEmployeeRepository.findByEmailWithCredentialsAndPhone.mockResolvedValue(smsEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockSmsService.sendOtp.mockRejectedValue(new Error('SMS failed'));

      await expect(service.login(mockEmail, mockPassword, mockRequest)).rejects.toThrow(InternalServerErrorException);
      expect(mockLoggerService.error).toHaveBeenCalledWith('Failed to send login OTP SMS via SmsService during login attempt', { userId: smsEmployee.id, error: 'SMS failed' });
    });

  });

  describe('verifySmsOtpAndLogin', () => {
    const mockUserId = 'test-user-id';
    const mockOtp = '123456';
    const mockEmployeeWithOtp = {
      ...mockEmployee, // Use a base mockEmployee structure
      id: mockUserId,
      credentials: {
        ...mockEmployee.credentials,
        sms_otp_code: mockOtp,
        sms_otp_code_expires_at: new Date(Date.now() + 5 * 60 * 1000), // Expires in 5 mins
      },
    } as unknown as Employee; // Cast needed due to partial nature of mockEmployee base

    const mockRequest = {
      headers: { 'user-agent': 'test-user-agent' },
      ip: '127.0.0.1',
    } as unknown as Request;

    it('should successfully verify OTP and login', async () => {
      mockEmployeeRepository.findByIdWithCredentialsAndPhone.mockResolvedValue(mockEmployeeWithOtp);
      mockTokenService.generateTokens.mockResolvedValue({
        access_token: 'final.access.token',
        refresh_token: 'final.refresh.token',
        expires_in: 900,
        token_type: 'Bearer',
      });

      const result = await service.verifySmsOtpAndLogin(mockUserId, mockOtp, mockRequest);

      expect(result).toHaveProperty('access_token', 'final.access.token');
      expect(result.employee).toBeDefined();
      expect(mockEmployeeRepository.findByIdWithCredentialsAndPhone).toHaveBeenCalledWith(mockUserId);
      expect(mockEmployeeRepository.updateCredentials).toHaveBeenCalledWith(mockUserId, {
        last_login: expect.any(Date),
        sms_otp_code: null,
        sms_otp_code_expires_at: null,
      });
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith(mockEmployeeWithOtp, mockRequest);
      expect(mockLoggerService.log).toHaveBeenCalledWith('SMS OTP verified successfully, login completed', { userId: mockUserId });
    });

    it('should throw UnauthorizedException if employee not found', async () => {
      mockEmployeeRepository.findByIdWithCredentialsAndPhone.mockResolvedValue(null);
      await expect(service.verifySmsOtpAndLogin(mockUserId, mockOtp, mockRequest)).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith('SMS OTP login verification failed: Employee or credentials not found', { userId: mockUserId, reason: 'Employee or credentials not found' });
    });

    it('should throw UnauthorizedException if no OTP is pending', async () => {
      const employeeNoOtp = { ...mockEmployeeWithOtp, credentials: { ...mockEmployeeWithOtp.credentials, sms_otp_code: null } };
      mockEmployeeRepository.findByIdWithCredentialsAndPhone.mockResolvedValue(employeeNoOtp);
      await expect(service.verifySmsOtpAndLogin(mockUserId, mockOtp, mockRequest)).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith('SMS OTP login verification failed: No OTP pending', { userId: mockUserId, reason: 'No OTP pending or already verified' });
    });

    it('should throw UnauthorizedException if OTP is expired', async () => {
      const employeeExpiredOtp = {
        ...mockEmployeeWithOtp,
        credentials: { ...mockEmployeeWithOtp.credentials, sms_otp_code_expires_at: new Date(Date.now() - 1000) },
      };
      mockEmployeeRepository.findByIdWithCredentialsAndPhone.mockResolvedValue(employeeExpiredOtp);
      await expect(service.verifySmsOtpAndLogin(mockUserId, mockOtp, mockRequest)).rejects.toThrow(UnauthorizedException);
      expect(mockEmployeeRepository.updateCredentials).toHaveBeenCalledWith(mockUserId, {
        sms_otp_code: null,
        sms_otp_code_expires_at: null,
      });
      expect(mockLoggerService.warn).toHaveBeenCalledWith('SMS OTP login verification failed: OTP has expired', { userId: mockUserId, reason: 'OTP expired' });
    });

    it('should throw UnauthorizedException for invalid OTP', async () => {
      mockEmployeeRepository.findByIdWithCredentialsAndPhone.mockResolvedValue(mockEmployeeWithOtp);
      await expect(service.verifySmsOtpAndLogin(mockUserId, 'wrong-otp', mockRequest)).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith('SMS OTP login verification failed: Invalid OTP', { userId: mockUserId, reason: 'Invalid OTP' });
    });
  });

  describe('refreshToken', () => {
    const mockToken = 'valid.refresh.token';
    const mockRequest = {} as Request; // Minimal request object
    
    it('should return new tokens', async () => {
      mockTokenService.refreshAccessToken.mockResolvedValue({
        access_token: 'refreshed.access.token',
        refresh_token: 'refreshed.refresh.token',
        expires_in: 900,
        token_type: 'Bearer',
      });
      const result = await service.refreshToken(mockToken, mockRequest);
      
      expect(result).toHaveProperty('access_token', 'refreshed.access.token');
      expect(mockTokenService.refreshAccessToken).toHaveBeenCalledWith(mockToken, mockRequest);
      expect(mockLoggerService.log).toHaveBeenCalledWith('Token refreshed successfully');
    });
  });
  
  describe('logout', () => {
    const mockToken = 'valid.refresh.token';
    
    it('should call tokenService.revokeToken and log success', async () => {
      mockTokenService.revokeToken.mockResolvedValue(true);
      const result = await service.logout(mockToken);
      
      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockTokenService.revokeToken).toHaveBeenCalledWith(mockToken);
      expect(mockLoggerService.log).toHaveBeenCalledWith('Refresh token revoked successfully.');
    });

    it('should handle token already revoked or invalid', async () => {
      mockTokenService.revokeToken.mockResolvedValue(false);
      const result = await service.logout(mockToken);

      expect(result).toEqual({ message: 'Logout processed; token is invalid or already revoked.' });
      expect(mockLoggerService.warn).toHaveBeenCalledWith('Failed to revoke refresh token (it may have been invalid or already revoked).');
    });
  });

  // validateToken tests are removed as AuthService no longer has this method directly
}); 