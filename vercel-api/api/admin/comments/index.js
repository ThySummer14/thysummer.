import { assertRequiredEnv } from '../../_lib/env.js';
import { requireAdmin } from '../../_lib/request.js';
import { assertMethod, sendJson, withApi } from '../../_lib/response.js';
import { supabaseAdmin } from '../../_lib/supabase.js';

export default withApi(async (req, res) => {
  assertMethod(req, 'GET');
  assertRequiredEnv();
  requireAdmin(req);

  const { data, error } = await supabaseAdmin
    .from('comments')
    .select('id, photo_id, nickname, content, is_visible, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  sendJson(res, 200, { comments: data ?? [] });
});
