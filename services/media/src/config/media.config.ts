export const MediaConfig = {
  S3_PRIVATE_BUCKET: process.env.STORAGE_BUCKET_PRIVATE || 'nestlancer-private',
  S3_PUBLIC_BUCKET: process.env.STORAGE_BUCKET_PUBLIC || 'nestlancer-public',
  CLAMAV_HOST: process.env.CLAMAV_HOST || 'clamav',
  CLAMAV_PORT: parseInt(process.env.CLAMAV_PORT || '3310', 10),
  CDN_DOMAIN: process.env.CDN_DOMAIN || 'cdn.nestlancer.com',
  PRESIGNED_URL_EXPIRY: parseInt(process.env.S3_PRESIGNED_URL_EXPIRY || '900', 10),
};
