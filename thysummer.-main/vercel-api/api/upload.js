import { ApiError } from './_lib/errors.js';
import { assertRequiredEnv } from './_lib/env.js';
import { parseUploadForm } from './_lib/multipart.js';
import { assertMethod, sendJson, withApi } from './_lib/response.js';
import { allowedMimeTypes, buildObjectKey, maxFileSize, uploadImageBuffer } from './_lib/storage.js';
import { supabaseAdmin } from './_lib/supabase.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default withApi(async (req, res) => {
  assertMethod(req, 'POST');
  assertRequiredEnv();

  const { fields, file } = await parseUploadForm(req, {
    maxFileSize,
    allowedMimeTypes,
  });

  if (!file) {
    throw new ApiError(400, 'MISSING_FILE');
  }

  const title = String(fields.title || '').trim();
  const author = String(fields.author || '').trim();

  if (!title || !author) {
    throw new ApiError(400, 'MISSING_FIELDS');
  }

  if (title.length > 40 || author.length > 20) {
    throw new ApiError(400, 'INVALID_METADATA');
  }

  const objectKey = buildObjectKey(file.mimetype);
  const imageUrl = await uploadImageBuffer({
    buffer: file.buffer,
    mimeType: file.mimetype,
    objectKey,
  });

  const { data: photo, error } = await supabaseAdmin
    .from('photos')
    .insert([
      {
        title,
        author,
        image_url: imageUrl,
        is_visible: false,
      },
    ])
    .select()
    .single();

  if (error || !photo) {
    throw error || new ApiError(500, 'UPLOAD_FAILED');
  }

  sendJson(res, 200, { photo });
});
