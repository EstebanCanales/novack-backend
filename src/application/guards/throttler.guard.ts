import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected errorMessage =
    'Demasiadas solicitudes, por favor intente más tarde';

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ip;
  }
}
