
import React from 'react';
import { Database, Terminal, CheckCircle, Rocket } from 'lucide-react';

const Instructions: React.FC = () => {
  const sqlSchema = `
-- إنشاء جداول نظام النداء
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_name TEXT DEFAULT 'مجمع الطبي',
  speech_speed FLOAT DEFAULT 1.0,
  ticker_speed INT DEFAULT 20,
  ticker_content TEXT
);

CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number INT UNIQUE,
  name TEXT NOT NULL,
  current_number INT DEFAULT 0,
  linked_screens JSONB DEFAULT '[]',
  password TEXT,
  status TEXT DEFAULT 'active'
);

CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  specialty TEXT,
  working_days TEXT[],
  phone TEXT,
  image_url TEXT
);

CREATE TABLE screens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number INT,
  name TEXT,
  password TEXT,
  config JSONB
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_clinic TEXT,
  to_clinic TEXT,
  message TEXT,
  type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
  `.trim();

  return (
    <div className="flex-1 p-8 bg-slate-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="text-center">
          <h1 className="text-4xl font-black text-slate-800 mb-4">دليل تشغيل النظام</h1>
          <p className="text-slate-500">خطوات بسيطة لإعداد بيئة العمل والبدء في استخدام النظام</p>
        </header>

        <section className="bg-white p-8 rounded-3xl shadow-sm border">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-600">
            <Database /> إعداد قاعدة البيانات (Supabase)
          </h2>
          <p className="mb-4 text-slate-600">قم بنسخ الكود التالي ولصقه في SQL Editor داخل لوحة تحكم Supabase:</p>
          <div className="bg-slate-900 text-blue-400 p-6 rounded-xl font-mono text-sm relative overflow-x-auto">
            <pre>{sqlSchema}</pre>
            <button 
              onClick={() => { navigator.clipboard.writeText(sqlSchema); alert('تم النسخ'); }}
              className="absolute top-4 left-4 bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-xs text-white"
            >
              نسخ الكود
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3 text-emerald-700">
              <CheckCircle /> تجربة النظام
            </h2>
            <ul className="space-y-3 text-emerald-800 text-sm">
              <li>١. اذهب لصفحة الإدارة وأضف عيادتين على الأقل.</li>
              <li>٢. افتح "شاشة العرض" في نافذة متصفح مستقلة.</li>
              <li>٣. افتح "لوحة التحكم" واختر عيادة الباطنة مثلاً.</li>
              <li>٤. اضغط "العميل التالي" وراقب التحديث الفوري في شاشة العرض.</li>
            </ul>
          </div>
          <div className="bg-purple-50 p-8 rounded-3xl border border-purple-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3 text-purple-700">
              <Terminal /> الملفات الصوتية
            </h2>
            <p className="text-purple-800 text-sm leading-relaxed">
              تأكد من وجود مجلد <code className="bg-white px-1">/audio</code> في الجذر، يحتوي على ملفات مرقمة <code className="bg-white px-1">1.mp3, 2.mp3..</code> وملفات العيادات <code className="bg-white px-1">clinic1.mp3..</code> لتفعيل النداء الآلي بالصوت.
            </p>
          </div>
        </section>

        <section className="bg-slate-800 text-white p-10 rounded-3xl">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Rocket /> خطة التطوير القادمة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 p-4 rounded-xl">
              <h4 className="font-bold mb-2">تطبيق موبايل</h4>
              <p className="text-xs opacity-70">إصدار تطبيق للأندرويد و iOS للأطباء للتحكم السريع عبر الهاتف.</p>
            </div>
            <div className="bg-white/10 p-4 rounded-xl">
              <h4 className="font-bold mb-2">ذكاء اصطناعي</h4>
              <p className="text-xs opacity-70">تحليل أوقات الانتظار وتقديم توقعات دقيقة للمرضى حول موعد دخولهم.</p>
            </div>
            <div className="bg-white/10 p-4 rounded-xl">
              <h4 className="font-bold mb-2">حجز أونلاين</h4>
              <p className="text-xs opacity-70">ربط النظام بموقع الحجوزات لتحديث القائمة تلقائياً قبل وصول المريض.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Instructions;
