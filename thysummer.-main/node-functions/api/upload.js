import { handleApi, json } from '../../server/edgeone-api/response.js';
import { ApiError } from '../../server/edgeone-api/errors.js';
import { assertRequiredEnv } from '../../server/edgeone-api/env.js';
import { allowedMimeTypes, buildObjectKey, maxFileSize, uploadImageBuffer } from '../../server/edgeone-api/storage.js';
import { getSupabaseAdmin } from '../../server/edgeone-api/supabase.js';

export const onRequestPost = handleApi(async ({ request, env }) => {
  assertRequiredEnv(env);

  const formData = await request.formData();
  const file = formData.get('file');
  const title = String(formData.get('title') || '').trim();
  const author = String(formData.get('author') || '').trim();

  if (!(file instanceof File)) {
    throw new ApiError(400, 'MISSING_FILE');
  }

  if (!title || !author) {
    throw new ApiError(400, 'MISSING_FIELDS');
  }

  if (title.length > 40 || author.length > 20) {
    throw new ApiError(400, 'INVALID_METADATA');
  }

  if (!allowedMimeTypes.has(file.type)) {
    throw new ApiError(400, 'INVALID_FILE_TYPE');
  }

  if (file.size > maxFileSize) {
    throw new ApiError(413, 'FILE_TOO_LARGE');
  }

  const objectKey = buildObjectKey(file.type);
  const imageUrl = await uploadImageBuffer({
    env,
    buffer: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type,
    objectKey,
  });

  const supabaseAdmin = getSupabaseAdmin(env);
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

  return json({ photo });
});

export const onRequestOptions = handleApi(async () => new Response(null, { status: 204 }));
