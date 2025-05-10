import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '../auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let mockJwtService: Partial<JwtService>;
  let mockExecutionContext: Partial<ExecutionContext>;
  let mockRequest: any;

  beforeEach(() => {
    mockJwtService = {
      verify: jest.fn(),
    };

    mockRequest = {
      headers: {},
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    };

    guard = new AuthGuard(mockJwtService as JwtService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw an exception when no authorization header is present', async () => {
    let error;
    
    try {
      await guard.canActivate(mockExecutionContext as ExecutionContext);
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(error.message).toBe('Token inválido o expirado');
  });

  it('should throw an exception when authorization header does not start with Bearer', async () => {
    mockRequest.headers.authorization = 'Invalid token';
    
    let error;
    
    try {
      await guard.canActivate(mockExecutionContext as ExecutionContext);
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(error.message).toBe('Token inválido o expirado');
  });

  it('should throw an exception when token is invalid', async () => {
    mockRequest.headers.authorization = 'Bearer invalid.token';
    (mockJwtService.verify as jest.Mock).mockImplementation(() => {
      throw new Error();
    });
    
    let error;
    
    try {
      await guard.canActivate(mockExecutionContext as ExecutionContext);
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(error.message).toBe('Token inválido o expirado');
  });

  it('should return true and set user in request when token is valid', async () => {
    const mockPayload = { sub: 'user-id', email: 'test@example.com' };
    mockRequest.headers.authorization = 'Bearer valid.token';
    (mockJwtService.verify as jest.Mock).mockReturnValue(mockPayload);

    const result = await guard.canActivate(mockExecutionContext as ExecutionContext);

    expect(result).toBe(true);
    expect(mockRequest.user).toEqual(mockPayload);
  });
}); 