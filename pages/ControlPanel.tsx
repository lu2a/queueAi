
import React, { useState, useEffect } from 'react';
import { 
  LogOut, UserPlus, SkipBack, Repeat, Hash, ArrowLeftRight, Send, 
  AlertCircle, Play, Pause, Bell, Clock, ChevronRight, RefreshCw, 
  User, MessageSquare, ShieldAlert, Calendar, Activity, Zap, Flame, Droplets
} from 'lucide-react';
import { toHindiDigits, playCallSequence, playSimpleSound } from '../utils';
import { Clinic, Notification } from '../types';
import { supabase, subscribeToChanges } from '../supabase';

const ControlPanel: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [password, setPassword] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [inboundLogs, setInboundLogs] = useState<Notification[]>([]);
  const [outboundLogs, setOutboundLogs] = useState<Notification[]>([]);
  
  const [customName, setCustomName] = useState('');
  const [manualCallNum, setManualCallNum] = useState('');
  const [transferTarget, setTransferTarget] = useState('');
  const [manualTransferNum, setManualTransferNum] = useState('');
  const [otherClinicMsgTarget, setOtherClinicMsgTarget] = useState('');
  const [otherClinicMsgText, setOtherClinicMsgText] = useState('');
  const [adminMsgText, setAdminMsgText] = useState('');

  useEffect(() => {
    fetchClinics();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLoggedIn && selectedClinic) {
      fetchLogs();
      const clinicSub = subscribeToChanges('clinics', (payload) => {
        if (payload.new.id === selectedClinic.id) {
          setSelectedClinic(prev => ({ ...prev!, ...payload.new }));
        }
      });

      const notifSub = subscribeToChanges('notifications', (payload) => {
        const n = payload.new as Notification;
        if (n.to_clinic === selectedClinic.id || n.type === 'emergency') {
          setInboundLogs(prev => [n, ...prev]);
          playSimpleSound('/audio/ring.mp3');
        }
        if (n.from_clinic === selectedClinic.name) {
          setOutboundLogs(prev => [n, ...prev]);
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

  const fetchLogs = async () => {
    if (!selectedClinic) return;
    const { data: inbound } = await supabase.from('notifications')
      .select('*').or(`to_clinic.eq.${selectedClinic.id},type.eq.emergency`)
      .order('created_at', { ascending: false }).limit(15);
    if (inbound) setInboundLogs(inbound);

    const { data: outbound } = await supabase.from('notifications')
      .select('*').eq('from_clinic', selectedClinic.name)
      .order('created_at', { ascending: false }).limit(15);
    if (outbound) setOutboundLogs(outbound);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clinic = clinics.find(c => c.id === selectedClinic?.id);
    if (clinic && password === clinic.password) {
      setIsLoggedIn(true);
      setSelectedClinic(clinic);
    } else { alert('كلمة السر خاطئة'); }
  };

  const updateNumber = async (num: number) => {
    if (!selectedClinic) return;
    const { error } = await supabase.from('clinics').update({ current_number: num }).eq('id', selectedClinic.id);
    if (!error) playCallSequence(num, selectedClinic.number);
  };

  const handleManualCall = () => {
    const num = parseInt(manualCallNum);
    if (!isNaN(num)) { updateNumber(num); setManualCallNum(''); }
  };

  const handleTransfer = async (patientNum: number | null) => {
    if (!transferTarget || !selectedClinic) return alert("اختر العيادة المحول إليها");
    const num = patientNum || selectedClinic.current_number;
    const { error } = await supabase.from('notifications').insert({
      from_clinic: selectedClinic.name,
      to_clinic: transferTarget,
      message: `تحويل عميل رقم (${num}) من ${selectedClinic.name}`,
      type: 'transfer',
      patient_number: num,
      to_admin: false
    });
    if(!error) { alert(`تم تحويل العميل ${num}`); setManualTransferNum(''); }
    else alert("خطأ في التحويل");
  };

  const sendEmergency = async (msg: string) => {
    if (!selectedClinic) return;
    await supabase.from('notifications').insert({
      from_clinic: selectedClinic.name,
      message: msg,
      type: 'emergency',
      to_admin: true
    });
    playSimpleSound('/audio/emergency.mp3');
  };

  const handleStatusChange = async (newStatus: 'active' | 'paused') => {
    if (!selectedClinic) return;
    const { error } = await supabase.from('clinics').update({ status: newStatus }).eq('id', selectedClinic.id);
    if (error) alert("فشل تحديث الحالة");
  };

  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 font-cairo">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border-t-8 border-emerald-600">
          <h2 className="text-3xl font-black text-center mb-8">دخول العيادة</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <select className="w-full p-4 border-2 rounded-2xl font-bold" onChange={(e) => setSelectedClinic(clinics.find(c => c.id === e.target.value) || null)}>
              <option value="">-- اختر العيادة --</option>
              {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="password" placeholder="كلمة المرور" className="w-full p-4 border-2 rounded-2xl font-bold" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-lg">دخول</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen font-cairo overflow-hidden">
      <header className="bg-white border-b-4 p-6 flex justify-between items-center px-10 shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <div className={`p-4 px-8 rounded-3xl font-black text-5xl shadow-xl ${selectedClinic?.status === 'active' ? 'bg-emerald-600 text-white animate-pulse' : 'bg-red-600 text-white'}`}>
            {toHindiDigits(selectedClinic?.current_number || 0)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">{selectedClinic?.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-slate-400 font-bold text-xs uppercase">
               <span className="flex items-center gap-1"><Calendar size={12}/> {currentTime.toLocaleDateString('ar-EG')}</span>
               <span className="flex items-center gap-1"><Clock size={12}/> {currentTime.toLocaleTimeString('ar-EG')}</span>
               <span className={`px-2 py-0.5 rounded-full ${selectedClinic?.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                 {selectedClinic?.status === 'active' ? 'نشطة' : 'متوقفة'}
               </span>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={async () => { if(confirm('تصفير عداد هذه العيادة؟')) await supabase.from('clinics').update({current_number: 0}).eq('id', selectedClinic?.id); }} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><RefreshCw/></button>
          <button onClick={() => setIsLoggedIn(false)} className="bg-slate-100 p-4 rounded-2xl"><LogOut/></button>
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 w-full max-w-[1800px] mx-auto overflow-y-auto">
        <div className="xl:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
            <h3 className="text-lg font-black flex items-center gap-2 text-emerald-600"><Activity size={18}/> التحكم في الطابور</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => updateNumber((selectedClinic?.current_number || 0) + 1)} className="p-8 bg-emerald-600 text-white rounded-3xl font-black text-xl shadow-lg hover:scale-105 transition-all">العميل التالي</button>
              <button onClick={() => updateNumber(Math.max(0, (selectedClinic?.current_number || 0) - 1))} className="p-8 bg-slate-100 text-slate-600 rounded-3xl font-black text-xl">السابق</button>
              <button onClick={() => updateNumber(selectedClinic?.current_number || 0)} className="p-6 bg-blue-50 text-blue-700 rounded-2xl font-black border flex flex-col items-center gap-1"><Repeat size={20}/> تكرار النداء</button>
              <div className="space-y-1">
                 <input type="number" placeholder="رقم مخصص" className="w-full p-3 border rounded-xl text-center font-bold" value={manualCallNum} onChange={e => setManualCallNum(e.target.value)} />
                 <button onClick={handleManualCall} className="w-full p-2 bg-slate-800 text-white rounded-xl text-xs font-bold">نداء رقم</button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => handleStatusChange('paused')} className={`flex-1 p-3 rounded-xl font-bold flex items-center justify-center gap-2 ${selectedClinic?.status === 'paused' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 border'}`}><Pause size={16}/> توقف</button>
              <button onClick={() => handleStatusChange('active')} className={`flex-1 p-3 rounded-xl font-bold flex items-center justify-center gap-2 ${selectedClinic?.status === 'active' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600 border'}`}><Play size={16}/> استئناف</button>
            </div>
          </section>

          <section className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
            <h3 className="text-lg font-black flex items-center gap-2 text-amber-500"><ArrowLeftRight size={18}/> تحويل مريض</h3>
            <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none" value={transferTarget} onChange={e => setTransferTarget(e.target.value)}>
               <option value="">-- اختر العيادة --</option>
               {clinics.filter(c => c.id !== selectedClinic?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="space-y-2">
               <button onClick={() => handleTransfer(null)} className="w-full p-4 bg-amber-500 text-white rounded-xl font-black shadow-md flex items-center justify-center gap-2">تحويل الحالي ({selectedClinic?.current_number})</button>
               <div className="flex gap-2">
                  <input type="number" className="flex-1 p-3 border rounded-xl text-center font-bold" placeholder="رقم عميل آخر" value={manualTransferNum} onChange={e => setManualTransferNum(e.target.value)} />
                  <button onClick={() => handleTransfer(parseInt(manualTransferNum))} className="bg-slate-800 text-white p-3 rounded-xl font-bold px-5">تحويل</button>
               </div>
            </div>
          </section>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
            <h3 className="text-lg font-black flex items-center gap-2 text-indigo-600"><MessageSquare size={18}/> المراسلة والنداء</h3>
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">نداء بالاسم للشاشة:</label>
                  <div className="flex gap-2">
                     <input className="flex-1 p-3 border rounded-xl font-bold" placeholder="اسم المريض..." value={customName} onChange={e => setCustomName(e.target.value)} />
                     <button onClick={async () => { if(customName) { await supabase.from('notifications').insert({ from_clinic: selectedClinic?.name, message: customName, type:'name_call' }); setCustomName(''); alert('تم إرسال نداء الاسم'); } }} className="bg-indigo-600 text-white p-3 rounded-xl"><User size={20}/></button>
                  </div>
               </div>
               <div className="pt-2 border-t">
                  <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">رسالة لعيادة أخرى:</label>
                  <select className="w-full p-2 border rounded-xl font-bold mb-2 text-sm" value={otherClinicMsgTarget} onChange={e => setOtherClinicMsgTarget(e.target.value)}>
                     <option value="">-- اختر العيادة --</option>
                     {clinics.filter(c => c.id !== selectedClinic?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                     <input className="flex-1 p-3 border rounded-xl font-bold text-sm" placeholder="اكتب رسالتك..." value={otherClinicMsgText} onChange={e => setOtherClinicMsgText(e.target.value)} />
                     <button onClick={async () => { if(otherClinicMsgTarget && otherClinicMsgText) { await supabase.from('notifications').insert({ from_clinic: selectedClinic?.name, to_clinic: otherClinicMsgTarget, message: otherClinicMsgText, type:'normal' }); setOtherClinicMsgText(''); alert('تم الإرسال'); } }} className="bg-emerald-600 text-white p-3 rounded-xl"><Send size={18}/></button>
                  </div>
               </div>
               <div className="pt-2 border-t">
                  <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">رسالة للمدير:</label>
                  <div className="flex gap-2">
                     <input className="flex-1 p-3 bg-slate-50 border rounded-xl font-bold text-sm" placeholder="رسالة طارئة للإدارة..." value={adminMsgText} onChange={e => setAdminMsgText(e.target.value)} />
                     <button onClick={async () => { if(adminMsgText) { await supabase.from('notifications').insert({ from_clinic: selectedClinic?.name, message: adminMsgText, type:'normal', to_admin: true }); setAdminMsgText(''); alert('تم الإرسال للإدارة'); } }} className="bg-slate-800 text-white p-3 rounded-xl"><ShieldAlert size={18}/></button>
                  </div>
               </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-[2.5rem] border-2 border-red-50 shadow-sm space-y-4">
             <h3 className="text-lg font-black flex items-center gap-2 text-red-600"><AlertCircle size={18}/> حالات الطوارئ</h3>
             <div className="grid grid-cols-2 gap-2">
                <button onClick={() => sendEmergency('تنبيه: حريق في المبنى!')} className="p-3 bg-red-600 text-white rounded-xl text-xs font-black flex items-center gap-2"><Flame size={14}/> حريق</button>
                <button onClick={() => sendEmergency('تنبيه: تسرب غاز!')} className="p-3 bg-orange-600 text-white rounded-xl text-xs font-black flex items-center gap-2"><Droplets size={14}/> غاز</button>
                <button onClick={() => sendEmergency('عطل كهربائي طارئ!')} className="p-3 bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-2"><Zap size={14}/> كهرباء</button>
                <button onClick={() => sendEmergency('يرجى التوجه لنقطة التجمع!')} className="p-3 bg-blue-600 text-white rounded-xl text-xs font-black flex items-center gap-2"><Activity size={14}/> تجمع</button>
                <button onClick={() => { const m = prompt('رسالة طوارئ مخصصة:'); if(m) sendEmergency(m); }} className="col-span-2 p-3 border-2 border-dashed border-red-200 text-red-600 rounded-xl text-xs font-black">طوارئ مخصصة...</button>
             </div>
          </section>
        </div>

        <div className="xl:col-span-4 flex flex-col gap-6">
           <section className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex-1 flex flex-col overflow-hidden">
              <h3 className="text-lg font-black mb-4 border-b pb-2 flex items-center justify-between">
                النشاط <button onClick={fetchLogs} className="text-slate-300 hover:text-blue-500"><RefreshCw size={14}/></button>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-50 pb-1">الواردة (Inbound)</p>
                    {inboundLogs.map((n, i) => (
                      <div key={i} className={`p-3 rounded-xl border-r-4 text-xs font-bold ${n.type === 'emergency' ? 'bg-red-50 border-red-500 animate-shake' : 'bg-blue-50 border-blue-600'}`}>
                        <div className="flex justify-between mb-1 opacity-50 text-[9px]"><span>{n.from_clinic || 'النظام'}</span><span>{new Date(n.created_at).toLocaleTimeString('ar-EG')}</span></div>
                        {n.message}
                      </div>
                    ))}
                 </div>
                 <div className="space-y-2 mt-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-50 pb-1">الصادرة (Outbound)</p>
                    {outboundLogs.map((n, i) => (
                      <div key={i} className="p-3 rounded-xl border-r-4 bg-slate-50 border-slate-300 text-xs font-bold opacity-80">
                        <div className="flex justify-between mb-1 opacity-50 text-[9px]"><span>{n.type}</span><span>{new Date(n.created_at).toLocaleTimeString('ar-EG')}</span></div>
                        {n.message}
                      </div>
                    ))}
                 </div>
              </div>
           </section>
        </div>
      </main>
    </div>
  );
};

export default ControlPanel;
