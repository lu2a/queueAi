
import React, { useState, useEffect } from 'react';
import { Maximize, Settings as SettingsIcon, Bell, Clock, X, Volume2, User, Stethoscope } from 'lucide-react';
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
  const [notification, setNotification] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  const [config, setConfig] = useState({
    cardHeight: '140px',
    fontSize: '2.5rem',
    columns: 2,
    layoutSplit: '1/3',
    themeColor: '#2563eb',
    cardBg: '#ffffff'
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
          setNotification(`على العميل رقم ${toHindiDigits(payload.new.current_number)} التوجه لـ ${payload.new.name}`);
          if (audioReady) playCallSequence(payload.new.current_number, payload.new.number);
          setTimeout(() => setNotification(null), 8000);
        }
      } else { fetchInitialData(); }
    });

    const notifSub = subscribeToChanges('notifications', (payload) => {
      const n = payload.new as Notification;
      if (n.type === 'emergency') {
        setNotification(`تنبيه طارئ: ${n.message}`);
        if (audioReady) playSimpleSound('/audio/emergency.mp3');
        setTimeout(() => setNotification(null), 15000);
      } else if (n.type === 'name_call') {
        setNotification(`الرجاء من المريض: ${n.message} التوجه للعيادة`);
        if (audioReady) playSimpleSound('/audio/ding.mp3');
        setTimeout(() => setNotification(null), 12000);
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
    const { data: d } = await supabase.from('doctors').select('*');
    if (d) setDoctors(d);
  };

  const handleStartDisplay = () => {
    const screen = screens.find(s => s.id === selectedScreenId);
    if (screen && screen.password === password) {
      setIsLoggedIn(true);
      setAudioReady(true);
      playSimpleSound('/audio/ding.mp3');
    } else {
      alert('اسم الشاشة أو كلمة السر غير صحيحة');
    }
  };

  const currentDoctor = doctors[currentDoctorIdx];

  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-96">
          <h2 className="text-2xl font-black mb-6 text-center">تفعيل الشاشة</h2>
          <div className="space-y-4">
            <select className="w-full p-4 border-2 rounded-2xl font-bold" value={selectedScreenId} onChange={e => setSelectedScreenId(e.target.value)}>
              <option value="">-- اختر الشاشة --</option>
              {screens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="password" placeholder="كلمة السر" className="w-full p-4 border-2 rounded-2xl text-center font-bold" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button onClick={handleStartDisplay} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3"><Volume2 /> تشغيل العرض</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden relative">
      <header className="h-20 bg-white border-b shadow-sm flex items-center justify-between px-8 z-10">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-2xl" style={{ backgroundColor: config.themeColor }}>{settings?.center_name}</div>
          <div className="flex flex-col text-slate-500 font-bold"><span className="flex items-center gap-2"><Clock size={16} /> {currentTime.toLocaleTimeString('ar-EG')}</span></div>
        </div>
        <button onClick={() => setShowConfig(true)} className="p-2 text-slate-400"><SettingsIcon size={24} /></button>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-1/3 p-4 bg-slate-200 overflow-hidden flex flex-col gap-4">
          <div className="flex-1 overflow-y-auto grid gap-4 auto-rows-min" style={{ gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))` }}>
            {clinics.map(clinic => (
              <div key={clinic.id} className={`rounded-2xl shadow-md p-4 flex flex-col items-center justify-center border-b-8 transition-all ${clinic.status === 'active' ? 'border-green-500' : 'border-red-500'}`} style={{ height: config.cardHeight, backgroundColor: config.cardBg }}>
                <span className="text-xs font-bold text-slate-500 text-center">{clinic.name}</span>
                <span className="font-black text-blue-800" style={{ fontSize: config.fontSize }}>{toHindiDigits(clinic.current_number)}</span>
              </div>
            ))}
          </div>
          
          {/* Doctor Promotion Card */}
          {currentDoctor && (
            <div className="h-44 bg-white rounded-3xl border-r-[12px] border-blue-600 shadow-xl p-4 flex items-center gap-5 animate-slideIn">
              <div className="w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 border-2 border-slate-50">
                 {currentDoctor.image_url ? <img src={currentDoctor.image_url} className="w-full h-full object-cover" /> : <User size={40} className="text-slate-300" />}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">تعرف على أطبائنا</p>
                <h4 className="text-xl font-black text-slate-800 truncate">{currentDoctor.name}</h4>
                <p className="text-sm font-bold text-slate-400 flex items-center gap-2 mt-1"><Stethoscope size={14} /> {currentDoctor.specialty}</p>
              </div>
            </div>
          )}
        </div>

        <div className="w-2/3 bg-black flex items-center justify-center relative">
          <video className="w-full h-full object-cover opacity-60" autoPlay muted loop src="/videos/display.mp4" />
          {notification && (
            <div className="absolute inset-0 flex items-center justify-center p-10 bg-black/50 animate-fadeIn">
              <div className="bg-white border-8 border-blue-600 rounded-[3rem] p-12 shadow-2xl animate-bounce text-center max-w-2xl">
                <Bell size={80} className="text-blue-600 mx-auto mb-6" />
                <h2 className="text-5xl font-black text-slate-800 leading-tight">{notification}</h2>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="h-16 bg-blue-900 text-white overflow-hidden flex items-center" style={{ backgroundColor: config.themeColor }}>
        <div className="animate-marquee px-4 text-2xl font-bold" style={{ '--speed': `${settings?.ticker_speed || 20}s` } as any}>{settings?.ticker_content}</div>
      </footer>

      {showConfig && (
        <div className="absolute inset-0 bg-black/80 z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">تخصيص العرض</h3><button onClick={() => setShowConfig(false)}><X /></button></div>
            <div className="space-y-4">
               <div><label className="text-xs font-bold block mb-1">الأعمدة</label><input type="number" className="w-full p-2 border rounded-lg" value={config.columns} onChange={e => setConfig({...config, columns: parseInt(e.target.value)})}/></div>
               <div><label className="text-xs font-bold block mb-1">لون السمة</label><input type="color" className="w-full h-10 p-1 border rounded-lg" value={config.themeColor} onChange={e => setConfig({...config, themeColor: e.target.value})}/></div>
            </div>
            <button onClick={() => setShowConfig(false)} className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-bold">حفظ</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayScreen;
