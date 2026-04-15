import { ApiError } from '../../../../../server/edgeone-api/errors.js';
import { assertRequiredEnv } from '../../../../../server/edgeone-api/env.js';
import { requireAdmin } from '../../../../../server/edgeone-api/request.js';
import { handleApi, json } from '../../../../../server/edgeone-api/response.js';
import { getSupabaseAdmin } from '../../../../../server/edgeone-api/supabase.js';

export const onRequestPost = handleApi(async ({ request, params, env }) => {
  assertRequiredEnv(env);
  requireAdmin(request, env);

  const photoId = String(params?.id || '').trim();
  if (!photoId) {
    throw new ApiError(400, 'MISSING_PHOTO_ID');
  }

  const body = await request.json().catch(() => {
    throw new ApiError(400, 'INVALID_JSON');
  });
  const isVisible = Boolean(body?.isVisible);

  const supabaseAdmin = getSupabaseAdmin(env);
  const { data, error } = await supabaseAdmin
    .from('photos')
    .update({ is_visible: isVisible })
    .eq('id', photoId)
    .select('id, is_visible')
    .single();

  if (error || !data) {
    throw error || new ApiError(500, 'ADMIN_PHOTO_VISIBILITY_FAILED');
  }

  return json({ photo: data });
});

export const onRequestOptions = handleApi(async () => new Response(null, { status: 204 }));
