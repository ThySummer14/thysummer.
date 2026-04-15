# Node Upload Service Example

这是一个最小可跑的上传服务示例，用来对接前端的 `PUBLIC_UPLOAD_ENDPOINT`。

它使用：

- `Express`
- `multer`
- `@aws-sdk/client-s3`
- `@supabase/supabase-js`

因为腾讯云 COS 提供 S3 兼容接口，所以这份示例既可以接 COS，也可以接其他兼容 S3 的对象存储。

## 本地启动

```bash
cd examples/upload-service-node
npm install
cp .env.example .env
npm run dev
```

默认会在 `http://localhost:8787` 启动。

## 前端联调

主站 `.env` 中填写：

```bash
PUBLIC_UPLOAD_ENDPOINT=http://localhost:8787/upload
```

然后重新启动前端开发服务。

现在这个服务会：

- 上传成功后直接写入 `photos` 表，并返回完整的 `photo` 记录
- 处理评论创建
- 处理点赞自增

默认行为：

- 新上传的照片会先以 `is_visible = false` 写入数据库
- 你需要在 `/admin` 后台里审核后再公开显示

## 环境变量说明

- `PORT`: 上传服务端口
- `CORS_ORIGIN`: 允许访问的前端地址，多个地址可用逗号分隔
- `ADMIN_TOKEN`: 后台接口使用的管理员令牌
- `PUBLIC_BASE_URL`: 文件上传成功后返回给前端的公开访问前缀
- `SUPABASE_URL`: Supabase 项目地址
- `SUPABASE_SERVICE_ROLE_KEY`: 仅服务端使用的 Service Role Key
- `S3_ENDPOINT`: 对象存储 Endpoint
- `S3_REGION`: 区域
- `S3_BUCKET`: 存储桶名
- `S3_ACCESS_KEY_ID`: 访问密钥 ID
- `S3_SECRET_ACCESS_KEY`: 访问密钥 Secret

## 腾讯云 COS 示例

```bash
S3_ENDPOINT=https://cos.ap-beijing.myqcloud.com
S3_REGION=ap-beijing
S3_BUCKET=your-bucket-name
PUBLIC_BASE_URL=https://your-bucket-name.cos.ap-beijing.myqcloud.com
```

## 这个示例已经做了什么

- 限制只允许 `jpg/png/webp`
- 限制文件大小不超过 `15MB`
- 自动生成安全文件名
- 校验标题和署名长度
- 上传成功后直接写入 `photos` 表
- 返回前端需要的 `{ "photo": { ... } }` JSON
- 新照片默认写成待公开状态
- 提供 `POST /comments`
- 提供 `POST /photos/:id/like`
- 点赞通过 Supabase RPC 做原子自增
- 提供后台审核接口：
  - `GET /admin/photos`
  - `POST /admin/photos/:id/visibility`
  - `GET /admin/comments`
  - `POST /admin/comments/:id/visibility`

## 你后续还应该补什么

- 请求签名或登录校验
- 上传频率限制
- 图片审核
- 更详细的日志与监控
- 管理端审核与隐藏能力
