
import React, { useState, useEffect } from 'react';
import { Settings, Users, Tv, Stethoscope, Trash2, Edit, Plus, RefreshCw, Send, Phone, Volume2, AlertCircle, Play, Pause, Repeat, Hash, SkipBack, UserPlus, Bell } from 'lucide-react';
import { toHindiDigits, playSimpleSound } from '../utils';
import { supabase, subscribeToChanges } from '../supabase';
import { Clinic, Doctor, Screen, SystemSettings, Notification } from '../types';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'clinics' | 'doctors' | 'screens' | 'remote'>('settings');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [adminNotifications, setAdminNotifications] = useState<Notification[]>([]);
  
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [customPatientName, setCustomPatientName] = useState('');

  useEffect(() => {
    fetchData();
    const sub = subscribeToChanges('notifications', (payload) => {
      const n = payload.new as Notification;
      if (n.to_admin === true || n.type === 'emergency') {
        setAdminNotifications(prev => [n, ...prev]);
        playSimpleSound('/audio/ring.mp3');
      }
    });
    return () => { supabase.removeChannel(sub); };
  }, [activeTab]);

  const fetchData = async () => {
    const { data: c } = await supabase.from('clinics').select('*').order('number');
    if (c) setClinics(c);
    const { data: d } = await supabase.from('doctors').select('*');
    if (d) setDoctors(d);
    const { data: s } = await supabase.from('screens').select('*');
    if (s) setScreens(s);
    if (activeTab === 'settings') {
      const { data: set } = await supabase.from('settings').select('*').single();
      if (set) setSettings(set);
    }
  };

  const handleAddDoctor = async () => {
    const name = prompt('اسم الطبيب:');
    const spec = prompt('التخصص:');
    const img = prompt('رابط صورة الطبيب (اختياري):');
    if (name) {
      await supabase.from('doctors').insert({ name, specialty: spec, image_url: img });
      fetchData();
    }
  };

  const handleAddScreen = async () => {
    const name = prompt('اسم الشاشة:');
    const pass = prompt('كلمة السر:');
    if (name) {
      await supabase.from('screens').insert({ name, password: pass || '123' });
      fetchData();
    }
  };

  const resetAll = async () => {
    if (confirm('تصفير العدادات؟')) { await supabase.from('clinics').update({ current_number: 0 }); fetchData(); }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 min-h-screen">
      <aside className="w-full md:w-72 bg-slate-900 text-slate-300 p-6 space-y-2 shrink-0">
        <h2 className="text-2xl font-black text-white mb-10 px-2 flex items-center gap-3"><Settings className="text-blue-500" /> لوحة الإدارة</h2>
        <nav className="space-y-1">
          {[{ id: 'settings', label: 'الإعدادات العامة', icon: Settings }, { id: 'clinics', label: 'إدارة العيادات', icon: Users }, { id: 'doctors', label: 'إدارة الأطباء', icon: Stethoscope }, { id: 'screens', label: 'إدارة الشاشات', icon: Tv }, { id: 'remote', label: 'التحكم الموحد', icon: Send }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><tab.icon size={20} /> <span className="font-bold">{tab.label}</span></button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'settings' && settings && (
          <div className="max-w-4xl space-y-8">
            <h3 className="text-3xl font-black">الإعدادات</h3>
            <div className="bg-white p-8 rounded-3xl border space-y-4">
               <div><label className="text-sm font-bold">اسم المركز</label><input className="w-full p-4 border rounded-2xl" value={settings.center_name} onChange={e => setSettings({...settings, center_name: e.target.value})} /></div>
               <div><label className="text-sm font-bold">محتوى الشريط</label><textarea className="w-full p-4 border rounded-2xl h-32" value={settings.ticker_content} onChange={e => setSettings({...settings, ticker_content: e.target.value})} /></div>
               <button onClick={async () => { await supabase.from('settings').update(settings).eq('id', settings.id); alert('حفظ'); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold">حفظ</button>
            </div>
          </div>
        )}

        {activeTab === 'doctors' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-3xl font-black">الطاقم الطبي</h3><button onClick={handleAddDoctor} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold">+ طبيب</button></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {doctors.map(d => (
                <div key={d.id} className="bg-white p-6 rounded-3xl border shadow-sm flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden">
                    {d.image_url ? <img src={d.image_url} className="w-full h-full object-cover" /> : <Stethoscope size={32} />}
                  </div>
                  <div><h4 className="font-bold">{d.name}</h4><p className="text-sm text-slate-500">{d.specialty}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications for Manager */}
        <div className="mt-12">
          <h3 className="text-2xl font-black mb-6 flex items-center gap-2"><Bell className="text-amber-500" /> تنبيهات موجهة للمدير</h3>
          <div className="bg-white rounded-3xl border p-6 space-y-4 h-96 overflow-y-auto">
            {adminNotifications.length === 0 ? <p className="text-slate-400">لا توجد رسائل موجهة لك حالياً</p> : 
              adminNotifications.map((n, i) => (
                <div key={i} className={`p-5 rounded-2xl border-r-8 shadow-sm ${n.type === 'emergency' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'}`}>
                  <p className="font-black text-slate-800">{n.message}</p>
                  <div className="flex justify-between mt-2 text-xs font-bold text-slate-400">
                    <span>المرسل: {n.from_clinic || 'النظام'}</span>
                    <span>{new Date(n.created_at).toLocaleTimeString('ar-EG')}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
