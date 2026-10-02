import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { RegisterPushSubscriptionDto } from '../dto/register-push-subscription.dto';

type InMemorySubscription = {
  id: string;
  userId: string;
  endpoint: string;
  createdAt: Date;
};

const inMemorySubscriptions = new Map<string, InMemorySubscription>();

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async register(userId: string, dto: RegisterPushSubscriptionDto) {
    const prismaClient =
      (this.prismaRead as any).pushSubscription || (this.prismaWrite as any).pushSubscription;

    if (!prismaClient) {
      const key = `${userId}:${dto.endpoint}`;
      const existing = inMemorySubscriptions.get(key);
      if (existing) {
        return {
          subscriptionId: existing.id,
          active: true,
          registeredAt: existing.createdAt,
        };
      }

      const now = new Date();
      const sub: InMemorySubscription = {
        id: `sub_${inMemorySubscriptions.size + 1}`,
        userId,
        endpoint: dto.endpoint,
        createdAt: now,
      };
      inMemorySubscriptions.set(key, sub);

      return {
        subscriptionId: sub.id,
        active: true,
        registeredAt: sub.createdAt,
      };
    }

    const existing = await prismaClient.findFirst({
      where: { userId, endpoint: dto.endpoint },
    });

    if (existing) {
      return {
        subscriptionId: existing.id,
        active: true,
        registeredAt: existing.createdAt,
      };
    }

    const sub = await prismaClient.create({
      data: {
        userId,
        endpoint: dto.endpoint,
        p256dhKey: dto.keys.p256dh,
        authKey: dto.keys.auth,
        deviceInfo: dto.deviceInfo ? JSON.parse(dto.deviceInfo) : {},
      },
    });

    return {
      subscriptionId: sub.id,
      active: true,
      registeredAt: sub.createdAt,
    };
  }

  async unregister(userId: string, endpoint: string) {
    const prismaClient =
      (this.prismaWrite as any).pushSubscription || (this.prismaRead as any).pushSubscription;

    if (!prismaClient) {
      const key = `${userId}:${endpoint}`;
      inMemorySubscriptions.delete(key);
    } else {
      await prismaClient.deleteMany({
        where: { userId, endpoint },
      });
    }

    return { success: true };
  }
}
