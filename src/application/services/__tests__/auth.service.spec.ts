import { Test, TestingModule } from '@nestjs/testing'; // Removed duplicate import
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
  let mockEmployeeRepository: jest.Mocked<IEmployeeRepository>;
  let mockTokenService: jest.Mocked<TokenService>; // Ensure all methods called by AuthService are mocked
  let mockLoggerService: jest.Mocked<StructuredLoggerService>; // Ensure all methods called by AuthService are mocked
  let mockSmsService: jest.Mocked<SmsService>; // Ensure all methods called by AuthService are mocked

  // Define a base mock employee at a higher scope
  const baseMockEmployee = {
    id: 'test-id',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    phone: '+1234567890', // Default phone for SMS tests
    position: 'Developer',
    department: 'IT',
    profile_image_url: null,
    is_creator: false,
    supplier_id: 'supplier-id',
    created_at: new Date(),
    updated_at: new Date(),
    cards: [], // Assuming Employee entity has these relations
    chat_rooms: [],
    credentials: {
      id: 'cred-id',
      password_hash: 'hashed_password',
      is_email_verified: true,
      is_sms_2fa_enabled: false,
      phone_number_verified: false, // Default to false
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
      employee_id: 'test-id',
    },
    supplier: { id: 'supplier-id', supplier_name: 'Test Supplier' } as Supplier,
  } as Employee; // Cast to Employee, ensure all required fields are present


  beforeEach(async () => {
    mockEmployeeRepository = {
      // Methods from IEmployeeRepository
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findBySupplier: jest.fn(),
      updateCredentials: jest.fn(),
      findByVerificationToken: jest.fn(),
      findByResetToken: jest.fn(),
      save: jest.fn(),
      // The custom methods like findByEmailWithCredentialsAndPhone are not part of the interface.
      // Tests should rely on the repository implementation to correctly fetch relations if needed.
      // If the test *must* ensure that AuthService receives an employee with specific relations,
      // then the mock for findByEmail/findById should return an object shaped that way.
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
      validateToken: jest.fn(), // Added missing method from TokenService
      revokeAllUserTokens: jest.fn(), // Added missing method from TokenService
      hashToken: jest.fn(), // If this is public, it should be here. Usually private.
    } as jest.Mocked<TokenService>;

    mockLoggerService = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      // Add other methods from StructuredLoggerService if needed
      shouldLog: jest.fn(),
      formatLog: jest.fn(),
      // getContextStorage: jest.fn(), // Static, not part of instance mock
      // createCorrelationId: jest.fn(), // Static
    } as jest.Mocked<StructuredLoggerService>;

    mockSmsService = {
      sendOtp: jest.fn().mockResolvedValue(undefined),
      sendGenericSms: jest.fn(),
      // Add other methods from SmsService if needed
      // twilioClient: jest.fn() as any, // If service accesses this property
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
    // Use a fresh clone of baseMockEmployee for each test to avoid mutation issues
    let currentMockEmployee: Employee;
    beforeEach(() => {
        currentMockEmployee = JSON.parse(JSON.stringify(baseMockEmployee));
    });

    const mockRequest = {
      headers: {
        'user-agent': 'test-user-agent',
      },
      ip: '127.0.0.1',
    } as unknown as Request;

    it('should successfully login a user with correct credentials and no 2FA', async () => {
      mockEmployeeRepository.findByEmail.mockResolvedValue(currentMockEmployee); // Changed to findByEmail
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
      expect(mockEmployeeRepository.findByEmail).toHaveBeenCalledWith(mockEmail); // Changed
      expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, currentMockEmployee.credentials.password_hash);
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith(currentMockEmployee, mockRequest);
      expect(mockEmployeeRepository.updateCredentials).toHaveBeenCalledWith(currentMockEmployee.id, { last_login: expect.any(Date) });
      expect(mockLoggerService.log).toHaveBeenCalledWith('Login successful (no SMS OTP required or passed), generating tokens...', expect.any(Object));
    });

    it('should throw UnauthorizedException if employee not found', async () => {
      mockEmployeeRepository.findByEmail.mockResolvedValue(null); // Changed
      await expect(service.login(mockEmail, mockPassword, mockRequest)).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith('Login failed: Invalid credentials - User not found or no credentials', { email: mockEmail });
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      mockEmployeeRepository.findByEmail.mockResolvedValue(currentMockEmployee); // Changed
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(mockEmail, mockPassword, mockRequest)).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith('Login failed: Invalid credentials - Password mismatch', { email: mockEmail });
    });

    it('should throw UnauthorizedException if email is not verified', async () => {
      currentMockEmployee.credentials.is_email_verified = false;
      mockEmployeeRepository.findByEmail.mockResolvedValue(currentMockEmployee); // Changed
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.login(mockEmail, mockPassword, mockRequest)).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith('Login failed: Email not verified', { email: mockEmail });
    });

    it('should return smsOtpRequired if SMS 2FA is enabled and phone is verified', async () => {
      currentMockEmployee.credentials.is_sms_2fa_enabled = true;
      currentMockEmployee.credentials.phone_number_verified = true;
      currentMockEmployee.phone = '+1234567890'; // Ensure phone is on the employee model directly

      mockEmployeeRepository.findByEmail.mockResolvedValue(currentMockEmployee); // Changed
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockSmsService.sendOtp.mockResolvedValue(undefined);

      const result = await service.login(mockEmail, mockPassword, mockRequest);

      expect(result).toEqual({
        message: 'SMS OTP verification required.',
        smsOtpRequired: true,
        userId: currentMockEmployee.id,
      });
      expect(mockEmployeeRepository.updateCredentials).toHaveBeenCalledWith(currentMockEmployee.id, {
        sms_otp_code: expect.any(String),
        sms_otp_code_expires_at: expect.any(Date),
      });
      expect(mockSmsService.sendOtp).toHaveBeenCalledWith(currentMockEmployee.phone, expect.any(String));
      expect(mockLoggerService.log).toHaveBeenCalledWith('SMS OTP sent for login process step', { userId: currentMockEmployee.id });
    });

    it('should throw InternalServerErrorException if SMS 2FA enabled but no phone number', async () => {
      currentMockEmployee.credentials.is_sms_2fa_enabled = true;
      currentMockEmployee.credentials.phone_number_verified = true;
      currentMockEmployee.phone = null; // No phone

      mockEmployeeRepository.findByEmail.mockResolvedValue(currentMockEmployee); // Changed
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(mockEmail, mockPassword, mockRequest)).rejects.toThrow(InternalServerErrorException);
      expect(mockLoggerService.error).toHaveBeenCalledWith('SMS 2FA enabled but no phone number for user', { userId: currentMockEmployee.id });
    });

    it('should throw InternalServerErrorException if smsService.sendOtp fails', async () => {
      currentMockEmployee.credentials.is_sms_2fa_enabled = true;
      currentMockEmployee.credentials.phone_number_verified = true;
      currentMockEmployee.phone = '+1234567890';

      mockEmployeeRepository.findByEmail.mockResolvedValue(currentMockEmployee); // Changed
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockSmsService.sendOtp.mockRejectedValue(new Error('SMS failed'));

      await expect(service.login(mockEmail, mockPassword, mockRequest)).rejects.toThrow(InternalServerErrorException);
      expect(mockLoggerService.error).toHaveBeenCalledWith('Failed to send login OTP SMS via SmsService during login attempt', { userId: currentMockEmployee.id, error: 'SMS failed' });
    });

  });

  describe('verifySmsOtpAndLogin', () => {
    const mockUserId = 'test-user-id';
    const mockOtp = '123456';
    let mockEmployeeWithOtp: Employee;

    beforeEach(() => {
        mockEmployeeWithOtp = JSON.parse(JSON.stringify(baseMockEmployee));
        mockEmployeeWithOtp.id = mockUserId;
        mockEmployeeWithOtp.credentials.sms_otp_code = mockOtp;
        mockEmployeeWithOtp.credentials.sms_otp_code_expires_at = new Date(Date.now() + 5 * 60 * 1000);
    });


    const mockRequest = {
      headers: { 'user-agent': 'test-user-agent' },
      ip: '127.0.0.1',
    } as unknown as Request;

    it('should successfully verify OTP and login', async () => {
      mockEmployeeRepository.findById.mockResolvedValue(mockEmployeeWithOtp); // Changed
      mockTokenService.generateTokens.mockResolvedValue({
        access_token: 'final.access.token',
        refresh_token: 'final.refresh.token',
        expires_in: 900,
        token_type: 'Bearer',
      });

      const result = await service.verifySmsOtpAndLogin(mockUserId, mockOtp, mockRequest);

      expect(result).toHaveProperty('access_token', 'final.access.token');
      expect(result.employee).toBeDefined();
      expect(mockEmployeeRepository.findById).toHaveBeenCalledWith(mockUserId); // Changed
      expect(mockEmployeeRepository.updateCredentials).toHaveBeenCalledWith(mockUserId, {
        last_login: expect.any(Date),
        sms_otp_code: null,
        sms_otp_code_expires_at: null,
      });
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith(mockEmployeeWithOtp, mockRequest);
      expect(mockLoggerService.log).toHaveBeenCalledWith('SMS OTP verified successfully, login completed', { userId: mockUserId });
    });

    it('should throw UnauthorizedException if employee not found', async () => {
      mockEmployeeRepository.findById.mockResolvedValue(null); // Changed
      await expect(service.verifySmsOtpAndLogin(mockUserId, mockOtp, mockRequest)).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith('SMS OTP login verification failed: Employee or credentials not found', { userId: mockUserId, reason: 'Employee or credentials not found' });
    });

    it('should throw UnauthorizedException if no OTP is pending', async () => {
      if(mockEmployeeWithOtp.credentials) mockEmployeeWithOtp.credentials.sms_otp_code = null;
      mockEmployeeRepository.findById.mockResolvedValue(mockEmployeeWithOtp); // Changed
      await expect(service.verifySmsOtpAndLogin(mockUserId, mockOtp, mockRequest)).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith('SMS OTP login verification failed: No OTP pending', { userId: mockUserId, reason: 'No OTP pending or already verified' });
    });

    it('should throw UnauthorizedException if OTP is expired', async () => {
      if(mockEmployeeWithOtp.credentials) mockEmployeeWithOtp.credentials.sms_otp_code_expires_at = new Date(Date.now() - 1000);
      mockEmployeeRepository.findById.mockResolvedValue(mockEmployeeWithOtp); // Changed
      await expect(service.verifySmsOtpAndLogin(mockUserId, mockOtp, mockRequest)).rejects.toThrow(UnauthorizedException);
      expect(mockEmployeeRepository.updateCredentials).toHaveBeenCalledWith(mockUserId, {
        sms_otp_code: null,
        sms_otp_code_expires_at: null,
      });
      expect(mockLoggerService.warn).toHaveBeenCalledWith('SMS OTP login verification failed: OTP has expired', { userId: mockUserId, reason: 'OTP expired' });
    });

    it('should throw UnauthorizedException for invalid OTP', async () => {
      mockEmployeeRepository.findById.mockResolvedValue(mockEmployeeWithOtp); // Changed
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