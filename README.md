# 拾光集

一个给亲友一起看照片、上传回忆、评论互动的小网站，前端使用 `Astro + Vue`，公开数据放在 Supabase，图片放在腾讯云 COS。

## 当前部署方案

- 前端：Vercel 项目，部署仓库根目录
- 后端：Vercel 项目，部署 `vercel-api/`
- 数据库：Supabase
- 图片存储：腾讯云 COS

## 仓库结构

- 根目录：前端站点和 `/admin` 页面
- `vercel-api/`：上传、评论、点赞、后台审核 API
- `supabase/schema.sql`：数据库结构、函数、RLS 策略
- `docs/upload-service.md`：接口和部署说明
- `examples/upload-service-node/`：本地 Node 示例，仅保留作参考，不参与正式部署

## 前端环境变量

把根目录的 `.env.example` 复制成 `.env`，然后填写：

```bash
PUBLIC_SITE_URL=https://shguty.cn
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
PUBLIC_UPLOAD_ENDPOINT=https://api.shguty.cn/api/upload
```

说明：

- `PUBLIC_SITE_URL`：前端正式网址，用于 canonical、分享卡片和绝对资源链接
- `PUBLIC_SUPABASE_URL`：Supabase 项目地址
- `PUBLIC_SUPABASE_ANON_KEY`：前端匿名 key
- `PUBLIC_UPLOAD_ENDPOINT`：后端上传接口完整地址

## 本地开发

前端：

```bash
pnpm install
pnpm dev
```

默认访问 [http://localhost:4321](http://localhost:4321)。

后端本地联调：

```bash
cd vercel-api
npm install
npx vercel dev
```

默认访问 [http://localhost:3000/api/health](http://localhost:3000/api/health)。

## 部署顺序

1. 在 Vercel 新建一个前端项目，根目录使用仓库根目录，绑定 `shguty.cn`
2. 在 Vercel 再新建一个后端项目，Root Directory 选择 `vercel-api`，绑定 `api.shguty.cn`
3. 先给后端项目配置环境变量并成功部署
4. 确认 `https://api.shguty.cn/api/health` 正常返回
5. 再给前端项目配置环境变量并重新部署

## 管理后台

- 后台入口是 `/admin`
- 后台会从 `PUBLIC_UPLOAD_ENDPOINT` 自动推导 API 根地址
- 管理接口必须带 `x-admin-token`
- 新上传照片默认 `is_visible = false`，需要在后台手动公开

## 补充说明

- `vercel-api/README.md` 里有后端项目的单独说明
- `docs/upload-service.md` 里有完整接口和环境变量表
- 生产环境不要把 `.env`、`.env.local`、Vercel 控制台里的密钥提交到 GitHub
