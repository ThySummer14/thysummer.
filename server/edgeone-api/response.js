import { ApiError, isApiError } from './errors.js';
import { readAllowedOrigins } from './env.js';

const defaultJsonHeaders = {
  'Content-Type': 'application/json; charset=UTF-8',
};

const pickAllowedOrigin = (request, env) => {
  const requestOrigin = request.headers.get('origin') || '';
  const allowedOrigins = readAllowedOrigins(env);

  if (allowedOrigins.length === 0) {
    return '*';
  }

  return allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
};

export const withCorsHeaders = (headers, request, env) => {
  const result = new Headers(headers || {});
  result.set('Access-Control-Allow-Origin', pickAllowedOrigin(request, env));
  result.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  result.set('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  result.set('Access-Control-Max-Age', '86400');
  result.set('Vary', 'Origin');
  return result;
};

export const json = (payload, init = {}) =>
  new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      ...defaultJsonHeaders,
      ...(init.headers || {}),
    },
  });

export const handleApi = (handler) => async (context) => {
  const { request, env } = context;

  try {
    const response = await handler(context);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: withCorsHeaders(response.headers, request, env),
    });
  } catch (error) {
    if (isApiError(error)) {
      return new Response(JSON.stringify({ error: error.code }), {
        status: error.status,
        headers: withCorsHeaders(defaultJsonHeaders, request, env),
      });
    }

    console.error('EdgeOne function failed:', error);
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR' }), {
      status: 500,
      headers: withCorsHeaders(defaultJsonHeaders, request, env),
    });
  }
};
