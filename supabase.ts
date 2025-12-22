
import { createClient } from '@supabase/supabase-js';

// ملاحظة: يجب التأكد من وضع القيم الصحيحة في إعدادات المشروع بـ Supabase
const supabaseUrl = window.location.origin.includes('localhost') 
  ? 'https://your-project-url.supabase.co' 
  // Use process.env to access environment variables and avoid ImportMeta errors
  : (process.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co');

const supabaseKey = window.location.origin.includes('localhost') 
  ? 'your-anon-key' 
  // Use process.env to access environment variables and avoid ImportMeta errors
  : (process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key');

export const supabase = createClient(supabaseUrl, supabaseKey);

// مساعد للاشتراك في التغييرات اللحظية
export const subscribeToChanges = (table: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`public:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: table }, callback)
    .subscribe();
};
