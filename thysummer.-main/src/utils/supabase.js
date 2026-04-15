import { createClient } from '@supabase/supabase-js';
import { hasSupabaseConfig, publicEnv } from './env.js';

let supabaseClient = null;

export const getSupabaseClient = () => {
  if (!hasSupabaseConfig) {
    throw new Error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY.');
  }

  if (!supabaseClient) {
    supabaseClient = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  }

  return supabaseClient;
};
