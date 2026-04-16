# 上传服务接入约定

当前正式部署方案：

- 前端：Vercel 根项目，对外域名例如 `https://shguty.cn`
- 后端：Vercel `vercel-api` 项目，对外域名例如 `https://api.shguty.cn`
- 数据：Supabase + 腾讯云 COS

## API 路由

- `GET /api/health`
- `POST /api/upload`
- `POST /api/comments`
- `POST /api/photos/:id/like`
- `GET /api/admin/photos`
- `POST /api/admin/photos/:id/visibility`
- `GET /api/admin/comments`
- `POST /api/admin/comments/:id/visibility`

## 上传接口

请求要求：

- 路径：`POST /api/upload`
- Content-Type：`multipart/form-data`
- 文件字段名：`file`
- 额外字段：`title`、`author`

成功返回：

```json
{
  "photo": {
    "id": 1,
    "title": "照片标题",
    "author": "署名",
    "image_url": "https://cdn.example.com/photos/2026/04/your-file.webp",
    "likes": 0,
    "is_visible": false,
    "created_at": "2026-04-15T12:00:00.000Z"
  }
}
```

失败返回：

```json
{
  "error": "INVALID_FILE_TYPE"
}
```

常见错误码：

- `MISSING_FILE`
- `MISSING_FIELDS`
- `INVALID_METADATA`
- `INVALID_FILE_TYPE`
- `FILE_TOO_LARGE`
- `MISSING_ENV`

## 当前限制

- 允许文件类型：`image/jpeg`、`image/png`、`image/webp`、`image/gif`
- 当前上传大小上限：`15MB`
- 新上传照片默认 `is_visible = false`

## 管理后台接口

所有后台接口都要求请求头：

```text
x-admin-token: 你的管理员令牌
```

## 环境变量

前端根目录 `.env`：

```bash
PUBLIC_SITE_URL=https://shguty.cn
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
PUBLIC_UPLOAD_ENDPOINT=https://api.shguty.cn/api/upload
```

Vercel 后端项目环境变量：

```bash
CORS_ORIGIN=https://shguty.cn
ADMIN_TOKEN=replace-with-a-long-random-token
PUBLIC_BASE_URL=https://your-bucket.cos.ap-beijing.myqcloud.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
S3_ENDPOINT=https://cos.ap-beijing.myqcloud.com
S3_REGION=ap-beijing
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=your-secret-id
S3_SECRET_ACCESS_KEY=your-secret-key
```

## 上线前检查

1. `https://api.shguty.cn/api/health` 能正常返回 `{"ok":true}`
2. 前端 `PUBLIC_UPLOAD_ENDPOINT` 已指向线上 API
3. `CORS_ORIGIN` 已填前端正式域名
4. `ADMIN_TOKEN` 已更换成新的随机字符串
5. COS bucket、Supabase service role key、子账号密钥都已经填入 Vercel
