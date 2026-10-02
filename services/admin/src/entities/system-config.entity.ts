export class SystemConfig {
  id: string;
  key: string;
  value: Record<string, any>;
  description?: string | null;
  category: string;
  updatedAt: Date;
  updatedBy: string;
}
