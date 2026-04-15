import { ApiError } from './errors.js';
import { serverEnv } from './env.js';

export const readRawBody = async (req) => {
  if (typeof req.body === 'string') {
    return Buffer.from(req.body);
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (req.body && typeof req.body === 'object') {
    return Buffer.from(JSON.stringify(req.body));
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
};

export const readJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const rawBody = await readRawBody(req);
  if (!rawBody.length) {
    return {};
  }

  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch (_error) {
    throw new ApiError(400, 'INVALID_JSON');
  }
};

export const requireAdmin = (req) => {
  const token = String(req.headers['x-admin-token'] || '').trim();
  if (!token || token !== serverEnv.adminToken) {
    throw new ApiError(401, 'UNAUTHORIZED');
  }
};
