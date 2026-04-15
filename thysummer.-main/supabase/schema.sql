-- 拾光集 - 推荐的 Supabase 表结构与基础策略
-- 执行前请先在 Supabase SQL Editor 中确认你使用的是 public schema。

create extension if not exists pgcrypto;

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 40),
  author text not null check (char_length(author) between 1 and 20),
  image_url text not null,
  likes integer not null default 0 check (likes >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  content text not null check (char_length(content) between 1 and 120),
  is_visible boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists photos_created_at_idx on public.photos (created_at desc);
create index if not exists photos_visible_created_at_idx on public.photos (is_visible, created_at desc);
create index if not exists comments_photo_id_created_at_idx on public.comments (photo_id, created_at asc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.increment_photo_likes(target_photo_id uuid)
returns table (likes integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.photos
  set likes = photos.likes + 1
  where photos.id = target_photo_id
    and photos.is_visible = true
  returning photos.likes;
end;
$$;

drop trigger if exists photos_set_updated_at on public.photos;
create trigger photos_set_updated_at
before update on public.photos
for each row
execute function public.set_updated_at();

alter table public.photos enable row level security;
alter table public.comments enable row level security;

drop policy if exists "photos_are_publicly_readable" on public.photos;
create policy "photos_are_publicly_readable"
on public.photos
for select
to anon, authenticated
using (is_visible = true);

drop policy if exists "comments_are_publicly_readable" on public.comments;
create policy "comments_are_publicly_readable"
on public.comments
for select
to anon, authenticated
using (
  is_visible = true
  and exists (
    select 1
    from public.photos
    where photos.id = comments.photo_id
      and photos.is_visible = true
  )
);

-- 如果你暂时还没有登录体系，可以先开放匿名写入，
-- 但建议尽快迁移到“仅服务端角色可写”或“登录用户可写”。
drop policy if exists "allow_public_photo_insert" on public.photos;
create policy "allow_public_photo_insert"
on public.photos
for insert
to anon, authenticated
with check (
  is_visible = true
  and char_length(title) between 1 and 40
  and char_length(author) between 1 and 20
  and image_url ~ '^https://'
  and likes = 0
);

drop policy if exists "allow_public_comment_insert" on public.comments;
create policy "allow_public_comment_insert"
on public.comments
for insert
to anon, authenticated
with check (
  is_visible = true
  and char_length(nickname) between 1 and 20
  and char_length(content) between 1 and 120
  and exists (
    select 1
    from public.photos
    where photos.id = comments.photo_id
      and photos.is_visible = true
  )
);

-- 如果仍保留前端 update，这条策略能兜底当前页面逻辑。
-- 但推荐优先通过上面的 increment_photo_likes RPC 或服务端接口调用。
drop policy if exists "allow_public_like_increment" on public.photos;
create policy "allow_public_like_increment"
on public.photos
for update
to anon, authenticated
using (is_visible = true)
with check (
  is_visible = true
  and title = (select p.title from public.photos p where p.id = photos.id)
  and author = (select p.author from public.photos p where p.id = photos.id)
  and image_url = (select p.image_url from public.photos p where p.id = photos.id)
  and likes >= 0
);

-- 推荐的下一步：
-- 1. 新增 profiles / auth.users 体系后，改成 authenticated only。
-- 2. 点赞优先走 increment_photo_likes RPC。
-- 3. 上传与发评论改经服务端，由 service_role 写库。
