
import { createClient } from '@supabase/supabase-js';

// ملاحظة: يجب التأكد من وضع القيم الصحيحة في إعدادات المشروع بـ Supabase
const supabaseUrl = window.location.origin.includes('localhost') 
  ? 'https://your-project-url.supabase.co' 
  // Use process.env to access environment variables and avoid ImportMeta errors
  : (process.env.VITE_SUPABASE_URL || 'https://lgxobbrngtwhyshrnynf.supabase.co');

const supabaseKey = window.location.origin.includes('localhost') 
  ? 'your-anon-key' 
  // Use process.env to access environment variables and avoid ImportMeta errors
  : (process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneG9iYnJuZ3R3aHlzaHJueW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjMxMzcsImV4cCI6MjA4MTk5OTEzN30.O7qziDy6WjJOPRfrPBys4g5rrXL6nyHvrF1DOYeAG0E');

export const supabase = createClient(supabaseUrl, supabaseKey);

// مساعد للاشتراك في التغييرات اللحظية
export const subscribeToChanges = (table: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`public:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: table }, callback)
    .subscribe();
};
