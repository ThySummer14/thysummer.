import { withApi, sendJson } from './_lib/response.js';

export default withApi(async (_req, res) => {
  sendJson(res, 200, {
    ok: true,
    runtime: 'vercel',
  });
});
