import { ApiError } from './errors.js';

const getEnv = (key) => {
  const value = process.env[key];
  return typeof value === 'string' ? value.trim() : '';
};

export const requiredEnvKeys = [
  'ADMIN_TOKEN',
  'PUBLIC_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
];

export const assertRequiredEnv = () => {
  const missingKeys = requiredEnvKeys.filter((key) => !getEnv(key));
  if (missingKeys.length > 0) {
    throw new ApiError(500, 'MISSING_ENV', `Missing required environment variables: ${missingKeys.join(', ')}`);
  }
};

export const serverEnv = {
  get adminToken() {
    return getEnv('ADMIN_TOKEN');
  },
  get corsOrigins() {
    return getEnv('CORS_ORIGIN')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  },
  get publicBaseUrl() {
    return getEnv('PUBLIC_BASE_URL').replace(/\/$/, '');
  },
  get supabaseUrl() {
    return getEnv('SUPABASE_URL');
  },
  get supabaseServiceRoleKey() {
    return getEnv('SUPABASE_SERVICE_ROLE_KEY');
  },
  get s3Endpoint() {
    return getEnv('S3_ENDPOINT');
  },
  get s3Region() {
    return getEnv('S3_REGION');
  },
  get s3Bucket() {
    return getEnv('S3_BUCKET');
  },
  get s3AccessKeyId() {
    return getEnv('S3_ACCESS_KEY_ID');
  },
  get s3SecretAccessKey() {
    return getEnv('S3_SECRET_ACCESS_KEY');
  },
};
