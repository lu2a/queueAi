
import React, { useState, useEffect } from 'react';
import { Maximize, Settings as SettingsIcon, Bell, Clock, Calendar, X } from 'lucide-react';
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
  const [showConfig, setShowConfig] = useState(false);

  // Advanced Layout Config
  const [config, setConfig] = useState({
    cardHeight: '160px',
    fontSize: '3rem',
    columns: 2,
    layoutSplit: '1/3', // Ratio for cards area
    themeColor: '#2563eb',
    cardBg: '#ffffff'
  });

  useEffect(() => {
    fetchInitialData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const clinicSub = subscribeToChanges('clinics', (payload) => {
      if (payload.eventType === 'UPDATE') {
        setClinics(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
        if (payload.old && payload.new.current_number !== payload.old.current_number) {
          setNotification(`على العميل رقم ${toHindiDigits(payload.new.current_number)} التوجه لـ ${payload.new.name}`);
          playCallSequence(payload.new.current_number, payload.new.number);
          setTimeout(() => setNotification(null), 10000);
        }
      } else {
        fetchInitialData();
      }
    });

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

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const getLayoutWidth = () => {
    switch (config.layoutSplit) {
      case '1/4': return 'w-1/4';
      case '1/3': return 'w-1/3';
      case '1/2': return 'w-1/2';
      case '2/3': return 'w-2/3';
      default: return 'w-1/3';
    }
  };

  const getVideoWidth = () => {
    switch (config.layoutSplit) {
      case '1/4': return 'w-3/4';
      case '1/3': return 'w-2/3';
      case '1/2': return 'w-1/2';
      case '2/3': return 'w-1/3';
      default: return 'w-2/3';
    }
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
          <div className="bg-blue-600 text-white p-3 rounded-xl font-black text-2xl" style={{ backgroundColor: config.themeColor }}>
            {settings?.center_name || 'جاري التحميل...'}
          </div>
          <div className="flex flex-col text-slate-500">
            <span className="flex items-center gap-2 font-bold"><Clock size={16} /> {currentTime.toLocaleTimeString('ar-EG')}</span>
            <span className="text-xs">{currentTime.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowConfig(true)} className="p-2 text-slate-400 hover:text-slate-600"><SettingsIcon size={24} /></button>
          <button onClick={toggleFullScreen} className="p-2 text-slate-400 hover:text-slate-600"><Maximize size={24} /></button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className={`${getLayoutWidth()} p-4 bg-slate-200 overflow-y-auto grid gap-4 auto-rows-min shadow-inner`} style={{ gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))` }}>
          {clinics.map(clinic => (
            <div 
              key={clinic.id} 
              className={`rounded-2xl shadow-md p-4 flex flex-col items-center justify-center border-b-8 transition-all duration-500 ${clinic.status === 'active' ? 'border-green-500' : 'border-red-500'}`}
              style={{ height: config.cardHeight, backgroundColor: config.cardBg }}
            >
              <span className="text-sm font-bold text-slate-500 truncate w-full text-center">{clinic.name}</span>
              <span className="font-black text-blue-800" style={{ fontSize: config.fontSize }}>{toHindiDigits(clinic.current_number)}</span>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-3 h-3 rounded-full ${clinic.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs">{clinic.status === 'active' ? 'نشطة' : 'متوقفة'}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={`${getVideoWidth()} bg-black flex items-center justify-center relative`}>
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

      <footer className="h-16 bg-blue-900 text-white overflow-hidden flex items-center" style={{ backgroundColor: config.themeColor }}>
        <div className="animate-marquee px-4 text-2xl font-bold" style={{ '--speed': `${settings?.ticker_speed || 20}s` } as any}>
          {settings?.ticker_content}
        </div>
      </footer>

      {/* Advanced Config Modal */}
      {showConfig && (
        <div className="absolute inset-0 bg-black/80 z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold">إعدادات تخصيص الشاشة</h3>
              <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold block">مساحة الكروت</label>
                <select className="w-full p-3 border rounded-xl" value={config.layoutSplit} onChange={e => setConfig({...config, layoutSplit: e.target.value})}>
                  <option value="1/4">الربع (1/4)</option>
                  <option value="1/3">الثلث (1/3)</option>
                  <option value="1/2">النصف (1/2)</option>
                  <option value="2/3">الثلثين (2/3)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold block">عدد الأعمدة</label>
                <input type="number" className="w-full p-3 border rounded-xl" value={config.columns} onChange={e => setConfig({...config, columns: parseInt(e.target.value) || 1})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold block">طول الكارت (px)</label>
                <input type="text" className="w-full p-3 border rounded-xl" value={config.cardHeight} onChange={e => setConfig({...config, cardHeight: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold block">حجم الخط (rem)</label>
                <input type="text" className="w-full p-3 border rounded-xl" value={config.fontSize} onChange={e => setConfig({...config, fontSize: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold block">لون السمة الرئيسي</label>
                <input type="color" className="w-full h-12 p-1 border rounded-xl" value={config.themeColor} onChange={e => setConfig({...config, themeColor: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold block">خلفية الكروت</label>
                <input type="color" className="w-full h-12 p-1 border rounded-xl" value={config.cardBg} onChange={e => setConfig({...config, cardBg: e.target.value})} />
              </div>
            </div>

            <button onClick={() => setShowConfig(false)} className="w-full mt-8 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200">تطبيق الإعدادات</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayScreen;
