
import React, { useState, useEffect } from 'react';
import { Maximize, Settings as SettingsIcon, Bell, Clock, X, Volume2, User, Stethoscope, Sliders, Layout, Tv, QrCode } from 'lucide-react';
import { toHindiDigits, playCallSequence, playSimpleSound } from '../utils';
import { Clinic, SystemSettings, Notification, Doctor, Screen } from '../types';
import { supabase, subscribeToChanges } from '../supabase';

const DisplayScreen: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState('');
  const [password, setPassword] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [currentDoctorIdx, setCurrentDoctorIdx] = useState(0);
  const [activeNotification, setActiveNotification] = useState<{ msg: string; type: string } | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  const [config, setConfig] = useState({
    cardWidth: '100%',
    cardHeight: '160px',
    fontSize: '3.5rem',
    columns: 2,
    layoutSplit: '1/3' as '1/4' | '1/3' | '1/2' | '2/3',
    themeColor: '#2563eb',
    cardBg: '#ffffff',
    cardTextColor: '#1e3a8a'
  });

  useEffect(() => {
    fetchInitialData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const docTimer = setInterval(() => {
       setCurrentDoctorIdx(prev => (doctors.length > 0 ? (prev + 1) % doctors.length : 0));
    }, 10000);

    const clinicSub = subscribeToChanges('clinics', (payload) => {
      if (payload.eventType === 'UPDATE') {
        setClinics(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
        if (payload.old && payload.new.current_number !== payload.old.current_number) {
          setActiveNotification({ 
            msg: `على العميل رقم ${toHindiDigits(payload.new.current_number)} التوجه لـ ${payload.new.name}`, 
            type: 'normal' 
          });
          if (audioReady) playCallSequence(payload.new.current_number, payload.new.number);
          setTimeout(() => setActiveNotification(null), 8000);
        }
      } else { fetchInitialData(); }
    });

    const notifSub = subscribeToChanges('notifications', (payload) => {
      const n = payload.new as Notification;
      if (n.type === 'emergency') {
        setActiveNotification({ msg: `تنبيه طارئ: ${n.message}`, type: 'emergency' });
        if (audioReady) playSimpleSound('/audio/emergency.mp3');
        setTimeout(() => setActiveNotification(null), 15000);
      } else if (n.type === 'name_call') {
        setActiveNotification({ msg: `الرجاء من المريض: ${n.message} التوجه للعيادة`, type: 'normal' });
        if (audioReady) playSimpleSound('/audio/ding.mp3');
        setTimeout(() => setActiveNotification(null), 12000);
      } else if (n.type === 'transfer') {
        setActiveNotification({ msg: n.message, type: 'transfer' });
        if (audioReady) playSimpleSound('/audio/ding.mp3');
        setTimeout(() => setActiveNotification(null), 10000);
      }
    });

    return () => {
      clearInterval(timer);
      clearInterval(docTimer);
      supabase.removeChannel(clinicSub);
      notifSub.unsubscribe();
    };
  }, [audioReady, doctors.length]);

  const fetchInitialData = async () => {
    const { data: scr } = await supabase.from('screens').select('*').order('number');
    if (scr) setScreens(scr);
    const { data: s } = await supabase.from('settings').select('*').single();
    if (s) setSettings(s);
    const { data: c } = await supabase.from('clinics').select('*').order('number');
    if (c) setClinics(c);
    const { data: d } = await supabase.from('doctors').select('*').order('name');
    if (d) setDoctors(d);
  };

  const handleStartDisplay = () => {
    const screen = screens.find(s => s.id === selectedScreenId);
    if (screen && screen.password === password) {
      setIsLoggedIn(true);
      setAudioReady(true);
      playSimpleSound('/audio/ding.mp3');
    } else {
      alert('البيانات غير صحيحة');
    }
  };

  const getLeftWidth = () => {
    switch (config.layoutSplit) {
      case '1/4': return 'w-1/4';
      case '1/3': return 'w-1/3';
      case '1/2': return 'w-1/2';
      case '2/3': return 'w-2/3';
      default: return 'w-1/3';
    }
  };

  const getNotificationStyles = (type: string) => {
    switch (type) {
      case 'emergency': return 'border-red-600 bg-red-50 text-red-900 notification-red';
      case 'transfer': return 'border-blue-600 bg-blue-50 text-blue-900 notification-blue';
      default: return 'border-green-600 bg-green-50 text-green-900 notification-green';
    }
  };

  const currentDoctor = doctors[currentDoctorIdx];

  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 p-6">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border-t-8 border-blue-600">
          <h2 className="text-3xl font-black text-center mb-8">تنشيط العرض</h2>
          <div className="space-y-5">
            <select className="w-full p-5 border-2 rounded-3xl font-black bg-slate-50" value={selectedScreenId} onChange={e => setSelectedScreenId(e.target.value)}>
              <option value="">-- اختر الشاشة --</option>
              {screens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="password" placeholder="كلمة المرور" className="w-full p-5 border-2 rounded-3xl text-center font-black bg-slate-50" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button onClick={handleStartDisplay} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-4"><Volume2 /> تشغيل</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden relative font-cairo">
      <header className="h-24 bg-white border-b-4 flex items-center justify-between px-10 z-20 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-3xl shadow-lg" style={{ backgroundColor: config.themeColor }}>
            {settings?.center_name}
          </div>
          <span className="flex items-center gap-3 text-2xl font-black text-slate-500"><Clock size={24} /> {currentTime.toLocaleTimeString('ar-EG')}</span>
        </div>
        <div className="flex items-center gap-5">
          <button onClick={() => setShowConfig(true)} className="p-3 bg-slate-50 rounded-2xl"><SettingsIcon size={28} /></button>
          <button onClick={() => document.documentElement.requestFullscreen()} className="p-3 bg-slate-50 rounded-2xl"><Maximize size={28} /></button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className={`${getLeftWidth()} p-4 bg-slate-200 overflow-hidden flex flex-col gap-4 border-l-4 border-slate-300`}>
          <div className="flex-1 overflow-y-auto grid gap-4 auto-rows-min scrollbar-hide" style={{ gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))` }}>
            {clinics.map(clinic => (
              <div 
                key={clinic.id} 
                className={`rounded-[2.5rem] shadow-xl p-6 flex flex-col items-center justify-center border-b-[10px] transition-all ${clinic.status === 'active' ? 'border-green-500' : 'border-red-500 animate-pulse'}`} 
                style={{ height: config.cardHeight, width: config.cardWidth, backgroundColor: config.cardBg, margin: '0 auto' }}
              >
                <span className="text-sm font-black text-slate-400 mb-2 truncate text-center w-full">{clinic.name}</span>
                <span className="font-black" style={{ fontSize: config.fontSize, color: config.cardTextColor }}>{toHindiDigits(clinic.current_number)}</span>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {currentDoctor && (
              <div className="bg-white rounded-[2.5rem] border-r-[10px] border-blue-600 shadow-lg p-4 flex items-center gap-4 h-36">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 border">
                   {currentDoctor.image_url ? <img src={currentDoctor.image_url} className="w-full h-full object-cover" /> : <User size={30} className="text-slate-300" />}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-lg font-black text-slate-800 truncate">{currentDoctor.name}</h4>
                  <p className="text-xs font-bold text-slate-400">{currentDoctor.specialty}</p>
                </div>
              </div>
            )}
            <div className="bg-white rounded-[2.5rem] border-r-[10px] border-amber-500 shadow-lg p-4 flex items-center gap-4 h-36">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shrink-0 border">
                 <QrCode size={32} />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-lg font-black text-slate-800">تابع دورك</h4>
                <p className="text-[10px] font-bold text-slate-400">امسح الكود لمتابعة حالة الانتظار</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-black flex items-center justify-center relative">
          <video className="w-full h-full object-cover opacity-60" autoPlay muted loop src="/videos/display.mp4" />
          
          {activeNotification && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-50">
              <div className={`border-4 rounded-[3rem] p-10 shadow-2xl text-center relative overflow-hidden ${getNotificationStyles(activeNotification.type)}`}>
                <div className="flex items-center justify-center gap-6">
                   <Bell size={48} className="animate-bounce" />
                   <h2 className="text-4xl font-black leading-tight">{activeNotification.msg}</h2>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="h-20 bg-blue-900 text-white overflow-hidden flex items-center relative z-20 border-t-4" style={{ backgroundColor: config.themeColor }}>
        <div className="absolute left-0 h-full bg-white/20 px-6 flex items-center font-black z-10 backdrop-blur-md">أخبار العيادة</div>
        <div className="animate-marquee px-4 text-3xl font-black" style={{ '--speed': `${settings?.ticker_speed || 20}s` } as any}>
          {settings?.ticker_content}
        </div>
      </footer>

      {showConfig && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-8">
          <div className="bg-white rounded-[4rem] p-12 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-10 border-b pb-6">
               <h3 className="text-3xl font-black">إعدادات العرض</h3>
               <button onClick={() => setShowConfig(false)} className="p-4 bg-slate-50 rounded-full"><X size={32}/></button>
            </div>
            <div className="grid grid-cols-2 gap-10">
               <div className="space-y-6">
                  <h4 className="font-black text-blue-600 border-b pb-2">أبعاد الكروت</h4>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-xs font-bold block mb-1">عرض الكارت (width)</label>
                       <input className="w-full p-3 border rounded-xl" value={config.cardWidth} onChange={e => setConfig({...config, cardWidth: e.target.value})} />
                     </div>
                     <div>
                       <label className="text-xs font-bold block mb-1">طول الكارت (height)</label>
                       <input className="w-full p-3 border rounded-xl" value={config.cardHeight} onChange={e => setConfig({...config, cardHeight: e.target.value})} />
                     </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">حجم الخط (fontSize)</label>
                    <input className="w-full p-3 border rounded-xl" value={config.fontSize} onChange={e => setConfig({...config, fontSize: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">عدد الأعمدة</label>
                    <input type="number" className="w-full p-3 border rounded-xl" value={config.columns} onChange={e => setConfig({...config, columns: parseInt(e.target.value)})} />
                  </div>
               </div>
               <div className="space-y-6">
                  <h4 className="font-black text-blue-600 border-b pb-2">التصميم العام</h4>
                  <div>
                    <label className="text-xs font-bold block mb-1">تقسيم الشاشة</label>
                    <select className="w-full p-3 border rounded-xl" value={config.layoutSplit} onChange={e => setConfig({...config, layoutSplit: e.target.value as any})}>
                       <option value="1/4">الربع</option>
                       <option value="1/3">الثلث</option>
                       <option value="1/2">النصف</option>
                       <option value="2/3">الثلثين</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="color" className="w-full h-12" value={config.themeColor} onChange={e => setConfig({...config, themeColor: e.target.value})} />
                    <input type="color" className="w-full h-12" value={config.cardBg} onChange={e => setConfig({...config, cardBg: e.target.value})} />
                  </div>
               </div>
            </div>
            <button onClick={() => setShowConfig(false)} className="w-full mt-12 bg-slate-900 text-white py-6 rounded-3xl font-black text-xl shadow-xl">تطبيق الإعدادات</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayScreen;
