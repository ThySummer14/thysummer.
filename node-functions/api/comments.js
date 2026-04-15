import { ApiError } from '../../server/edgeone-api/errors.js';
import { assertRequiredEnv } from '../../server/edgeone-api/env.js';
import { handleApi, json } from '../../server/edgeone-api/response.js';
import { getSupabaseAdmin } from '../../server/edgeone-api/supabase.js';

export const onRequestPost = handleApi(async ({ request, env }) => {
  assertRequiredEnv(env);

  const body = await request.json().catch(() => {
    throw new ApiError(400, 'INVALID_JSON');
  });

  const photoId = String(body?.photoId || '').trim();
  const nickname = String(body?.nickname || '').trim();
  const content = String(body?.content || '').trim();

  if (!photoId || !nickname || !content) {
    throw new ApiError(400, 'MISSING_FIELDS');
  }

  if (nickname.length > 20 || content.length > 120) {
    throw new ApiError(400, 'INVALID_METADATA');
  }

  const supabaseAdmin = getSupabaseAdmin(env);
  const { data: comment, error } = await supabaseAdmin
    .from('comments')
    .insert([
      {
        photo_id: photoId,
        nickname,
        content,
      },
    ])
    .select()
    .single();

  if (error || !comment) {
    throw error || new ApiError(500, 'COMMENT_FAILED');
  }

  return json({ comment });
});

export const onRequestOptions = handleApi(async () => new Response(null, { status: 204 }));
