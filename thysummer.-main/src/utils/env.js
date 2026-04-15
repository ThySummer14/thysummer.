const readPublicEnv = (key) => {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
};

export const publicEnv = {
  siteUrl: readPublicEnv('PUBLIC_SITE_URL'),
  supabaseUrl: readPublicEnv('PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readPublicEnv('PUBLIC_SUPABASE_ANON_KEY'),
  uploadEndpoint: readPublicEnv('PUBLIC_UPLOAD_ENDPOINT'),
};

export const uploadServiceBase = publicEnv.uploadEndpoint.replace(/\/upload\/?$/, '');

export const hasSupabaseConfig =
  Boolean(publicEnv.supabaseUrl) && Boolean(publicEnv.supabaseAnonKey);

export const hasUploadEndpoint = Boolean(publicEnv.uploadEndpoint);
export const hasUploadServiceBase = Boolean(uploadServiceBase);
