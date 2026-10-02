import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { ProgressController } from '../../src/controllers/user/progress.controller';
import { ProgressAdminController } from '../../src/controllers/admin/progress.admin.controller';
import { MilestonesAdminController } from '../../src/controllers/admin/milestones.admin.controller';
import { DeliverablesAdminController } from '../../src/controllers/admin/deliverables.admin.controller';
import { MilestoneApprovalsController } from '../../src/controllers/user/milestone-approvals.controller';
import { DeliverableReviewsController } from '../../src/controllers/user/deliverable-reviews.controller';
import { ProgressService } from '../../src/services/progress.service';

function loadDevEnv() {
  const envPath = resolve(__dirname, '../../../../.env.development');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...value] = trimmed.split('=');
      if (key) {
        process.env[key.trim()] = value
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  });
}

describe('AppModule (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'development';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [Reflector],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should resolve user progress controllers', () => {
    const progressController = app.get(ProgressController);
    const milestoneApprovalsController = app.get(MilestoneApprovalsController);
    const deliverableReviewsController = app.get(DeliverableReviewsController);
    expect(progressController).toBeDefined();
    expect(progressController).toBeInstanceOf(ProgressController);
    expect(milestoneApprovalsController).toBeInstanceOf(MilestoneApprovalsController);
    expect(deliverableReviewsController).toBeInstanceOf(DeliverableReviewsController);
  });

  it('should resolve admin progress controllers', () => {
    const progressAdminController = app.get(ProgressAdminController);
    const milestonesAdminController = app.get(MilestonesAdminController);
    const deliverablesAdminController = app.get(DeliverablesAdminController);
    expect(progressAdminController).toBeInstanceOf(ProgressAdminController);
    expect(milestonesAdminController).toBeInstanceOf(MilestonesAdminController);
    expect(deliverablesAdminController).toBeInstanceOf(DeliverablesAdminController);
  });

  it('should resolve ProgressService as dependency of progress controllers', () => {
    const progressService = app.get(ProgressService);
    expect(progressService).toBeDefined();
    expect(progressService).toBeInstanceOf(ProgressService);
  });
});
