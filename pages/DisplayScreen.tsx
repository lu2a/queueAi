
import React, { useState, useEffect } from 'react';
import { Maximize, Settings as SettingsIcon, Bell, Clock, Calendar } from 'lucide-react';
import { toHindiDigits, playCallSequence } from '../utils';
import { Clinic, SystemSettings } from '../types';

const DisplayScreen: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showConfig, setShowConfig] = useState(false);
  
  // Settings & Clinics (Mock)
  const [settings] = useState<SystemSettings>({
    id: '1',
    center_name: 'مجمع الأمل الطبي التخصصي',
    speech_speed: 1,
    ticker_speed: 20,
    ticker_content: 'أهلاً بكم في مجمع الأمل الطبي.. نتمنى لكم دوام الصحة والعافية.. نرجو الالتزام بمواعيد الحجز..'
  });

  const [clinics, setClinics] = useState<Clinic[]>([
    { id: '1', number: 1, name: 'عيادة القلب', current_number: 22, linked_screens: ['1'], password: '1', status: 'active', last_called_at: '2023-10-10 10:00:00' },
    { id: '2', number: 2, name: 'عيادة العظام', current_number: 15, linked_screens: ['1'], password: '1', status: 'paused', last_called_at: '2023-10-10 10:05:00' },
    { id: '3', number: 3, name: 'عيادة الجلدية', current_number: 8, linked_screens: ['1'], password: '1', status: 'active', last_called_at: '2023-10-10 10:10:00' },
    { id: '4', number: 4, name: 'عيادة الصدر', current_number: 4, linked_screens: ['1'], password: '1', status: 'active', last_called_at: '2023-10-10 10:15:00' },
  ]);

  const [notification, setNotification] = useState<{msg: string, type: string} | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate a call for demonstration
  useEffect(() => {
    const demoCall = setTimeout(() => {
      setNotification({ msg: `على العميل رقم ${toHindiDigits(23)} التوجه لعيادة القلب`, type: 'call' });
      playCallSequence(23, 1);
      setTimeout(() => setNotification(null), 8000);
    }, 5000);
    return () => clearTimeout(demoCall);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
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
          <button 
            onClick={() => setIsLoggedIn(true)}
            className="w-full bg-blue-600 text-white py-3 rounded font-bold"
          >
            تفعيل الشاشة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden relative">
      
      {/* Header Bar */}
      <header className="h-20 bg-white border-b shadow-sm flex items-center justify-between px-8 z-10">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600 text-white p-3 rounded-xl font-black text-2xl">
            {settings.center_name}
          </div>
          <div className="flex flex-col text-slate-500">
            <span className="flex items-center gap-2 font-bold"><Clock size={16} /> {currentTime.toLocaleTimeString('ar-EG')}</span>
            <span className="flex items-center gap-2 text-xs"><Calendar size={14} /> {currentTime.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setShowConfig(!showConfig)} className="p-2 text-slate-400 hover:text-slate-600"><SettingsIcon size={24} /></button>
          <button onClick={toggleFullScreen} className="p-2 text-slate-400 hover:text-slate-600"><Maximize size={24} /></button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left: Clinic Cards (1/3) */}
        <div className="w-1/3 p-4 bg-slate-200 overflow-y-auto border-l shadow-inner grid grid-cols-2 gap-4 auto-rows-min">
          {clinics.map(clinic => (
            <div key={clinic.id} className="bg-white rounded-2xl shadow-md p-4 flex flex-col items-center justify-center text-center border-b-4 border-blue-500">
              <span className="text-xs text-slate-400 mb-1">{clinic.name}</span>
              <span className="text-5xl font-black text-blue-800 my-2">{toHindiDigits(clinic.current_number)}</span>
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-3 h-3 rounded-full ${clinic.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] text-slate-500">{clinic.status === 'active' ? 'نشطة' : 'متوقفة'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Video/Media (2/3) */}
        <div className="w-2/3 bg-black flex items-center justify-center relative">
          <video 
            className="w-full h-full object-cover opacity-80"
            autoPlay 
            muted 
            loop
            src="https://www.w3schools.com/html/mov_bbb.mp4"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
        </div>
      </main>

      {/* Ticker Bar */}
      <footer className="h-16 bg-blue-900 text-white overflow-hidden flex items-center">
        <div 
          className="animate-marquee px-4 text-2xl font-bold"
          style={{ '--speed': `${settings.ticker_speed}s` } as any}
        >
          {settings.ticker_content}
        </div>
      </footer>

      {/* Notification Overlay */}
      {notification && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl z-50">
          <div className="bg-white border-4 border-blue-600 rounded-3xl p-8 shadow-2xl animate-bounce flex items-center gap-8">
            <div className="bg-blue-600 text-white p-6 rounded-2xl">
              <Bell size={64} />
            </div>
            <div className="flex-1">
              <h2 className="text-4xl font-black text-slate-800 leading-relaxed">
                {notification.msg}
              </h2>
            </div>
          </div>
        </div>
      )}

      {/* Simple Config Modal */}
      {showConfig && (
        <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center p-10">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full">
            <h3 className="text-2xl font-bold mb-6 flex justify-between">
              إعدادات العرض
              <button onClick={() => setShowConfig(false)} className="text-slate-400">×</button>
            </h3>
            <div className="grid grid-cols-2 gap-6">
               <div>
                 <label className="block text-sm mb-1">عدد الأعمدة</label>
                 <select className="w-full p-2 border rounded"><option>1</option><option selected>2</option><option>3</option></select>
               </div>
               <div>
                 <label className="block text-sm mb-1">حجم الخط</label>
                 <select className="w-full p-2 border rounded"><option>صغير</option><option selected>متوسط</option><option>كبير</option></select>
               </div>
               <div>
                 <label className="block text-sm mb-1">تقسيم الشاشة</label>
                 <select className="w-full p-2 border rounded"><option>1/4</option><option selected>1/3</option><option>1/2</option></select>
               </div>
               <div>
                 <label className="block text-sm mb-1">لون السمة</label>
                 <input type="color" className="w-full h-10 p-1 rounded" defaultValue="#2563eb" />
               </div>
            </div>
            <button onClick={() => setShowConfig(false)} className="mt-8 w-full bg-blue-600 text-white py-3 rounded-xl font-bold">حفظ الإعدادات</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayScreen;
