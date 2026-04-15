import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { supabaseAdmin } from './supabase-client.js';

const requiredEnvKeys = [
  'ADMIN_TOKEN',
  'PUBLIC_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
];

const missingEnv = requiredEnvKeys.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}

const app = express();
const port = Number(process.env.PORT || 8787);
const maxFileSize = 15 * 1024 * 1024;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((item) => item.trim()) : true,
}));
app.use(express.json());

const requireAdmin = (req, res, next) => {
  const token = String(req.headers['x-admin-token'] || '').trim();
  if (!token || token !== process.env.ADMIN_TOKEN) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }
  next();
};

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error('INVALID_FILE_TYPE'));
      return;
    }
    callback(null, true);
  },
});

const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

const getFileExtension = (mimeType) => {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'bin';
};

const buildObjectKey = (mimeType) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const random = crypto.randomUUID();
  return `photos/${year}/${month}/${random}.${getFileExtension(mimeType)}`;
};

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'MISSING_FILE' });
      return;
    }

    const title = String(req.body?.title || '').trim();
    const author = String(req.body?.author || '').trim();
    if (!title || !author) {
      res.status(400).json({ error: 'MISSING_FIELDS' });
      return;
    }

    if (title.length > 40 || author.length > 20) {
      res.status(400).json({ error: 'INVALID_METADATA' });
      return;
    }

    const objectKey = buildObjectKey(req.file.mimetype);
    const task = new Upload({
      client: s3,
      params: {
        Bucket: process.env.S3_BUCKET,
        Key: objectKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      },
    });

    await task.done();

    const publicBaseUrl = process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
    const imageUrl = `${publicBaseUrl}/${objectKey}`;
    const { data: photo, error } = await supabaseAdmin
      .from('photos')
      .insert([{
        title,
        author,
        image_url: imageUrl,
        is_visible: false,
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      photo,
    });
  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).json({ error: 'UPLOAD_FAILED' });
  }
});

app.post('/comments', async (req, res) => {
  try {
    const photoId = String(req.body?.photoId || '').trim();
    const nickname = String(req.body?.nickname || '').trim();
    const content = String(req.body?.content || '').trim();

    if (!photoId || !nickname || !content) {
      res.status(400).json({ error: 'MISSING_FIELDS' });
      return;
    }

    if (nickname.length > 20 || content.length > 120) {
      res.status(400).json({ error: 'INVALID_METADATA' });
      return;
    }

    const { data: comment, error } = await supabaseAdmin
      .from('comments')
      .insert([{
        photo_id: photoId,
        nickname,
        content,
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ comment });
  } catch (error) {
    console.error('Comment failed:', error);
    res.status(500).json({ error: 'COMMENT_FAILED' });
  }
});

app.post('/photos/:id/like', async (req, res) => {
  try {
    const photoId = String(req.params.id || '').trim();
    if (!photoId) {
      res.status(400).json({ error: 'MISSING_PHOTO_ID' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .rpc('increment_photo_likes', { target_photo_id: photoId });

    if (error) {
      throw error;
    }

    const likes = Array.isArray(data) ? data[0]?.likes : data?.likes;
    if (typeof likes !== 'number') {
      res.status(404).json({ error: 'PHOTO_NOT_FOUND' });
      return;
    }

    res.json({ likes });
  } catch (error) {
    console.error('Like failed:', error);
    res.status(500).json({ error: 'LIKE_FAILED' });
  }
});

app.get('/admin/photos', requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('photos')
      .select('id, title, author, image_url, likes, is_visible, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ photos: data ?? [] });
  } catch (error) {
    console.error('Admin photos failed:', error);
    res.status(500).json({ error: 'ADMIN_PHOTOS_FAILED' });
  }
});

app.post('/admin/photos/:id/visibility', requireAdmin, async (req, res) => {
  try {
    const photoId = String(req.params.id || '').trim();
    const isVisible = Boolean(req.body?.isVisible);
    if (!photoId) {
      res.status(400).json({ error: 'MISSING_PHOTO_ID' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('photos')
      .update({ is_visible: isVisible })
      .eq('id', photoId)
      .select('id, is_visible')
      .single();

    if (error || !data) {
      throw error || new Error('PHOTO_VISIBILITY_UPDATE_FAILED');
    }

    res.json({ photo: data });
  } catch (error) {
    console.error('Admin photo visibility failed:', error);
    res.status(500).json({ error: 'ADMIN_PHOTO_VISIBILITY_FAILED' });
  }
});

app.get('/admin/comments', requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .select('id, photo_id, nickname, content, is_visible, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      throw error;
    }

    res.json({ comments: data ?? [] });
  } catch (error) {
    console.error('Admin comments failed:', error);
    res.status(500).json({ error: 'ADMIN_COMMENTS_FAILED' });
  }
});

app.post('/admin/comments/:id/visibility', requireAdmin, async (req, res) => {
  try {
    const commentId = String(req.params.id || '').trim();
    const isVisible = Boolean(req.body?.isVisible);
    if (!commentId) {
      res.status(400).json({ error: 'MISSING_COMMENT_ID' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('comments')
      .update({ is_visible: isVisible })
      .eq('id', commentId)
      .select('id, is_visible')
      .single();

    if (error || !data) {
      throw error || new Error('COMMENT_VISIBILITY_UPDATE_FAILED');
    }

    res.json({ comment: data });
  } catch (error) {
    console.error('Admin comment visibility failed:', error);
    res.status(500).json({ error: 'ADMIN_COMMENT_VISIBILITY_FAILED' });
  }
});

app.use((error, _req, res, _next) => {
  if (error?.message === 'INVALID_FILE_TYPE') {
    res.status(400).json({ error: 'INVALID_FILE_TYPE' });
    return;
  }

  if (error?.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'FILE_TOO_LARGE' });
    return;
  }

  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});

app.listen(port, () => {
  console.log(`Upload service listening on http://localhost:${port}`);
});
