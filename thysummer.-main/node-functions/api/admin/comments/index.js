import { assertRequiredEnv } from '../../../../server/edgeone-api/env.js';
import { requireAdmin } from '../../../../server/edgeone-api/request.js';
import { handleApi, json } from '../../../../server/edgeone-api/response.js';
import { getSupabaseAdmin } from '../../../../server/edgeone-api/supabase.js';

export const onRequestGet = handleApi(async ({ request, env }) => {
  assertRequiredEnv(env);
  requireAdmin(request, env);

  const supabaseAdmin = getSupabaseAdmin(env);
  const { data, error } = await supabaseAdmin
    .from('comments')
    .select('id, photo_id, nickname, content, is_visible, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  return json({ comments: data ?? [] });
});

export const onRequestOptions = handleApi(async () => new Response(null, { status: 204 }));
