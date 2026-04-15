# Thysummer Vercel API

This folder contains the backend API deployment target for Vercel.

## Deploy shape

- GitHub Pages: frontend only
- Vercel: this `vercel-api` folder only
- Supabase: database
- Tencent COS: image storage

## Routes

- `GET /api/health`
- `POST /api/upload`
- `POST /api/comments`
- `POST /api/photos/:id/like`
- `GET /api/admin/photos`
- `POST /api/admin/photos/:id/visibility`
- `GET /api/admin/comments`
- `POST /api/admin/comments/:id/visibility`

## Environment variables

Copy `.env.example` to `.env.local` for local Vercel development, then fill in all values.

## Local development

```bash
cd vercel-api
npm install
npx vercel dev
```

Open the health check:

```text
http://localhost:3000/api/health
```

When you deploy to Vercel, set the project root directory to `vercel-api`.
