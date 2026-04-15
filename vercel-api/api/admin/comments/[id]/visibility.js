import { ApiError } from '../../../_lib/errors.js';
import { assertRequiredEnv } from '../../../_lib/env.js';
import { readJsonBody, requireAdmin } from '../../../_lib/request.js';
import { assertMethod, sendJson, withApi } from '../../../_lib/response.js';
import { supabaseAdmin } from '../../../_lib/supabase.js';

export default withApi(async (req, res) => {
  assertMethod(req, 'POST');
  assertRequiredEnv();
  requireAdmin(req);

  const commentId = String(req.query.id || '').trim();
  if (!commentId) {
    throw new ApiError(400, 'MISSING_COMMENT_ID');
  }

  const body = await readJsonBody(req);
  const isVisible = Boolean(body.isVisible);

  const { data, error } = await supabaseAdmin
    .from('comments')
    .update({ is_visible: isVisible })
    .eq('id', commentId)
    .select('id, is_visible')
    .single();

  if (error || !data) {
    throw error || new ApiError(500, 'ADMIN_COMMENT_VISIBILITY_FAILED');
  }

  sendJson(res, 200, { comment: data });
});
