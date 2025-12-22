
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
  
  // Remote Control State
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [customPatientName, setCustomPatientName] = useState('');

  useEffect(() => {
    fetchData();
    const sub = subscribeToChanges('notifications', (payload) => {
      setAdminNotifications(prev => [payload.new as Notification, ...prev]);
      if (payload.new.type === 'emergency') playSimpleSound('/audio/emergency.mp3');
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

  // --- CRUD Handlers ---
  const handleAddDoctor = async () => {
    const name = prompt('اسم الطبيب:');
    const spec = prompt('التخصص:');
    if (name) {
      await supabase.from('doctors').insert({ name, specialty: spec });
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
    if (confirm('سيتم تصفير جميع عدادات العيادات، هل أنت متأكد؟')) {
      await supabase.from('clinics').update({ current_number: 0 });
      fetchData();
    }
  };

  // --- Remote Control Handlers ---
  const currentRemoteClinic = clinics.find(c => c.id === selectedClinicId);

  const remoteUpdateNumber = async (num: number) => {
    if (!selectedClinicId) return;
    await supabase.from('clinics').update({ current_number: num }).eq('id', selectedClinicId);
    fetchData();
  };

  const remoteToggleStatus = async (status: 'active' | 'paused') => {
    if (!selectedClinicId) return;
    await supabase.from('clinics').update({ status }).eq('id', selectedClinicId);
    fetchData();
  };

  const sendRemoteAlert = async (type: string, message: string) => {
    await supabase.from('notifications').insert({
      to_clinic: selectedClinicId,
      message,
      type
    });
    if (type === 'emergency') playSimpleSound('/audio/emergency.mp3');
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 min-h-screen">
      <aside className="w-full md:w-72 bg-slate-900 text-slate-300 p-6 space-y-2 shrink-0">
        <h2 className="text-2xl font-black text-white mb-10 px-2 flex items-center gap-3">
          <Settings className="text-blue-500" /> لوحة الإدارة
        </h2>
        <nav className="space-y-1">
          {[
            { id: 'settings', label: 'الإعدادات العامة', icon: Settings },
            { id: 'clinics', label: 'إدارة العيادات', icon: Users },
            { id: 'doctors', label: 'إدارة الأطباء', icon: Stethoscope },
            { id: 'screens', label: 'إدارة الشاشات', icon: Tv },
            { id: 'remote', label: 'أدوات النداء الموحدة', icon: Send },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)} 
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}
            >
              <tab.icon size={20} /> <span className="font-bold">{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* Settings Tab */}
        {activeTab === 'settings' && settings && (
          <div className="max-w-4xl space-y-8 animate-fadeIn">
            <h3 className="text-3xl font-black text-slate-800">تعديل الإعدادات العامة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-3xl shadow-sm border">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500">اسم المركز الطبي</label>
                <input type="text" className="w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 ring-blue-500 outline-none" value={settings.center_name} onChange={e => setSettings({...settings, center_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500">سرعة شريط الأخبار</label>
                <input type="number" className="w-full p-4 bg-slate-50 border rounded-2xl" value={settings.ticker_speed} onChange={e => setSettings({...settings, ticker_speed: parseInt(e.target.value) || 20})} />
              </div>
              <div className="space-y-2 col-span-full">
                <label className="text-sm font-bold text-slate-500">محتوى شريط الأخبار</label>
                <textarea className="w-full p-4 bg-slate-50 border rounded-2xl h-32" value={settings.ticker_content} onChange={e => setSettings({...settings, ticker_content: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={async () => { await supabase.from('settings').update(settings).eq('id', settings.id); alert('تم الحفظ'); }} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">حفظ جميع التغييرات</button>
              <button onClick={resetAll} className="bg-red-50 text-red-600 px-10 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-100"><RefreshCw size={18} /> تصفير جميع العيادات</button>
            </div>
          </div>
        )}

        {/* Clinics Tab */}
        {activeTab === 'clinics' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black text-slate-800">العيادات المتاحة</h3>
              <button onClick={() => {
                const name = prompt('اسم العيادة:');
                const num = prompt('رقم العيادة:');
                if (name && num) supabase.from('clinics').insert({ name, number: parseInt(num), password: '123' }).then(() => fetchData());
              }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-emerald-100"><Plus size={20} /> إضافة عيادة جديدة</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clinics.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-3xl shadow-sm border flex justify-between items-center group">
                  <div>
                    <h4 className="font-bold text-lg">{c.name}</h4>
                    <p className="text-sm text-slate-400">رقم العيادة: {toHindiDigits(c.number)}</p>
                    <p className="text-sm font-black text-blue-600 mt-2">الرقم الحالي: {toHindiDigits(c.current_number)}</p>
                  </div>
                  <button onClick={async () => { if(confirm('حذف؟')) { await supabase.from('clinics').delete().eq('id', c.id); fetchData(); }}} className="p-3 bg-red-50 text-red-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={20} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black text-slate-800">طاقم الأطباء</h3>
              <button onClick={handleAddDoctor} className="bg-purple-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-purple-100"><Plus size={20} /> إضافة طبيب</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {doctors.map(d => (
                <div key={d.id} className="bg-white p-6 rounded-3xl border shadow-sm flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                    <Stethoscope size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold">{d.name}</h4>
                    <p className="text-sm text-slate-500">{d.specialty || 'بدون تخصص'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Screens Tab */}
        {activeTab === 'screens' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black text-slate-800">الشاشات النشطة</h3>
              <button onClick={handleAddScreen} className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-blue-100"><Plus size={20} /> إضافة شاشة</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {screens.map(s => (
                <div key={s.id} className="bg-white p-6 rounded-3xl border shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Tv className="text-blue-500" size={32} />
                    <div>
                      <h4 className="font-bold">{s.name}</h4>
                      <p className="text-xs text-slate-400">ID: {s.id.slice(0,8)}</p>
                    </div>
                  </div>
                  <button onClick={async () => { await supabase.from('screens').delete().eq('id', s.id); fetchData(); }} className="p-2 text-red-500"><Trash2 size={20} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remote Tools Tab */}
        {activeTab === 'remote' && (
          <div className="space-y-8 animate-fadeIn pb-20">
            <header className="flex justify-between items-end">
              <div>
                <h3 className="text-3xl font-black text-slate-800 mb-2">لوحة التحكم الموحدة</h3>
                <p className="text-slate-500">تحكم كامل في أي عيادة عن بعد وإصدار نداءات فورية</p>
              </div>
              <div className="w-80">
                <label className="text-xs font-bold text-slate-400 mb-1 block">اختر العيادة للتحكم:</label>
                <select 
                  className="w-full p-4 bg-white border-2 border-blue-100 rounded-2xl font-bold focus:border-blue-500 outline-none"
                  value={selectedClinicId}
                  onChange={e => setSelectedClinicId(e.target.value)}
                >
                  <option value="">-- اختر العيادة --</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </header>

            {selectedClinicId ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Basic Call Controls */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border space-y-6">
                  <h4 className="text-lg font-bold border-b pb-4 flex items-center gap-2">
                    <Volume2 className="text-blue-500" /> أدوات النداء المباشر
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => remoteUpdateNumber((currentRemoteClinic?.current_number || 0) + 1)} className="flex flex-col items-center p-6 bg-blue-50 text-blue-700 rounded-3xl hover:bg-blue-100 transition-colors border border-blue-100">
                      <UserPlus size={32} className="mb-2" /> العميل التالي
                    </button>
                    <button onClick={() => remoteUpdateNumber(Math.max(0, (currentRemoteClinic?.current_number || 0) - 1))} className="flex flex-col items-center p-6 bg-slate-50 text-slate-700 rounded-3xl hover:bg-slate-100 transition-colors border border-slate-100">
                      <SkipBack size={32} className="mb-2" /> السابق
                    </button>
                    <button onClick={() => remoteUpdateNumber(currentRemoteClinic?.current_number || 0)} className="flex flex-col items-center p-6 bg-emerald-50 text-emerald-700 rounded-3xl hover:bg-emerald-100 transition-colors border border-emerald-100">
                      <Repeat size={32} className="mb-2" /> تكرار النداء
                    </button>
                    <button onClick={() => {
                      const n = prompt('الرقم الجديد:');
                      if(n) remoteUpdateNumber(parseInt(n));
                    }} className="flex flex-col items-center p-6 bg-purple-50 text-purple-700 rounded-3xl hover:bg-purple-100 transition-colors border border-purple-100">
                      <Hash size={32} className="mb-2" /> رقم محدد
                    </button>
                  </div>
                  <div className="flex gap-2 pt-4 border-t">
                    <button onClick={() => remoteToggleStatus('paused')} className={`flex-1 p-4 rounded-2xl flex items-center justify-center gap-2 font-bold ${currentRemoteClinic?.status === 'paused' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}>
                      <Pause /> توقف
                    </button>
                    <button onClick={() => remoteToggleStatus('active')} className={`flex-1 p-4 rounded-2xl flex items-center justify-center gap-2 font-bold ${currentRemoteClinic?.status === 'active' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600'}`}>
                      <Play /> استئناف
                    </button>
                  </div>
                </div>

                {/* Communication & Special Alerts */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border space-y-6">
                  <h4 className="text-lg font-bold border-b pb-4 flex items-center gap-2">
                    <Send className="text-indigo-500" /> مراسلة وتحويل
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 mb-1 block">تنبيه باسم مريض محدد:</label>
                      <div className="flex gap-2">
                        <input type="text" className="flex-1 bg-slate-50 p-4 rounded-2xl border outline-none focus:ring-2 ring-blue-500" placeholder="اكتب الاسم هنا..." value={customPatientName} onChange={e => setCustomPatientName(e.target.value)} />
                        <button onClick={() => { sendRemoteAlert('normal', `الرجاء من المريض ${customPatientName} التوجه للعيادة`); setCustomPatientName(''); }} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-200"><Send size={20} /></button>
                      </div>
                    </div>
                    <button onClick={() => playSimpleSound('/audio/ring.mp3')} className="w-full p-4 bg-slate-50 rounded-2xl border flex items-center gap-3 font-bold hover:bg-slate-100">
                      <Phone className="text-emerald-500" /> رن على العيادة (Ring)
                    </button>
                    <button className="w-full p-4 bg-slate-50 rounded-2xl border flex items-center gap-3 font-bold hover:bg-slate-100">
                      <Volume2 className="text-purple-500" /> تسجيل وبث مقطع صوتي
                    </button>
                    <div className="pt-4 border-t">
                       <p className="text-xs text-slate-400 mb-2">تنبيهات طوارئ فورية:</p>
                       <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => sendRemoteAlert('emergency', 'حالة حريق!')} className="bg-red-600 text-white p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-100"><AlertCircle size={16} /> حريق</button>
                          <button onClick={() => sendRemoteAlert('emergency', 'تسرب غاز!')} className="bg-orange-600 text-white p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-100"><AlertCircle size={16} /> غاز</button>
                          <button onClick={() => sendRemoteAlert('emergency', 'عطل كهرباء')} className="bg-slate-800 text-white p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-200"><AlertCircle size={16} /> كهرباء</button>
                          <button onClick={() => sendRemoteAlert('emergency', 'التوجه لنقطة التجمع')} className="bg-blue-800 text-white p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200"><AlertCircle size={16} /> تجمع</button>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Notifications Log */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border flex flex-col h-[500px]">
                  <h4 className="text-lg font-bold border-b pb-4 flex items-center gap-2">
                    <Bell className="text-amber-500" /> سجل التنبيهات الواردة
                  </h4>
                  <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-2">
                    {adminNotifications.length === 0 ? (
                      <p className="text-center text-slate-400 mt-20 italic">لا توجد تنبيهات جديدة</p>
                    ) : (
                      adminNotifications.map((n, i) => (
                        <div key={i} className={`p-4 rounded-2xl border-r-4 shadow-sm ${n.type === 'emergency' ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'}`}>
                          <p className="text-sm font-bold">{n.message}</p>
                          <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400 uppercase font-black">
                            <span>{n.from_clinic || 'النظام'}</span>
                            <span>{new Date(n.created_at).toLocaleTimeString('ar-EG')}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 bg-white rounded-[3rem] border border-dashed border-slate-300">
                <Send size={64} className="text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold text-lg">الرجاء اختيار عيادة من القائمة لبدء التحكم</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
