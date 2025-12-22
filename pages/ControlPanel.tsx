
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, UserPlus, SkipBack, Repeat, Hash, ArrowLeftRight, Send, AlertCircle, RefreshCw, Play, Pause, Bell } from 'lucide-react';
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

  useEffect(() => {
    fetchClinics();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLoggedIn && selectedClinic) {
      // الاشتراك في التنبيهات الموجهة لهذه العيادة
      const sub = subscribeToChanges('notifications', (payload) => {
        if (payload.new.to_clinic === selectedClinic.id || payload.new.type === 'emergency') {
          setInboundNotifications(prev => [payload.new as Notification, ...prev]);
          playSimpleSound('/audio/ring.mp3');
        }
      });
      return () => { supabase.removeChannel(sub); };
    }
  }, [isLoggedIn, selectedClinic]);

  const fetchClinics = async () => {
    const { data, error } = await supabase.from('clinics').select('*').order('number');
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
    const { data, error } = await supabase
      .from('clinics')
      .update({ current_number: num, last_called_at: new Date().toISOString() })
      .eq('id', selectedClinic.id)
      .select()
      .single();

    if (data) {
      setSelectedClinic(data);
      playCallSequence(num, data.number);
    }
  };

  const changeStatus = async (status: 'active' | 'paused') => {
    if (!selectedClinic) return;
    const { data } = await supabase.from('clinics').update({ status }).eq('id', selectedClinic.id).select().single();
    if (data) setSelectedClinic(data);
  };

  const sendEmergency = async (msg: string) => {
    await supabase.from('notifications').insert({
      from_clinic: selectedClinic?.name,
      message: msg,
      type: 'emergency'
    });
    playSimpleSound('/audio/emergency.mp3');
  };

  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-emerald-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center text-emerald-700">دخول العيادة</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">اختر العيادة</label>
              <select 
                className="w-full p-3 border rounded-lg"
                onChange={(e) => setSelectedClinic(clinics.find(c => c.id === e.target.value) || null)}
              >
                <option value="">-- اختر العيادة --</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">كلمة المرور</label>
              <input 
                type="password" 
                className="w-full p-3 border rounded-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700">دخول اللوحة</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-100">
      <header className="bg-emerald-600 text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <div className="bg-white text-emerald-600 p-2 px-4 rounded-lg font-black text-2xl">
            {toHindiDigits(selectedClinic?.current_number || 0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{selectedClinic?.name}</h1>
            <p className="text-xs opacity-80">{currentTime.toLocaleTimeString('ar-EG')}</p>
          </div>
        </div>
        <button onClick={() => setIsLoggedIn(false)} className="bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 flex items-center gap-2">
          <LogOut size={18} /> خروج
        </button>
      </header>

      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
        <section className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold border-b pb-2 text-slate-500">تحكم النداء</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => updateNumber((selectedClinic?.current_number || 0) + 1)} className="flex flex-col items-center p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 hover:bg-emerald-100">
              <UserPlus className="mb-2" /> العميل التالي
            </button>
            <button onClick={() => updateNumber(Math.max(0, (selectedClinic?.current_number || 0) - 1))} className="flex flex-col items-center p-4 bg-slate-50 text-slate-700 rounded-xl border border-slate-100 hover:bg-slate-100">
              <SkipBack className="mb-2" /> السابق
            </button>
            <button onClick={() => updateNumber(selectedClinic?.current_number || 0)} className="flex flex-col items-center p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 hover:bg-blue-100">
              <Repeat className="mb-2" /> تكرار النداء
            </button>
            <button onClick={() => {
              const num = prompt('ادخل رقم العميل:');
              if (num) updateNumber(parseInt(num));
            }} className="flex flex-col items-center p-4 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 hover:bg-purple-100">
              <Hash className="mb-2" /> رقم معين
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
             <button onClick={() => changeStatus('paused')} className={`flex items-center justify-center gap-2 p-3 rounded-lg ${selectedClinic?.status === 'paused' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
               <Pause size={18} /> توقف
             </button>
             <button onClick={() => changeStatus('active')} className={`flex items-center justify-center gap-2 p-3 rounded-lg ${selectedClinic?.status === 'active' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
               <Play size={18} /> استئناف
             </button>
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold border-b pb-2 text-slate-500">تحويل ومراسلة</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100"><ArrowLeftRight size={20} className="text-blue-500" /> تحويل لعيادة أخرى</button>
            <button className="w-full flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100"><Send size={20} className="text-indigo-500" /> مراسلة الإدارة</button>
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold border-b pb-2 text-slate-500">تنبيهات الطوارئ</h3>
          <div className="grid grid-cols-1 gap-2">
            <button onClick={() => sendEmergency('حالة حريق!')} className="bg-red-600 text-white p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700"><AlertCircle /> حريق</button>
            <button onClick={() => sendEmergency('تسرب غاز!')} className="bg-orange-600 text-white p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-orange-700"><AlertCircle /> غاز</button>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t p-4 h-48 overflow-y-auto">
        <h4 className="font-bold text-slate-500 mb-2 flex items-center gap-2"><Bell size={16} /> التنبيهات والتحويلات الواردة</h4>
        <div className="space-y-2">
          {inboundNotifications.map((notif, i) => (
            <div key={i} className={`p-3 rounded text-sm flex justify-between ${notif.type === 'emergency' ? 'bg-red-50 border-r-4 border-red-500' : 'bg-blue-50 border-r-4 border-blue-500'}`}>
              <span>{notif.message} {notif.from_clinic ? `من ${notif.from_clinic}` : ''}</span>
              <span className="text-slate-400">{new Date(notif.created_at).toLocaleTimeString('ar-EG')}</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default ControlPanel;
