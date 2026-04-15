import { ApiError } from '../../_lib/errors.js';
import { assertRequiredEnv } from '../../_lib/env.js';
import { assertMethod, sendJson, withApi } from '../../_lib/response.js';
import { supabaseAdmin } from '../../_lib/supabase.js';

export default withApi(async (req, res) => {
  assertMethod(req, 'POST');
  assertRequiredEnv();

  const photoId = String(req.query.id || '').trim();
  if (!photoId) {
    throw new ApiError(400, 'MISSING_PHOTO_ID');
  }

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

  sendJson(res, 200, { likes });
});
