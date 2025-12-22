
import { createClient } from '@supabase/supabase-js';

// These should be environment variables. In this environment, we assume Supabase is ready.
const supabaseUrl = 'https://lgxobbrngtwhyshrnynf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneG9iYnJuZ3R3aHlzaHJueW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjMxMzcsImV4cCI6MjA4MTk5OTEzN30.O7qziDy6WjJOPRfrPBys4g5rrXL6nyHvrF1DOYeAG0E';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper for Realtime subscriptions
export const subscribeToTable = (table: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`${table}-changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();
};
