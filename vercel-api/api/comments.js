import { ApiError } from './_lib/errors.js';
import { assertRequiredEnv } from './_lib/env.js';
import { readJsonBody } from './_lib/request.js';
import { assertMethod, sendJson, withApi } from './_lib/response.js';
import { supabaseAdmin } from './_lib/supabase.js';

export default withApi(async (req, res) => {
  assertMethod(req, 'POST');
  assertRequiredEnv();

  const body = await readJsonBody(req);
  const photoId = String(body.photoId || '').trim();
  const nickname = String(body.nickname || '').trim();
  const content = String(body.content || '').trim();

  if (!photoId || !nickname || !content) {
    throw new ApiError(400, 'MISSING_FIELDS');
  }

  if (nickname.length > 20 || content.length > 120) {
    throw new ApiError(400, 'INVALID_METADATA');
  }

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

  sendJson(res, 200, { comment });
});
