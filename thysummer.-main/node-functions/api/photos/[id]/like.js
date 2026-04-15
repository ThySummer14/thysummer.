import { ApiError } from '../../../../server/edgeone-api/errors.js';
import { assertRequiredEnv } from '../../../../server/edgeone-api/env.js';
import { handleApi, json } from '../../../../server/edgeone-api/response.js';
import { getSupabaseAdmin } from '../../../../server/edgeone-api/supabase.js';

export const onRequestPost = handleApi(async ({ params, env }) => {
  assertRequiredEnv(env);

  const photoId = String(params?.id || '').trim();
  if (!photoId) {
    throw new ApiError(400, 'MISSING_PHOTO_ID');
  }

  const supabaseAdmin = getSupabaseAdmin(env);
  const { data, error } = await supabaseAdmin.rpc('increment_photo_likes', {
    target_photo_id: photoId,
  });

  if (error) {
    throw error;
  }

  const likes = Array.isArray(data) ? data[0]?.likes : data?.likes;
  if (typeof likes !== 'number') {
    throw new ApiError(404, 'PHOTO_NOT_FOUND');
  }

  return json({ likes });
});

export const onRequestOptions = handleApi(async () => new Response(null, { status: 204 }));
