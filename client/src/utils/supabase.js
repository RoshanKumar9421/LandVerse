import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uihmeuekhagbxnejxdrv.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_JivshsH-8WbqsPTE1OyiAA_Z1BXbXu8';

export const supabase = createClient(supabaseUrl, supabaseKey);
