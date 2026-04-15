import { assertRequiredEnv } from '../../_lib/env.js';
import { requireAdmin } from '../../_lib/request.js';
import { assertMethod, sendJson, withApi } from '../../_lib/response.js';
import { supabaseAdmin } from '../../_lib/supabase.js';

export default withApi(async (req, res) => {
  assertMethod(req, 'GET');
  assertRequiredEnv();
  requireAdmin(req);

  const { data, error } = await supabaseAdmin
    .from('photos')
    .select('id, title, author, image_url, likes, is_visible, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  sendJson(res, 200, { photos: data ?? [] });
});
