
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, UserPlus, SkipBack, Repeat, Hash, ArrowLeftRight, Send, AlertCircle, RefreshCw, Play, Pause, Bell } from 'lucide-react';
import { toHindiDigits, playCallSequence, playSimpleSound } from '../utils';
import { Clinic, Notification, Transfer } from '../types';

const ControlPanel: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [password, setPassword] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Mock Data (Replace with Supabase fetch)
  const [clinics] = useState<Clinic[]>([
    { id: '1', number: 1, name: 'عيادة الباطنة', current_number: 12, linked_screens: ['1'], password: '123', status: 'active' },
    { id: '2', number: 2, name: 'عيادة الأطفال', current_number: 5, linked_screens: ['1'], password: '123', status: 'active' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClinic && password === selectedClinic.password) {
      setIsLoggedIn(true);
    } else {
      alert('كلمة السر خاطئة');
    }
  };

  const updateNumber = async (num: number) => {
    if (!selectedClinic) return;
    // Call API to update clinic number
    setSelectedClinic({ ...selectedClinic, current_number: num });
    playCallSequence(num, selectedClinic.number);
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
                <option value="">-- اختر --</option>
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
            <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700">دخول</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-100">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <div className="bg-white text-emerald-600 p-2 rounded-lg font-black text-xl">
            {toHindiDigits(selectedClinic?.current_number || 0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{selectedClinic?.name}</h1>
            <p className="text-xs opacity-80">{currentTime.toLocaleDateString('ar-EG')} - {currentTime.toLocaleTimeString('ar-EG')}</p>
          </div>
        </div>
        <button onClick={() => setIsLoggedIn(false)} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20">
          <LogOut size={18} /> خروج
        </button>
      </header>

      {/* Main Controls */}
      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
        
        {/* Call Controls */}
        <section className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold border-b pb-2 text-slate-500">تحكم النداء</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => updateNumber((selectedClinic?.current_number || 0) + 1)} className="flex flex-col items-center p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 hover:bg-emerald-100">
              <UserPlus className="mb-2" /> العميل التالي
            </button>
            <button onClick={() => updateNumber(Math.max(0, (selectedClinic?.current_number || 0) - 1))} className="flex flex-col items-center p-4 bg-slate-50 text-slate-700 rounded-xl border border-slate-100 hover:bg-slate-100">
              <SkipBack className="mb-2" /> العميل السابق
            </button>
            <button onClick={() => updateNumber(selectedClinic?.current_number || 0)} className="flex flex-col items-center p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 hover:bg-blue-100">
              <Repeat className="mb-2" /> تكرار النداء
            </button>
            <button onClick={() => {
              const num = prompt('ادخل رقم العميل:');
              if (num) updateNumber(parseInt(num));
            }} className="flex flex-col items-center p-4 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 hover:bg-purple-100">
              <Hash className="mb-2" /> نداء رقم معين
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
             <button className="flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
               <Pause size={18} /> توقف العيادة
             </button>
             <button className="flex items-center justify-center gap-2 p-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
               <Play size={18} /> استئناف
             </button>
             <button onClick={() => updateNumber(0)} className="col-span-2 flex items-center justify-center gap-2 p-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">
               <RefreshCw size={18} /> تصفير العداد
             </button>
          </div>
        </section>

        {/* Transfers & Messaging */}
        <section className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold border-b pb-2 text-slate-500">تحويل ومراسلة</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100">
              <ArrowLeftRight size={20} className="text-blue-500" /> تحويل العميل الحالي لعيادة أخرى
            </button>
            <button className="w-full flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100">
              <Send size={20} className="text-indigo-500" /> إرسال رسالة لعيادة أخرى
            </button>
            <button className="w-full flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100">
              <Bell size={20} className="text-amber-500" /> إرسال تنبيه للمدير
            </button>
          </div>
        </section>

        {/* Emergency & Custom Alerts */}
        <section className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold border-b pb-2 text-slate-500">تنبيهات طارئة</h3>
          <div className="grid grid-cols-1 gap-2">
            <button onClick={() => playSimpleSound('/audio/emergency.mp3')} className="bg-red-600 text-white p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700">
              <AlertCircle /> حالة حريق
            </button>
            <button onClick={() => playSimpleSound('/audio/emergency.mp3')} className="bg-red-500 text-white p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-red-600">
              <AlertCircle /> تسرب غاز
            </button>
            <button onClick={() => playSimpleSound('/audio/emergency.mp3')} className="bg-orange-600 text-white p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-orange-700">
              <AlertCircle /> عطل كهربائي
            </button>
            <button className="bg-slate-800 text-white p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-900 mt-2">
               نقطة التجمع
            </button>
          </div>
          <div className="pt-4 mt-4 border-t">
            <label className="text-xs text-slate-400 block mb-1">تنبيه باسم مريض</label>
            <div className="flex gap-2">
              <input type="text" placeholder="اسم المريض..." className="flex-1 border p-2 rounded-lg text-sm" />
              <button className="bg-emerald-600 text-white p-2 rounded-lg"><Send size={18} /></button>
            </div>
          </div>
        </section>
      </main>

      {/* Inbound Notifications Area */}
      <footer className="bg-white border-t p-4 h-48 overflow-y-auto">
        <h4 className="font-bold text-slate-500 mb-2 flex items-center gap-2">
          <Bell size={16} /> التنبيهات والتحويلات الواردة
        </h4>
        <div className="space-y-2">
          <div className="bg-blue-50 border-r-4 border-blue-500 p-3 rounded text-sm flex justify-between">
            <span>تم تحويل المريض رقم (١٤) من عيادة العيون</span>
            <span className="text-slate-400">١٠:٢٠ ص</span>
          </div>
          <div className="bg-amber-50 border-r-4 border-amber-500 p-3 rounded text-sm flex justify-between">
            <span>رسالة من المدير: يرجى سرعة الإنجاز</span>
            <span className="text-slate-400">٠٩:٤٥ ص</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ControlPanel;
