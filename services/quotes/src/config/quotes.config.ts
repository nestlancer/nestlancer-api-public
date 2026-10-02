import { registerAs } from '@nestjs/config';

export default registerAs('quotesService', () => ({
  pdf: {
    templateDir: process.env.PDF_TEMPLATE_DIR || 'src/templates/pdf',
    s3Bucket: process.env.STORAGE_BUCKET_QUOTES || 'nestlancer-quotes-pdfs',
  },
  settings: {
    defaultValidityDays: parseInt(process.env.DEFAULT_QUOTE_VALIDITY_DAYS || '30', 10),
  },
}));
