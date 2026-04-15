import { ApiError, isApiError } from './errors.js';
import { serverEnv } from './env.js';

const defaultAllowedMethods = 'GET,POST,OPTIONS';

const pickAllowedOrigin = (requestOrigin) => {
  const allowedOrigins = serverEnv.corsOrigins;
  if (allowedOrigins.length === 0) {
    return '*';
  }

  if (!requestOrigin) {
    return allowedOrigins[0];
  }

  return allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
};

export const setCorsHeaders = (req, res) => {
  const allowedOrigin = pickAllowedOrigin(req.headers.origin);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', defaultAllowedMethods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
};

export const sendJson = (res, status, payload) => {
  res.status(status).json(payload);
};

export const handleOptionsRequest = (req, res) => {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
};

export const assertMethod = (req, ...methods) => {
  if (!methods.includes(req.method)) {
    throw new ApiError(405, 'METHOD_NOT_ALLOWED');
  }
};

export const sendError = (req, res, error) => {
  setCorsHeaders(req, res);

  if (error?.status === 405) {
    res.setHeader('Allow', defaultAllowedMethods);
  }

  if (isApiError(error)) {
    res.status(error.status).json({ error: error.code });
    return;
  }

  console.error('API route failed:', error);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
};

export const withApi = (handler) => async (req, res) => {
  if (handleOptionsRequest(req, res)) {
    return;
  }

  try {
    await handler(req, res);
  } catch (error) {
    sendError(req, res, error);
  }
};
