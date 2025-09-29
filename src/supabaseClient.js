// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!url || !anon) {
  // Surface a clear error so you see it in the console *and* fail fast
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Put them in .env.local at project root and restart `npm run dev`.'
  );
}

export const supabase = createClient(url, anon, {
  db: { schema: 'public' },
  auth: { persistSession: true, autoRefreshToken: true },
});
