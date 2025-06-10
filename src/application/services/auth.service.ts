import { Injectable, UnauthorizedException, Inject, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Employee } from '../../domain/entities';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { IEmployeeRepository } from '../../domain/repositories/employee.repository.interface';
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service';
import { TokenService } from './token.service';
import { SmsService } from './sms.service'; // Import SmsService
// TwoFactorAuthService might be needed if we delegate TOTP check, but not for generating SMS OTP here
// import { TwoFactorAuthService } from './two-factor-auth.service';

@Injectable()
export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = 10;
  private readonly LOCK_TIME_MINUTES = 15;

  constructor(
    @Inject('IEmployeeRepository')
    private readonly employeeRepository: IEmployeeRepository,
    // jwtService might not be directly needed if TokenService handles all JWTs
    // private readonly jwtService: JwtService,
    private readonly logger: StructuredLoggerService,
    private readonly tokenService: TokenService,
    private readonly smsService: SmsService, // Inject SmsService
    // private readonly twoFactorAuthService: TwoFactorAuthService, // If handling TOTP check here
  ) {
    this.logger.setContext('AuthService');
  }

  // Helper for OTP generation
  private generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async login(email: string, password: string, req: Request): Promise<any> { // Return type updated
    // Buscar empleado por correo
    // Ensure findByEmail fetches credentials and phone
    const employee = await this.employeeRepository.findByEmailWithCredentialsAndPhone(email);
    
    if (!employee || !employee.credentials) {
      this.logger.warn('Login failed: Invalid credentials - User not found or no credentials', undefined, JSON.stringify({ email: email }));
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(
      password,
      employee.credentials.password_hash,
    );

    if (!isPasswordValid) {
      this.logger.warn('Login failed: Invalid credentials - Password mismatch', undefined, JSON.stringify({ email: email }));
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar si el correo está verificado
    if (!employee.credentials.is_email_verified) {
      this.logger.warn('Login failed: Email not verified', undefined, JSON.stringify({ email: email }));
      throw new UnauthorizedException('El correo electrónico no ha sido verificado');
    }

    // SMS 2FA Check
    if (employee.credentials.is_sms_2fa_enabled && employee.credentials.phone_number_verified) {
      if (!employee.phone) {
        this.logger.error('SMS 2FA enabled but no phone number for user', undefined, JSON.stringify({ userId: employee.id }));
        // This is an internal configuration error, not a user error.
        throw new InternalServerErrorException('SMS 2FA configuration error for user.');
      }
      const otp = this.generateSixDigitCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5-minute expiry

      this.logger.log('Attempting to send SMS OTP for login', undefined, JSON.stringify({ userId: employee.id, phoneNumber: employee.phone }));
      await this.employeeRepository.updateCredentials(employee.id, {
        sms_otp_code: otp,
        sms_otp_code_expires_at: expiresAt,
      });

      try {
        await this.smsService.sendOtp(employee.phone, otp);
        this.logger.log('SMS OTP sent for login process step', undefined, JSON.stringify({ userId: employee.id })); // Clarified log message
        return {
          message: 'SMS OTP verification required.',
          smsOtpRequired: true,
          userId: employee.id
        };
      } catch (smsError) {
        this.logger.error('Failed to send login OTP SMS via SmsService during login attempt', undefined, JSON.stringify({ userId: employee.id, error: smsError.message }));
        // Depending on policy, could allow login without OTP if SMS fails, or deny.
        // For now, denying by throwing an error.
        throw new InternalServerErrorException('Failed to send login OTP. Please try again.');
      }
    }

    // TODO: Integrate existing TOTP 2FA check here if applicable
    // Example: if (employee.credentials.two_factor_enabled) { /* challenge TOTP */ }
    // If TOTP is also enabled and SMS is not, the flow for TOTP would need to be here.
    // For now, if SMS 2FA is not enabled/triggered, we proceed to token generation.


    // If no SMS 2FA (or other 2FA like TOTP not triggered), proceed with login
    this.logger.log('Login successful (no SMS OTP required or passed), generating tokens...', undefined, JSON.stringify({
      userId: employee.id,
      email: employee.email,
      supplierId: employee.supplier_id,
    }));

    await this.employeeRepository.updateCredentials(employee.id, {
      last_login: new Date(),
    });

    const tokens = await this.tokenService.generateTokens(employee, req);

    return {
      ...tokens,
      employee, // Or a DTO of the employee
      smsOtpRequired: false,
    };
  }

  async verifySmsOtpAndLogin(userId: string, otp: string, req: Request): Promise<any> {
    this.logger.log('Attempting to verify SMS OTP for login completion', undefined, JSON.stringify({ userId }));
    // Ensure findByIdWithCredentialsAndPhone fetches necessary fields
    const employee = await this.employeeRepository.findByIdWithCredentialsAndPhone(userId);

    if (!employee || !employee.credentials) {
      this.logger.warn('SMS OTP login verification failed: Employee or credentials not found', undefined, JSON.stringify({ userId, reason: 'Employee or credentials not found' }));
      throw new UnauthorizedException('Usuario o credenciales no encontradas.');
    }

    const { sms_otp_code: storedOtp, sms_otp_code_expires_at: expiry } = employee.credentials;

    if (!storedOtp || !expiry) {
      this.logger.warn('SMS OTP login verification failed: No OTP pending', undefined, JSON.stringify({ userId, reason: 'No OTP pending or already verified' }));
      throw new UnauthorizedException('No hay código OTP pendiente para este usuario.');
    }

    if (expiry < new Date()) {
      this.logger.warn('SMS OTP login verification failed: OTP has expired', undefined, JSON.stringify({ userId, reason: 'OTP expired' }));
      await this.employeeRepository.updateCredentials(userId, {
        sms_otp_code: null,
        sms_otp_code_expires_at: null,
      });
      throw new UnauthorizedException('El código OTP ha expirado.');
    }

    if (storedOtp !== otp) {
      this.logger.warn('SMS OTP login verification failed: Invalid OTP', undefined, JSON.stringify({ userId, reason: 'Invalid OTP' }));
      // Consider attempt counting / locking mechanism here for security
      throw new UnauthorizedException('Código OTP inválido.');
    }

    // OTP is valid, proceed to log in the user and issue tokens
    await this.employeeRepository.updateCredentials(userId, {
      last_login: new Date(),
      sms_otp_code: null,
      sms_otp_code_expires_at: null,
    });

    const tokens = await this.tokenService.generateTokens(employee, req);
    this.logger.log('SMS OTP verified successfully, login completed', undefined, JSON.stringify({ userId })); // Log after all operations succeed

    return {
      ...tokens,
      employee, // Or a DTO
      message: 'Login successful after SMS OTP verification.',
      smsOtpRequired: false, // Explicitly state it's no longer required
    };
  }

  async refreshToken(refreshTokenValue: string, req: Request) {
    if (!refreshTokenValue) {
      throw new UnauthorizedException('Refresh token is required');
    }
    this.logger.log('Attempting to refresh token', undefined, JSON.stringify({
      // Avoid logging full token for security
      refreshTokenPrefix: refreshTokenValue.substring(0, 10) + '...',
    }));
    try {
      const newTokens = await this.tokenService.refreshAccessToken(refreshTokenValue, req);
      this.logger.log('Token refreshed successfully');
      return newTokens;
    } catch (error) {
      this.logger.warn('Token refresh failed', undefined, JSON.stringify({ error: error.message }));
      throw new UnauthorizedException(error.message || 'Invalid or expired refresh token');
    }
  }

  async logout(refreshTokenValue: string) {
    if (!refreshTokenValue) {
      // Optional: could return true if no token, or throw error if token is expected
      this.logger.warn('Logout attempt without refresh token.');
      return { message: 'No refresh token provided to invalidate.' };
    }
    this.logger.log('Attempting to logout (invalidate refresh token)', undefined, JSON.stringify({
      refreshTokenPrefix: refreshTokenValue.substring(0, 10) + '...',
    }));
    const revoked = await this.tokenService.revokeToken(refreshTokenValue);
    if (revoked) {
      this.logger.log('Refresh token revoked successfully.');
      return { message: 'Logged out successfully' };
    } else {
      this.logger.warn('Failed to revoke refresh token (it may have been invalid or already revoked).');
      // Still return a success-like message to client, as the token is effectively unusable.
      return { message: 'Logout processed; token is invalid or already revoked.' };
    }
  }
}
