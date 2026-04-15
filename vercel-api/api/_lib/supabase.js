import { createClient } from '@supabase/supabase-js';
import { serverEnv } from './env.js';

export const supabaseAdmin = createClient(
  serverEnv.supabaseUrl,
  serverEnv.supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
