
import { createClient } from '@supabase/supabase-js';

// These should be environment variables. In this environment, we assume Supabase is ready.
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper for Realtime subscriptions
export const subscribeToTable = (table: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`${table}-changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();
};
