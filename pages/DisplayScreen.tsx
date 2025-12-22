
import React, { useState, useEffect } from 'react';
import { Maximize, Settings as SettingsIcon, Bell, Clock, Calendar } from 'lucide-react';
import { toHindiDigits, playCallSequence, playSimpleSound } from '../utils';
import { Clinic, SystemSettings, Notification } from '../types';
import { supabase, subscribeToChanges } from '../supabase';

const DisplayScreen: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // الاشتراك في تحديثات العيادات (الأرقام والحالة)
    const clinicSub = subscribeToChanges('clinics', (payload) => {
      setClinics(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
      
      // إذا تغير الرقم، نقوم بالنداء
      if (payload.old && payload.new.current_number !== payload.old.current_number) {
        setNotification(`على العميل رقم ${toHindiDigits(payload.new.current_number)} التوجه لـ ${payload.new.name}`);
        playCallSequence(payload.new.current_number, payload.new.number);
        setTimeout(() => setNotification(null), 10000);
      }
    });

    // الاشتراك في التنبيهات العامة والطوارئ
    const notifSub = subscribeToChanges('notifications', (payload) => {
      const newNotif = payload.new as Notification;
      if (newNotif.type === 'emergency') {
        setNotification(`تنبيه طارئ: ${newNotif.message}`);
        playSimpleSound('/audio/emergency.mp3');
        setTimeout(() => setNotification(null), 15000);
      }
    });

    return () => {
      clearInterval(timer);
      supabase.removeChannel(clinicSub);
      supabase.removeChannel(notifSub);
    };
  }, []);

  const fetchInitialData = async () => {
    const { data: s } = await supabase.from('settings').select('*').single();
    if (s) setSettings(s);
    
    const { data: c } = await supabase.from('clinics').select('*').order('number');
    if (c) setClinics(c);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-80">
          <h2 className="text-xl font-bold mb-4 text-center">دخول الشاشة</h2>
          <input 
            type="password" 
            placeholder="كلمة السر" 
            className="w-full p-3 border rounded mb-4 text-center"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={() => setIsLoggedIn(true)} className="w-full bg-blue-600 text-white py-3 rounded font-bold">تفعيل العرض</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden relative">
      <header className="h-20 bg-white border-b shadow-sm flex items-center justify-between px-8 z-10">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600 text-white p-3 rounded-xl font-black text-2xl">{settings?.center_name || 'جاري التحميل...'}</div>
          <div className="flex flex-col text-slate-500">
            <span className="flex items-center gap-2 font-bold"><Clock size={16} /> {currentTime.toLocaleTimeString('ar-EG')}</span>
            <span className="text-xs">{currentTime.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-1/3 p-4 bg-slate-200 overflow-y-auto grid grid-cols-2 gap-4 auto-rows-min shadow-inner">
          {clinics.map(clinic => (
            <div key={clinic.id} className={`bg-white rounded-2xl shadow-md p-4 flex flex-col items-center border-b-4 ${clinic.status === 'active' ? 'border-green-500' : 'border-red-500'}`}>
              <span className="text-xs text-slate-400">{clinic.name}</span>
              <span className="text-5xl font-black text-blue-800 my-2">{toHindiDigits(clinic.current_number)}</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${clinic.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px]">{clinic.status === 'active' ? 'نشطة' : 'متوقفة'}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="w-2/3 bg-black flex items-center justify-center relative">
          <video className="w-full h-full object-cover opacity-70" autoPlay muted loop src="https://www.w3schools.com/html/mov_bbb.mp4" />
          {notification && (
            <div className="absolute inset-0 flex items-center justify-center p-10 bg-black/40">
              <div className="bg-white border-8 border-blue-600 rounded-[3rem] p-12 shadow-2xl animate-bounce text-center max-w-2xl">
                <Bell size={80} className="text-blue-600 mx-auto mb-6" />
                <h2 className="text-5xl font-black text-slate-800 leading-tight">{notification}</h2>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="h-16 bg-blue-900 text-white overflow-hidden flex items-center">
        <div className="animate-marquee px-4 text-2xl font-bold" style={{ '--speed': `${settings?.ticker_speed || 20}s` } as any}>
          {settings?.ticker_content}
        </div>
      </footer>
    </div>
  );
};

export default DisplayScreen;
