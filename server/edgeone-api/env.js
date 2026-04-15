import { ApiError } from './errors.js';

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

export const assertRequiredEnv = (env) => {
  const missingKeys = requiredEnvKeys.filter((key) => !String(env?.[key] || '').trim());
  if (missingKeys.length > 0) {
    throw new ApiError(500, 'MISSING_ENV', `Missing required environment variables: ${missingKeys.join(', ')}`);
  }
};

export const readAllowedOrigins = (env) =>
  String(env?.CORS_ORIGIN || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
