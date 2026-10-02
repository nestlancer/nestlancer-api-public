export class FeatureFlag {
  id: string;
  flag: string;
  enabled: boolean;
  description?: string | null;
  rolloutPercentage?: number | null;
  metadata?: Record<string, any> | null;
  updatedAt: Date;
  updatedBy?: string | null;
}
