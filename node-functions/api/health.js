import { handleApi, json } from '../../server/edgeone-api/response.js';

export const onRequestGet = handleApi(async () =>
  json({
    ok: true,
    runtime: 'edgeone-pages',
  })
);

export const onRequestOptions = handleApi(async () => new Response(null, { status: 204 }));
