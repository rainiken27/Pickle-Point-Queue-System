import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
// This bypasses Row Level Security (RLS) policies
// ONLY use this in API routes and server-side code - NEVER expose to client

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  // Provide more helpful error message for production debugging
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
  
  throw new Error(
    `Missing Supabase server environment variables: ${missingVars.join(', ')}. ` +
    'Please check your Vercel environment variables (Settings → Environment Variables) or .env.local file.'
  );
}

// Create admin client with service role key (bypasses RLS)
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
