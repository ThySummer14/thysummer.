# 拾光集

一个带有时间感和轻交互氛围的照片回忆站，基于 `Astro + Vue + Supabase` 构建。

## 当前部署结构

- 前端静态站建议部署到腾讯云 EdgeOne Pages
- 数据库存放在 Supabase
- 图片存储使用腾讯云 COS
- 上传、评论、点赞、后台审核接口部署到 `node-functions`

## 前端环境变量

复制根目录的 `.env.example` 为 `.env`，然后填写：

```bash
PUBLIC_SITE_URL=https://your-edgeone-site.example.com
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
PUBLIC_UPLOAD_ENDPOINT=https://your-edgeone-site.example.com/api/upload
```

说明：

- `PUBLIC_SITE_URL` 用于 canonical、Open Graph 等公开元信息
- `PUBLIC_SUPABASE_URL` 和 `PUBLIC_SUPABASE_ANON_KEY` 用于前端读取公开数据
- `PUBLIC_UPLOAD_ENDPOINT` 指向 EdgeOne Pages API 的上传接口

## 本地开发

```bash
pnpm install
pnpm dev
```

默认地址是 [http://localhost:4321](http://localhost:4321)。

如需本地联调 `node-functions`，请先按 EdgeOne 官方文档全局安装 CLI，然后在项目根目录运行：

```bash
edgeone pages dev
```

## 构建前端

```bash
pnpm build
pnpm preview
```

## 后端 API

EdgeOne Pages 后端已经迁移到 `node-functions`。

- `node-functions` 会自动映射到站点根路径下的 API 路由
- 服务端共享逻辑放在 `server/edgeone-api`
- 旧的 `examples/upload-service-node` 与 `vercel-api` 目录保留作参考

## 数据与后台

- Supabase 表结构与策略见 `supabase/schema.sql`
- 上传接口约定见 `docs/upload-service.md`
- 最小后台入口仍然是 `/admin`
- 新上传的照片默认 `is_visible = false`，需要后台审核后才会公开显示
