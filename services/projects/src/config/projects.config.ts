import { registerAs } from '@nestjs/config';

export default registerAs('projectsService', () => ({
  deliverables: {
    s3Bucket: process.env.STORAGE_BUCKET_DELIVERABLES || 'nestlancer-deliverables',
  },
}));
