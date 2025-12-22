
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, UserPlus, SkipBack, Repeat, Hash, ArrowLeftRight, Send, AlertCircle, Play, Pause, Bell, Clock, ChevronRight, RefreshCw } from 'lucide-react';
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
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [msgToAdmin, setMsgToAdmin] = useState('');

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
        const n = payload.new as Notification;
        if (n.to_clinic === selectedClinic.id || n.type === 'emergency') {
          setInboundNotifications(prev => [n, ...prev]);
          playSimpleSound('/audio/ring.mp3');
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
      alert('كلمة السر خاطئة');
    }
  };

  const updateNumber = async (num: number) => {
    if (!selectedClinic) return;
    const { error } = await supabase.from('clinics').update({ current_number: num }).eq('id', selectedClinic.id);
    if (!error) playCallSequence(num, selectedClinic.number);
    else alert("فشل تحديث الرقم");
  };

  const handleTransfer = async (patientNum: number | null) => {
    if (!transferTargetId || !selectedClinic) return;
    const num = patientNum || selectedClinic.current_number;
    
    // Ensure all mandatory fields from Supabase schema are included
    const { error } = await supabase.from('notifications').insert({
      from_clinic: selectedClinic.name,
      to_clinic: transferTargetId,
      message: `تم تحويل العميل رقم (${num}) إليكم من ${selectedClinic.name}`,
      type: 'transfer',
      patient_number: num,
      to_admin: false
    });
    
    if(!error) {
      alert(`تم تحويل العميل ${num} بنجاح`);
      setShowTransferModal(false);
    } else {
      console.error(error);
      alert("خطأ في التحويل: تأكد من إعدادات قاعدة البيانات");
    }
  };

  const callByName = async () => {
    if (!customPatient || !selectedClinic) return;
    await supabase.from('notifications').insert({
      from_clinic: selectedClinic.name,
      message: customPatient,
      type: 'name_call',
      to_admin: false
    });
    setCustomPatient('');
  };

  const sendToAdmin = async () => {
    if (!msgToAdmin) return;
    await supabase.from('notifications').insert({
      from_clinic: selectedClinic?.name,
      message: msgToAdmin,
      type: 'normal',
      to_admin: true
    });
    setMsgToAdmin('');
    alert('تم إرسال الرسالة للمدير');
  };

  const resetCounter = async () => {
    if (selectedClinic && confirm('هل أنت متأكد من تصفير العداد لهذه العيادة؟')) {
      await supabase.from('clinics').update({ current_number: 0 }).eq('id', selectedClinic.id);
    }
  };

  const changeStatus = async (status: 'active' | 'paused') => {
    if (selectedClinic) await supabase.from('clinics').update({ status }).eq('id', selectedClinic.id);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-900">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md">
          <h2 className="text-3xl font-black text-center mb-8">دخول العيادة</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <select className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" onChange={(e) => setSelectedClinic(clinics.find(c => c.id === e.target.value) || null)}>
              <option value="">-- اختر العيادة --</option>
              {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="password" placeholder="كلمة المرور" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black">دخول</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <header className="bg-white border-b p-6 flex justify-between items-center px-10 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="bg-emerald-600 text-white p-4 px-6 rounded-3xl font-black text-4xl shadow-lg">{toHindiDigits(selectedClinic?.current_number || 0)}</div>
          <h1 className="text-2xl font-black">{selectedClinic?.name}</h1>
        </div>
        <div className="flex gap-4">
          <button onClick={resetCounter} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><RefreshCw /></button>
          <button onClick={() => setIsLoggedIn(false)} className="bg-slate-100 p-4 rounded-2xl"><LogOut /></button>
        </div>
      </header>

      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-[1600px] mx-auto">
        <section className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-8">
          <h3 className="text-xl font-black">التحكم</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => updateNumber((selectedClinic?.current_number || 0) + 1)} className="p-8 bg-emerald-600 text-white rounded-[2rem] font-black">التالي</button>
            <button onClick={() => updateNumber(Math.max(0, (selectedClinic?.current_number || 0) - 1))} className="p-8 bg-slate-100 rounded-[2rem] font-black">السابق</button>
            <button onClick={() => updateNumber(selectedClinic?.current_number || 0)} className="p-8 bg-blue-50 text-blue-700 rounded-[2rem] font-black border">تكرار</button>
            <button onClick={() => setShowTransferModal(true)} className="p-8 bg-amber-50 rounded-[2rem] font-black border flex flex-col items-center"><ArrowLeftRight size={32} /> تحويل</button>
          </div>
          <div className="flex gap-4 pt-6 border-t">
            <button onClick={() => changeStatus('paused')} className={`flex-1 p-4 rounded-xl font-bold ${selectedClinic?.status === 'paused' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}>توقف</button>
            <button onClick={() => changeStatus('active')} className={`flex-1 p-4 rounded-xl font-bold ${selectedClinic?.status === 'active' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600'}`}>استئناف</button>
          </div>
        </section>

        <section className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
          <h3 className="text-xl font-black">الرسائل</h3>
          <div className="space-y-4">
             <input className="w-full p-4 border rounded-2xl font-bold" placeholder="اسم المريض للنداء" value={customPatient} onChange={e => setCustomPatient(e.target.value)} />
             <button onClick={callByName} className="w-full p-4 bg-indigo-600 text-white rounded-2xl font-black">نداء بالاسم</button>
             <div className="pt-6 border-t">
                <textarea className="w-full p-4 border rounded-2xl h-24 mb-2" placeholder="رسالة للمدير..." value={msgToAdmin} onChange={e => setMsgToAdmin(e.target.value)} />
                <button onClick={sendToAdmin} className="w-full p-4 bg-slate-800 text-white rounded-2xl font-bold">إرسال للمدير</button>
             </div>
          </div>
        </section>

        <section className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col h-[600px]">
          <h3 className="text-xl font-black mb-6">التنبيهات الواردة</h3>
          <div className="flex-1 overflow-y-auto space-y-4">
             {inboundNotifications.map((n, i) => (
               <div key={i} className={`p-4 rounded-2xl border-r-4 ${n.type === 'emergency' ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'}`}>
                 <p className="font-bold">{n.message}</p>
                 <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleTimeString('ar-EG')}</span>
               </div>
             ))}
          </div>
        </section>
      </main>

      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full">
            <h3 className="text-2xl font-black mb-6">تحويل مريض</h3>
            <select className="w-full p-4 border rounded-2xl font-bold mb-4" value={transferTargetId} onChange={e => setTransferTargetId(e.target.value)}>
                <option value="">-- اختر العيادة --</option>
                {clinics.filter(c => c.id !== selectedClinic?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => handleTransfer(null)} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold mb-2">تحويل المريض الحالي</button>
            <button onClick={() => setShowTransferModal(false)} className="w-full p-4 text-slate-400 font-bold">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
