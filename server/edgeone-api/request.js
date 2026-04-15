import { ApiError } from './errors.js';

export const requireAdmin = (request, env) => {
  const token = String(request.headers.get('x-admin-token') || '').trim();
  if (!token || token !== String(env?.ADMIN_TOKEN || '').trim()) {
    throw new ApiError(401, 'UNAUTHORIZED');
  }
};
