import crypto from 'node:crypto';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const maxFileSize = 6 * 1024 * 1024;

const s3ClientCache = new Map();

const getFileExtension = (mimeType) => {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'bin';
};

const getS3Client = (env) => {
  const cacheKey = [
    env?.S3_REGION,
    env?.S3_ENDPOINT,
    env?.S3_ACCESS_KEY_ID,
    env?.S3_SECRET_ACCESS_KEY,
  ].join('|');

  if (!s3ClientCache.has(cacheKey)) {
    s3ClientCache.set(
      cacheKey,
      new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        forcePathStyle: false,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        },
      })
    );
  }

  return s3ClientCache.get(cacheKey);
};

export const buildObjectKey = (mimeType) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `photos/${year}/${month}/${crypto.randomUUID()}.${getFileExtension(mimeType)}`;
};

export const uploadImageBuffer = async ({ env, buffer, mimeType, objectKey }) => {
  const task = new Upload({
    client: getS3Client(env),
    params: {
      Bucket: env.S3_BUCKET,
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    },
  });

  await task.done();

  return `${String(env.PUBLIC_BASE_URL || '').replace(/\/$/, '')}/${objectKey}`;
};
