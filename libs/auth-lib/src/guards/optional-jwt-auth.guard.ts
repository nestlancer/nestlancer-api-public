import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isObservable, lastValueFrom } from 'rxjs';

/**
 * Attempts JWT authentication but never rejects unauthenticated requests.
 * Sets `req.user` when a valid token is present; otherwise leaves it undefined.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const activation = super.canActivate(context);
      if (typeof activation === 'boolean') {
        return activation;
      }
      if (isObservable(activation)) {
        return await lastValueFrom(activation);
      }
      return await activation;
    } catch {
      return true;
    }
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser | null {
    if (err || !user) {
      return null;
    }
    return user;
  }
}
