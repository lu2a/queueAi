
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
        // الاستماع للرسائل الموجهة لهذه العيادة أو الطوارئ
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
    
    const { error } = await supabase.from('notifications').insert({
      from_clinic: selectedClinic.name,
      to_clinic: transferTargetId,
      message: `تم تحويل العميل رقم (${num}) إليكم من ${selectedClinic.name}`,
      type: 'transfer',
      patient_number: num
    });
    
    if(!error) {
      alert(`تم تحويل العميل ${num} بنجاح`);
      setShowTransferModal(false);
    } else {
      alert("خطأ في التحويل");
    }
  };

  const callByName = async () => {
    if (!customPatient || !selectedClinic) return;
    await supabase.from('notifications').insert({
      from_clinic: selectedClinic.name,
      message: customPatient,
      type: 'name_call'
    });
    setCustomPatient('');
  };

  const sendToAdmin = async (msg: string) => {
    await supabase.from('notifications').insert({
      from_clinic: selectedClinic?.name,
      message: msg,
      type: 'normal',
      to_admin: true
    });
    alert('تم إرسال الرسالة للمدير');
  };

  const changeStatus = async (status: 'active' | 'paused') => {
    if (selectedClinic) await supabase.from('clinics').update({ status }).eq('id', selectedClinic.id);
  };

  const resetCounter = async () => {
    if (selectedClinic && confirm('هل أنت متأكد من تصفير العداد لهذه العيادة؟')) {
      await supabase.from('clinics').update({ current_number: 0 }).eq('id', selectedClinic.id);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-900">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-emerald-100 text-emerald-600 p-4 rounded-3xl mb-4"><LogOut size={40} className="rotate-180" /></div>
            <h2 className="text-3xl font-black text-slate-800">دخول العيادة</h2>
          </div>
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
          <div><h1 className="text-2xl font-black text-slate-800">{selectedClinic?.name}</h1></div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={resetCounter} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><RefreshCw /></button>
          <button onClick={() => setIsLoggedIn(false)} className="bg-slate-100 p-4 rounded-2xl"><LogOut /></button>
        </div>
      </header>

      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1600px] mx-auto w-full">
        <section className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] shadow-sm border space-y-8">
          <h3 className="text-xl font-black flex items-center gap-3"><UserPlus className="text-emerald-500" /> التحكم</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => updateNumber((selectedClinic?.current_number || 0) + 1)} className="p-8 bg-emerald-600 text-white rounded-[2rem] font-black">العميل التالي</button>
            <button onClick={() => updateNumber(Math.max(0, (selectedClinic?.current_number || 0) - 1))} className="p-8 bg-slate-100 text-slate-600 rounded-[2rem] font-black">السابق</button>
            <button onClick={() => updateNumber(selectedClinic?.current_number || 0)} className="p-8 bg-blue-50 text-blue-700 rounded-[2rem] font-black border-2 border-blue-100">تكرار</button>
            <button onClick={() => setShowTransferModal(true)} className="p-8 bg-amber-50 text-amber-700 rounded-[2rem] font-black border-2 border-amber-100 flex flex-col items-center"><ArrowLeftRight size={32} /> تحويل</button>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-6 border-t">
             <button onClick={() => changeStatus('paused')} className={`p-5 rounded-2xl font-bold flex items-center justify-center gap-2 ${selectedClinic?.status === 'paused' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}><Pause /> توقف</button>
             <button onClick={() => changeStatus('active')} className={`p-5 rounded-2xl font-bold flex items-center justify-center gap-2 ${selectedClinic?.status === 'active' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600'}`}><Play /> استئناف</button>
          </div>
        </section>

        <section className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] shadow-sm border space-y-6">
          <h3 className="text-xl font-black flex items-center gap-3"><Send className="text-indigo-500" /> نداء وإرسال</h3>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-bold text-slate-500 mb-2 block">نداء باسم مريض (سيظهر على الشاشة):</label>
              <div className="flex gap-2">
                <input type="text" placeholder="اسم المريض..." className="flex-1 p-4 bg-slate-50 border-2 rounded-2xl font-bold" value={customPatient} onChange={e => setCustomPatient(e.target.value)} />
                <button onClick={callByName} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg"><Send /></button>
              </div>
            </div>
            <button onClick={() => sendToAdmin('نرجو المساعدة في عيادتنا للأهمية')} className="w-full flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] font-bold border"><div className="flex items-center gap-3"><Bell className="text-amber-500" /> مراسلة المدير</div><ChevronRight size={18} /></button>
            <div className="pt-6 border-t space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase">الطوارئ</p>
              <button onClick={() => supabase.from('notifications').insert({ from_clinic: selectedClinic?.name, message: 'طوارئ طبية!', type: 'emergency' })} className="w-full bg-red-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2"><AlertCircle /> نداء طوارئ</button>
            </div>
          </div>
        </section>

        <section className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] shadow-sm border flex flex-col h-[650px]">
          <h3 className="text-xl font-black flex items-center gap-3 mb-6"><Bell className="text-amber-500" /> التنبيهات الواردة</h3>
          <div className="flex-1 overflow-y-auto space-y-4">
            {inboundNotifications.length === 0 ? <p className="text-center text-slate-300 mt-20">لا توجد رسائل</p> : 
              inboundNotifications.map((n, i) => (
                <div key={i} className={`p-4 rounded-2xl border-r-4 ${n.type === 'emergency' ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'}`}>
                   <p className="font-bold">{n.message}</p>
                   <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleTimeString('ar-EG')}</span>
                </div>
              ))
            }
          </div>
        </section>
      </main>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full animate-slideIn">
            <h3 className="text-2xl font-black mb-6">تحويل مريض</h3>
            <div className="space-y-4">
              <label className="block text-sm font-bold">العيادة المستهدفة</label>
              <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={transferTargetId} onChange={e => setTransferTargetId(e.target.value)}>
                <option value="">-- اختر العيادة --</option>
                {clinics.filter(c => c.id !== selectedClinic?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-1 gap-3 pt-4">
                <button onClick={() => handleTransfer(null)} className="bg-blue-600 text-white p-4 rounded-2xl font-bold">تحويل المريض الحالي ({selectedClinic?.current_number})</button>
                <div className="flex gap-2">
                  <input type="number" placeholder="رقم تذكرة آخر..." className="flex-1 p-4 border rounded-2xl text-center font-bold" id="manualNum" />
                  <button onClick={() => {
                    const val = (document.getElementById('manualNum') as HTMLInputElement).value;
                    if(val) handleTransfer(parseInt(val));
                  }} className="bg-emerald-600 text-white p-4 rounded-2xl font-bold">تحويل</button>
                </div>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="w-full p-4 text-slate-400 font-bold mt-2">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
