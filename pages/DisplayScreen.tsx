
import React, { useState, useEffect } from 'react';
// Add missing 'Tv' icon to the lucide-react imports
import { Maximize, Settings as SettingsIcon, Bell, Clock, X, Volume2, User, Stethoscope, Sliders, Layout, Tv } from 'lucide-react';
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

  // Deep UI Configuration
  const [config, setConfig] = useState({
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

  const getLeftWidth = () => {
    switch (config.layoutSplit) {
      case '1/4': return 'w-1/4';
      case '1/3': return 'w-1/3';
      case '1/2': return 'w-1/2';
      case '2/3': return 'w-2/3';
    }
  };

  const getRightWidth = () => {
    switch (config.layoutSplit) {
      case '1/4': return 'w-3/4';
      case '1/3': return 'w-2/3';
      case '1/2': return 'w-1/2';
      case '2/3': return 'w-1/3';
    }
  };

  const currentDoctor = doctors[currentDoctorIdx];

  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 p-6">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border-t-8 border-blue-600 animate-fadeIn">
          <div className="flex flex-col items-center mb-8">
             <div className="p-5 bg-blue-50 text-blue-600 rounded-full mb-4"><Tv size={50}/></div>
             <h2 className="text-3xl font-black text-slate-800">تنشيط شاشة العرض</h2>
          </div>
          <div className="space-y-5">
            <div>
              <label className="text-xs font-black text-slate-400 block mb-2 px-1 uppercase">اسم الشاشة</label>
              <select className="w-full p-5 border-2 rounded-3xl font-black bg-slate-50 outline-none focus:border-blue-600 transition-all" value={selectedScreenId} onChange={e => setSelectedScreenId(e.target.value)}>
                <option value="">-- اختر الشاشة --</option>
                {screens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 block mb-2 px-1 uppercase">كلمة المرور</label>
              <input type="password" placeholder="أدخل كلمة السر" className="w-full p-5 border-2 rounded-3xl text-center font-black bg-slate-50 outline-none focus:border-blue-600 transition-all text-2xl tracking-[0.5em]" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button onClick={handleStartDisplay} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-4 shadow-xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all"><Volume2 /> تشغيل العرض والصوت</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden relative font-cairo">
      {/* Dynamic Header */}
      <header className="h-24 bg-white border-b-4 border-slate-100 shadow-sm flex items-center justify-between px-10 z-20">
        <div className="flex items-center gap-8">
          <div className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-3xl shadow-lg shadow-blue-100 animate-slideRight" style={{ backgroundColor: config.themeColor }}>
            {settings?.center_name}
          </div>
          <div className="flex flex-col text-slate-500 font-black">
            <span className="flex items-center gap-3 text-2xl"><Clock size={24} className="text-blue-500" /> {currentTime.toLocaleTimeString('ar-EG')}</span>
            <span className="text-xs opacity-70 uppercase tracking-widest">{currentTime.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <button onClick={() => setShowConfig(true)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-colors"><SettingsIcon size={28} /></button>
          <button onClick={() => document.documentElement.requestFullscreen()} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-colors"><Maximize size={28} /></button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: Clinics Grid & Promos */}
        <div className={`${getLeftWidth()} p-4 bg-slate-200 overflow-hidden flex flex-col gap-4 border-l-4 border-slate-300 transition-all duration-700`}>
          <div className="flex-1 overflow-y-auto grid gap-4 auto-rows-min scrollbar-hide" style={{ gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))` }}>
            {clinics.map(clinic => (
              <div 
                key={clinic.id} 
                className={`rounded-[2.5rem] shadow-2xl p-6 flex flex-col items-center justify-center border-b-[12px] transition-all duration-500 hover:scale-[1.02] ${clinic.status === 'active' ? 'border-green-500' : 'border-red-500 animate-pulse'}`} 
                style={{ height: config.cardHeight, backgroundColor: config.cardBg }}
              >
                <span className="text-sm font-black text-slate-400 mb-2 truncate w-full text-center uppercase tracking-tighter">{clinic.name}</span>
                <span className="font-black text-blue-900" style={{ fontSize: config.fontSize, color: config.cardTextColor }}>{toHindiDigits(clinic.current_number)}</span>
                {clinic.status !== 'active' && <span className="text-[10px] font-black text-red-500 uppercase mt-1">متوقفة مؤقتاً</span>}
              </div>
            ))}
          </div>
          
          {/* Doctor Promotion Card */}
          {currentDoctor && (
            <div className="h-48 bg-white rounded-[3rem] border-r-[15px] border-blue-600 shadow-2xl p-6 flex items-center gap-6 animate-slideIn relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-32 h-32 bg-blue-50 rounded-full -ml-16 -mt-16 opacity-50 group-hover:scale-150 transition-transform duration-700" />
              <div className="w-28 h-28 bg-slate-50 rounded-[2rem] overflow-hidden flex items-center justify-center shrink-0 border-4 border-white shadow-md z-10">
                 {currentDoctor.image_url ? <img src={currentDoctor.image_url} className="w-full h-full object-cover" /> : <User size={50} className="text-slate-300" />}
              </div>
              <div className="overflow-hidden z-10">
                <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Stethoscope size={14} /> تعرف على أطبائنا
                </p>
                <h4 className="text-3xl font-black text-slate-800 truncate mb-1">{currentDoctor.name}</h4>
                <p className="text-lg font-bold text-slate-400 italic">{currentDoctor.specialty}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Video & Main Notification */}
        <div className={`${getRightWidth()} bg-black flex items-center justify-center relative transition-all duration-700`}>
          <video className="w-full h-full object-cover opacity-60" autoPlay muted loop src="/videos/display.mp4" />
          
          {notification && (
            <div className="absolute inset-0 flex items-center justify-center p-12 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn">
              <div className="bg-white border-[15px] border-blue-600 rounded-[5rem] p-16 shadow-[0_0_100px_rgba(37,99,235,0.4)] animate-bounce text-center max-w-4xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400" />
                <Bell size={120} className="text-blue-600 mx-auto mb-10 drop-shadow-lg" />
                <h2 className="text-6xl font-black text-slate-800 leading-tight drop-shadow-sm">{notification}</h2>
                <div className="mt-10 flex items-center justify-center gap-4 text-blue-600">
                   <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                   <p className="text-xl font-black uppercase tracking-[0.3em]">برجاء الانتباه</p>
                   <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Marquee Footer */}
      <footer className="h-20 bg-blue-900 text-white overflow-hidden flex items-center relative z-20 border-t-4 border-white/10" style={{ backgroundColor: config.themeColor }}>
        <div className="absolute left-0 h-full bg-white/10 px-6 flex items-center font-black z-10 backdrop-blur-md">أخبار العيادة</div>
        <div className="animate-marquee px-4 text-3xl font-black" style={{ '--speed': `${settings?.ticker_speed || 20}s` } as any}>
          {settings?.ticker_content}
        </div>
      </footer>

      {/* Deep Customization Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-8 animate-fadeIn">
          <div className="bg-white rounded-[4rem] p-12 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-10 border-b-2 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Layout size={32}/></div>
                <h3 className="text-4xl font-black text-slate-800">تخصيص واجهة العرض</h3>
              </div>
              <button onClick={() => setShowConfig(false)} className="p-4 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X size={32}/></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               {/* Layout Controls */}
               <div className="space-y-6">
                  <h4 className="font-black text-blue-600 flex items-center gap-2 border-b pb-2"><Sliders size={18}/> إعدادات المساحة</h4>
                  <div className="space-y-4">
                     <div>
                       <label className="text-sm font-bold block mb-2">تقسيم الشاشة (العيادات : الفيديو)</label>
                       <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:border-blue-600" value={config.layoutSplit} onChange={e => setConfig({...config, layoutSplit: e.target.value as any})}>
                          <option value="1/4">الربع (1/4 : 3/4)</option>
                          <option value="1/3">الثلث (1/3 : 2/3)</option>
                          <option value="1/2">النصف (1/2 : 1/2)</option>
                          <option value="2/3">الثلثين (2/3 : 1/3)</option>
                       </select>
                     </div>
                     <div>
                        <label className="text-sm font-bold block mb-2">عدد أعمدة العيادات</label>
                        <input type="range" min="1" max="4" step="1" className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" value={config.columns} onChange={e => setConfig({...config, columns: parseInt(e.target.value)})}/>
                        <div className="flex justify-between text-xs font-black mt-2"><span>1</span><span>2</span><span>3</span><span>4</span></div>
                     </div>
                  </div>
               </div>

               {/* Aesthetics Controls */}
               <div className="space-y-6">
                  <h4 className="font-black text-blue-600 flex items-center gap-2 border-b pb-2"><Volume2 size={18}/> إعدادات المظهر والخط</h4>
                  <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold block mb-2">طول الكارت (px)</label>
                          <input type="text" className="w-full p-3 border rounded-xl font-bold" value={config.cardHeight} onChange={e => setConfig({...config, cardHeight: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-xs font-bold block mb-2">حجم الخط (rem)</label>
                          <input type="text" className="w-full p-3 border rounded-xl font-bold" value={config.fontSize} onChange={e => setConfig({...config, fontSize: e.target.value})} />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold block mb-2">لون السمة</label>
                          <input type="color" className="w-full h-12 p-1 border rounded-xl" value={config.themeColor} onChange={e => setConfig({...config, themeColor: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-xs font-bold block mb-2">خلفية الكروت</label>
                          <input type="color" className="w-full h-12 p-1 border rounded-xl" value={config.cardBg} onChange={e => setConfig({...config, cardBg: e.target.value})} />
                        </div>
                     </div>
                     <div>
                        <label className="text-xs font-bold block mb-2">لون الأرقام</label>
                        <input type="color" className="w-full h-12 p-1 border rounded-xl" value={config.cardTextColor} onChange={e => setConfig({...config, cardTextColor: e.target.value})} />
                     </div>
                  </div>
               </div>
            </div>

            <button onClick={() => setShowConfig(false)} className="w-full mt-12 bg-slate-900 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-black transition-all">تطبيق وحفظ التعديلات</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayScreen;
