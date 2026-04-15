import { createClient } from '@supabase/supabase-js';

const clientCache = new Map();

export const getSupabaseAdmin = (env) => {
  const cacheKey = `${env?.SUPABASE_URL}|${env?.SUPABASE_SERVICE_ROLE_KEY}`;
  if (!clientCache.has(cacheKey)) {
    clientCache.set(
      cacheKey,
      createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    );
  }

  return clientCache.get(cacheKey);
};
