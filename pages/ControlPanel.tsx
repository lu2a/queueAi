
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, UserPlus, SkipBack, Repeat, Hash, ArrowLeftRight, Send, AlertCircle, Play, Pause, Bell, Clock } from 'lucide-react';
import { toHindiDigits, playCallSequence, playSimpleSound } from '../utils';
import { Clinic, Notification } from '../types';
import { supabase, subscribeToChanges } from '../supabase';

const ControlPanel: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [password, setPassword] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [inboundNotifications, setInboundNotifications] = useState<Notification[]>([]);
  const [customPatient, setCustomPatient] = useState('');

  useEffect(() => {
    fetchClinics();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLoggedIn && selectedClinic) {
      const clinicSub = subscribeToChanges('clinics', (payload) => {
        if (payload.new.id === selectedClinic.id) {
          setSelectedClinic(prev => ({ ...prev!, ...payload.new }));
        }
      });

      const notifSub = subscribeToChanges('notifications', (payload) => {
        if (payload.new.to_clinic === selectedClinic.id || payload.new.type === 'emergency') {
          setInboundNotifications(prev => [payload.new as Notification, ...prev]);
          playSimpleSound('/audio/ring.mp3');
          if (payload.new.type === 'emergency') {
             alert(`تنبيه طوارئ: ${payload.new.message}`);
          }
        }
      });

      return () => { 
        supabase.removeChannel(clinicSub); 
        notifSub.unsubscribe();
      };
    }
  }, [isLoggedIn, selectedClinic?.id]);

  const fetchClinics = async () => {
    const { data } = await supabase.from('clinics').select('*').order('number');
    if (data) setClinics(data);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clinic = clinics.find(c => c.id === selectedClinic?.id);
    if (clinic && password === clinic.password) {
      setIsLoggedIn(true);
      setSelectedClinic(clinic);
    } else {
      alert('كلمة السر خاطئة أو العيادة غير مختارة');
    }
  };

  const updateNumber = async (num: number) => {
    if (!selectedClinic) return;
    
    // تم حذف last_called_at لضمان التوافق مع قاعدة البيانات الحالية
    const { error } = await supabase
      .from('clinics')
      .update({ 
        current_number: num
      })
      .eq('id', selectedClinic.id);

    if (!error) {
      playCallSequence(num, selectedClinic.number);
    } else {
      console.error("Update error:", error);
      alert("فشل تحديث الرقم: تأكد من وجود صلاحيات التحديث (RLS) للجدول");
    }
  };

  const changeStatus = async (status: 'active' | 'paused') => {
    if (!selectedClinic) return;
    await supabase.from('clinics').update({ status }).eq('id', selectedClinic.id);
  };

  const sendAlert = async (type: string, msg: string, toAdmin = false) => {
    await supabase.from('notifications').insert({
      from_clinic: selectedClinic?.name,
      message: msg,
      type,
      to_admin: toAdmin
    });
    if (type === 'emergency') playSimpleSound('/audio/emergency.mp3');
  };

  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-900">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="bg-emerald-100 text-emerald-600 p-4 rounded-3xl mb-4">
              <LogOut size={40} className="rotate-180" />
            </div>
            <h2 className="text-3xl font-black text-slate-800">دخول العيادة</h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase">العيادة</label>
              <select 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none"
                value={selectedClinic?.id || ''}
                onChange={(e) => setSelectedClinic(clinics.find(c => c.id === e.target.value) || null)}
              >
                <option value="">-- اختر العيادة --</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase">كلمة المرور</label>
              <input 
                type="password" 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-700 transition-all">دخول لوحة التحكم</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <header className="bg-white border-b p-6 flex justify-between items-center px-10 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="bg-emerald-600 text-white p-4 px-6 rounded-3xl font-black text-4xl shadow-lg shadow-emerald-100 min-w-[100px] text-center">
            {toHindiDigits(selectedClinic?.current_number || 0)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">{selectedClinic?.name}</h1>
            <p className="text-sm font-bold text-slate-400 flex items-center gap-2">
              <Clock size={14} /> {currentTime.toLocaleTimeString('ar-EG')}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 ${selectedClinic?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <div className={`w-2 h-2 rounded-full ${selectedClinic?.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {selectedClinic?.status === 'active' ? 'العيادة نشطة' : 'العيادة متوقفة'}
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="bg-slate-100 text-slate-600 p-4 rounded-2xl hover:bg-slate-200">
            <LogOut size={24} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1600px] mx-auto w-full">
        <section className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] shadow-sm border space-y-8">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <UserPlus className="text-emerald-500" /> تحكم الطابور
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => updateNumber((selectedClinic?.current_number || 0) + 1)} className="flex flex-col items-center justify-center p-8 bg-emerald-600 text-white rounded-[2rem] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 group">
              <UserPlus size={48} className="mb-3 group-hover:scale-110" />
              <span className="font-black">العميل التالي</span>
            </button>
            <button onClick={() => updateNumber(Math.max(0, (selectedClinic?.current_number || 0) - 1))} className="flex flex-col items-center justify-center p-8 bg-slate-100 text-slate-600 rounded-[2rem] hover:bg-slate-200 transition-all group">
              <SkipBack size={48} className="mb-3 group-hover:scale-110" />
              <span className="font-black">السابق</span>
            </button>
            <button onClick={() => updateNumber(selectedClinic?.current_number || 0)} className="flex flex-col items-center justify-center p-8 bg-blue-50 text-blue-700 rounded-[2rem] border-2 border-blue-100 hover:bg-blue-100 transition-all group">
              <Repeat size={48} className="mb-3 group-hover:scale-110" />
              <span className="font-black">تكرار النداء</span>
            </button>
            <button onClick={() => {
              const num = prompt('ادخل رقم العميل الجديد:');
              if (num && !isNaN(parseInt(num))) updateNumber(parseInt(num));
            }} className="flex flex-col items-center justify-center p-8 bg-purple-50 text-purple-700 rounded-[2rem] border-2 border-purple-100 hover:bg-purple-100 transition-all group">
              <Hash size={48} className="mb-3 group-hover:scale-110" />
              <span className="font-black">رقم مخصص</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-6 border-t">
             <button onClick={() => changeStatus('paused')} className={`flex items-center justify-center gap-2 p-5 rounded-2xl font-bold transition-all ${selectedClinic?.status === 'paused' ? 'bg-red-600 text-white shadow-lg' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
               <Pause /> توقف مؤقت
             </button>
             <button onClick={() => changeStatus('active')} className={`flex items-center justify-center gap-2 p-5 rounded-2xl font-bold transition-all ${selectedClinic?.status === 'active' ? 'bg-green-600 text-white shadow-lg' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
               <Play /> استئناف
             </button>
          </div>
        </section>

        <section className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] shadow-sm border space-y-6">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <Send className="text-indigo-500" /> المراسلة والتنبيه
          </h3>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-bold text-slate-500 mb-2 block">نداء باسم مريض:</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="اكتب اسم المريض..." 
                  className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold" 
                  value={customPatient}
                  onChange={e => setCustomPatient(e.target.value)}
                />
                <button 
                  onClick={() => { if(customPatient) { sendAlert('normal', `الرجاء من المريض ${customPatient} التوجه للعيادة`); setCustomPatient(''); } }}
                  className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                >
                  <Send size={24} />
                </button>
              </div>
            </div>
            <button onClick={() => sendAlert('normal', 'يرجى مراجعة العيادة للأهمية من المدير', true)} className="w-full flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] hover:bg-slate-100 transition-colors font-bold border border-slate-100">
              <div className="flex items-center gap-3"><Bell className="text-amber-500" /> إرسال إشعار للمدير</div>
              <Send size={18} />
            </button>
            <div className="pt-6 border-t space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">تنبيهات الطوارئ</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => sendAlert('emergency', 'حالة حريق!')} className="bg-red-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 shadow-lg shadow-red-100"><AlertCircle size={18} /> حريق</button>
                <button onClick={() => sendAlert('emergency', 'حالة طبية حرجة!')} className="bg-orange-500 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 shadow-lg shadow-orange-100"><AlertCircle size={18} /> طوارئ</button>
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] shadow-sm border flex flex-col h-[650px]">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-6">
            <Bell className="text-amber-500" /> الإشعارات الواردة
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {inboundNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-20 text-slate-300">
                <Bell size={64} className="mb-4 opacity-20" />
                <p className="font-bold italic">لا توجد رسائل واردة حالياً</p>
              </div>
            ) : (
              inboundNotifications.map((n, i) => (
                <div key={i} className={`p-5 rounded-3xl border-r-8 shadow-sm transition-all animate-slideIn ${n.type === 'emergency' ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'}`}>
                   <p className="font-bold text-slate-800">{n.message}</p>
                   <div className="flex justify-between mt-3">
                     <span className="text-[10px] font-black text-slate-400 uppercase">{n.from_clinic || 'النظام'}</span>
                     <span className="text-[10px] text-slate-400 font-bold">{new Date(n.created_at).toLocaleTimeString('ar-EG')}</span>
                   </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ControlPanel;
