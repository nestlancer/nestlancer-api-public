import { SystemConfig } from '../entities/system-config.entity';

export interface SystemConfigEntry extends SystemConfig {}

export interface ConfigChangeEvent {
  key: string;
  previousValue: any;
  newValue: any;
  updatedBy: string;
  timestamp: Date;
}
