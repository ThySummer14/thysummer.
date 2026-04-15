import crypto from 'node:crypto';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { serverEnv } from './env.js';

const s3Client = new S3Client({
  region: serverEnv.s3Region,
  endpoint: serverEnv.s3Endpoint,
  forcePathStyle: false,
  credentials: {
    accessKeyId: serverEnv.s3AccessKeyId,
    secretAccessKey: serverEnv.s3SecretAccessKey,
  },
});

export const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const maxFileSize = 15 * 1024 * 1024;

const getFileExtension = (mimeType) => {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'bin';
};

export const buildObjectKey = (mimeType) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `photos/${year}/${month}/${crypto.randomUUID()}.${getFileExtension(mimeType)}`;
};

export const uploadImageBuffer = async ({ buffer, mimeType, objectKey }) => {
  const task = new Upload({
    client: s3Client,
    params: {
      Bucket: serverEnv.s3Bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    },
  });

  await task.done();

  return `${serverEnv.publicBaseUrl}/${objectKey}`;
};
