import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, UseInterceptors, UseGuards } from '@nestjs/common';
import request from 'supertest';
import { ResponseSerializerInterceptor } from '../../src/interceptors/response-serializer.interceptor';
import { CacheInterceptor } from '../../src/interceptors/cache.interceptor';
import { ThrottleGuard } from '../../src/guards/throttle.guard';

@Controller('test')
class TestController {
  @Get('serialize')
  @UseInterceptors(ResponseSerializerInterceptor)
  getSerializable() {
    return { id: 1, date: new Date('2023-01-01') };
  }

  @Get('cache')
  @UseInterceptors(CacheInterceptor)
  getCached() {
    return { status: 'ok' };
  }

  @Get('throttle')
  @UseGuards(ThrottleGuard)
  getThrottled() {
    return { status: 'ok' };
  }
}

describe('Middleware Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
      providers: [ResponseSerializerInterceptor, CacheInterceptor, ThrottleGuard],
    }).compile();

    // @ts-ignore
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should serialize response properly', async () => {
    const response = await request(app.getHttpServer()).get('/test/serialize');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 1, date: '2023-01-01T00:00:00.000Z' });
  });

  it('should pass through cache interceptor', async () => {
    const response = await request(app.getHttpServer()).get('/test/cache');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('should pass through throttle guard', async () => {
    const response = await request(app.getHttpServer()).get('/test/throttle');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
