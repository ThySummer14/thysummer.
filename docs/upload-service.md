# 上传服务接入约定

当前推荐部署方式：

- 前端：腾讯云 EdgeOne Pages
- 后端：`node-functions`
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

请求：

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

## 重要限制

EdgeOne Pages Node Functions 官方请求体上限为 `6MB`，所以当前项目也按 `6MB` 控制上传大小。

## 管理后台接口

所有后台接口都要求请求头：

```text
x-admin-token: 你的管理员令牌
```

## 环境变量

前端 `.env`：

```bash
PUBLIC_SITE_URL=https://your-edgeone-site.example.com
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
PUBLIC_UPLOAD_ENDPOINT=https://your-edgeone-site.example.com/api/upload
```

平台环境变量：

```bash
CORS_ORIGIN=https://your-edgeone-site.example.com
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
