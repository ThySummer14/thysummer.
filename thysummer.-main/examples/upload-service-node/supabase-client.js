import { createClient } from '@supabase/supabase-js';

const requiredKeys = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missingKeys = requiredKeys.filter((key) => !process.env[key]);
if (missingKeys.length > 0) {
  throw new Error(`Missing required Supabase environment variables: ${missingKeys.join(', ')}`);
}

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
