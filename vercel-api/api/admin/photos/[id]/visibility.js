import { ApiError } from '../../../_lib/errors.js';
import { assertRequiredEnv } from '../../../_lib/env.js';
import { readJsonBody, requireAdmin } from '../../../_lib/request.js';
import { assertMethod, sendJson, withApi } from '../../../_lib/response.js';
import { supabaseAdmin } from '../../../_lib/supabase.js';

export default withApi(async (req, res) => {
  assertMethod(req, 'POST');
  assertRequiredEnv();
  requireAdmin(req);

  const photoId = String(req.query.id || '').trim();
  if (!photoId) {
    throw new ApiError(400, 'MISSING_PHOTO_ID');
  }

  const body = await readJsonBody(req);
  const isVisible = Boolean(body.isVisible);

  const { data, error } = await supabaseAdmin
    .from('photos')
    .update({ is_visible: isVisible })
    .eq('id', photoId)
    .select('id, is_visible')
    .single();

  if (error || !data) {
    throw error || new ApiError(500, 'ADMIN_PHOTO_VISIBILITY_FAILED');
  }

  sendJson(res, 200, { photo: data });
});
