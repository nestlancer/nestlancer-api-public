import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TracingService } from '../tracing.service';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(private readonly tracing: TracingService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const correlationId = req.headers['x-correlation-id'] || '';
    return this.tracing.run(correlationId, () => next.handle());
  }
}
