import { createClient } from '@supabase/supabase-js';
import { ENV } from './env.config.js';

export const supabase = createClient(
    ENV.supabaseUrl,
    ENV.supabaseKey
);
