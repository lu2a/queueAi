
import React, { useState, useEffect } from 'react';
import { 
  LogOut, UserPlus, SkipBack, Repeat, Hash, ArrowLeftRight, Send, 
  AlertCircle, Play, Pause, Bell, Clock, ChevronRight, RefreshCw, 
  User, MessageSquare, ShieldAlert, Calendar, Activity
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
  
  // Notification Lists
  const [inboundNotifications, setInboundNotifications] = useState<Notification[]>([]);
  const [outboundNotifications, setOutboundNotifications] = useState<Notification[]>([]);
  
  // Input States
  const [customPatientName, setCustomPatientName] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [transferTargetId, setTransferTargetId] = useState('');
  const [manualTransferNumber, setManualTransferNumber] = useState('');
  const [msgToClinicTargetId, setMsgToClinicTargetId] = useState('');
  const [msgToClinicContent, setMsgToClinicContent] = useState('');
  const [msgToAdminContent, setMsgToAdminContent] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    fetchClinics();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLoggedIn && selectedClinic) {
      // 1. Subscribe to Clinic changes (Counter/Status)
      const clinicSub = subscribeToChanges('clinics', (payload) => {
        if (payload.new.id === selectedClinic.id) {
          setSelectedClinic(prev => ({ ...prev!, ...payload.new }));
        }
      });

      // 2. Subscribe to Notifications (Inbound & Outbound)
      const notifSub = subscribeToChanges('notifications', (payload) => {
        const n = payload.new as Notification;
        
        // Inbound: Directed to this clinic or Emergency
        if (n.to_clinic === selectedClinic.id || n.type === 'emergency') {
          setInboundNotifications(prev => [n, ...prev]);
          playSimpleSound('/audio/ring.mp3');
        }
        
        // Outbound: Sent by this clinic
        if (n.from_clinic === selectedClinic.name) {
          setOutboundNotifications(prev => [n, ...prev]);
        }
      });

      // Initial Fetch for logs
      fetchLogs();

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
    
    // Inbound
    const { data: inbound } = await supabase
      .from('notifications')
      .select('*')
      .or(`to_clinic.eq.${selectedClinic.id},type.eq.emergency`)
      .order('created_at', { ascending: false })
      .limit(20);
    if (inbound) setInboundNotifications(inbound);

    // Outbound
    const { data: outbound } = await supabase
      .from('notifications')
      .select('*')
      .eq('from_clinic', selectedClinic.name)
      .order('created_at', { ascending: false })
      .limit(20);
    if (outbound) setOutboundNotifications(outbound);
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

  // --- ACTIONS ---

  const updateNumber = async (num: number) => {
    if (!selectedClinic) return;
    const { error } = await supabase.from('clinics').update({ current_number: num }).eq('id', selectedClinic.id);
    if (!error) playCallSequence(num, selectedClinic.number);
    else alert("فشل تحديث الرقم");
  };

  const callManual = async () => {
    const num = parseInt(manualNumber);
    if (isNaN(num)) return alert("أدخل رقم صحيح");
    await updateNumber(num);
    setManualNumber('');
  };

  const handleTransfer = async (patientNum: number | null) => {
    if (!transferTargetId || !selectedClinic) return alert("اختر العيادة المحول إليها");
    const num = patientNum || selectedClinic.current_number;
    
    const { error } = await supabase.from('notifications').insert({
      from_clinic: selectedClinic.name,
      to_clinic: transferTargetId,
      message: `تحويل: مريض رقم (${num}) من ${selectedClinic.name}`,
      type: 'transfer',
      patient_number: num,
      to_admin: false
    });
    
    if(!error) {
      alert(`تم تحويل المريض ${num} بنجاح`);
      setManualTransferNumber('');
      setShowTransferModal(false);
    } else {
      console.error(error);
      alert("خطأ في التحويل: تأكد من إعدادات قاعدة البيانات");
    }
  };

  const callByName = async () => {
    if (!customPatientName || !selectedClinic) return;
    await supabase.from('notifications').insert({
      from_clinic: selectedClinic.name,
      message: customPatientName,
      type: 'name_call',
      to_admin: false
    });
    setCustomPatientName('');
    alert("تم إرسال نداء الاسم للشاشة");
  };

  const sendToOtherClinic = async () => {
    if (!msgToClinicTargetId || !msgToClinicContent || !selectedClinic) return;
    await supabase.from('notifications').insert({
      from_clinic: selectedClinic.name,
      to_clinic: msgToClinicTargetId,
      message: msgToClinicContent,
      type: 'normal',
      to_admin: false
    });
    setMsgToClinicContent('');
    alert("تم إرسال الرسالة للعيادة");
  };

  const sendToAdmin = async () => {
    if (!msgToAdminContent || !selectedClinic) return;
    await supabase.from('notifications').insert({
      from_clinic: selectedClinic.name,
      message: msgToAdminContent,
      type: 'normal',
      to_admin: true
    });
    setMsgToAdminContent('');
    alert('تم إرسال الرسالة للمدير');
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

  const resetCounter = async () => {
    if (selectedClinic && confirm('هل أنت متأكد من تصفير العداد؟')) {
      await supabase.from('clinics').update({ current_number: 0 }).eq('id', selectedClinic.id);
    }
  };

  const changeStatus = async (status: 'active' | 'paused') => {
    if (selectedClinic) await supabase.from('clinics').update({ status }).eq('id', selectedClinic.id);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-900 font-cairo">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border-t-8 border-emerald-600">
          <div className="flex flex-col items-center mb-8">
             <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full mb-4"><Activity size={40}/></div>
             <h2 className="text-3xl font-black text-slate-800">دخول العيادة</h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <select className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-emerald-600" onChange={(e) => setSelectedClinic(clinics.find(c => c.id === e.target.value) || null)}>
              <option value="">-- اختر العيادة --</option>
              {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="password" placeholder="كلمة المرور" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-emerald-600" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg hover:scale-[1.02] transition-all">دخول اللوحة</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen font-cairo overflow-x-hidden">
      {/* Dynamic Header */}
      <header className="bg-white border-b-4 border-slate-100 p-6 flex flex-wrap justify-between items-center px-10 shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <div className={`p-4 px-8 rounded-3xl font-black text-5xl shadow-xl transition-all duration-500 ${selectedClinic?.status === 'active' ? 'bg-emerald-600 text-white animate-pulse' : 'bg-red-600 text-white'}`}>
            {toHindiDigits(selectedClinic?.current_number || 0)}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">{selectedClinic?.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-slate-400 font-bold text-sm">
               <span className="flex items-center gap-1"><Calendar size={14}/> {currentTime.toLocaleDateString('ar-EG')}</span>
               <span className="flex items-center gap-1"><Clock size={14}/> {currentTime.toLocaleTimeString('ar-EG')}</span>
               <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase ${selectedClinic?.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                 {selectedClinic?.status === 'active' ? 'نشطة الآن' : 'متوقفة مؤقتاً'}
               </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={resetCounter} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><RefreshCw size={24}/></button>
          <button onClick={() => setIsLoggedIn(false)} className="bg-slate-100 p-4 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all shadow-sm"><LogOut size={24}/></button>
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 w-full max-w-[1800px] mx-auto">
        
        {/* RIGHT COLUMN: MAIN CONTROLS & TRANSFERS */}
        <div className="xl:col-span-4 space-y-6">
          {/* Main Controls */}
          <section className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xl font-black flex items-center gap-3 text-emerald-600"><Activity size={20}/> التحكم في الطابور</h3>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => updateNumber((selectedClinic?.current_number || 0) + 1)} className="p-10 bg-emerald-600 text-white rounded-[2.5rem] font-black text-2xl shadow-lg hover:scale-105 transition-all">العميل التالي</button>
              <button onClick={() => updateNumber(Math.max(0, (selectedClinic?.current_number || 0) - 1))} className="p-10 bg-slate-100 text-slate-600 rounded-[2.5rem] font-black text-2xl shadow-inner">العميل السابق</button>
              <button onClick={() => updateNumber(selectedClinic?.current_number || 0)} className="p-8 bg-blue-50 text-blue-700 rounded-[2rem] font-black border-2 border-blue-100 flex flex-col items-center gap-2"><Repeat size={24}/> تكرار النداء</button>
              <div className="space-y-2">
                 <input type="number" placeholder="رقم مخصص" className="w-full p-4 border-2 rounded-2xl font-bold text-center text-xl outline-none focus:border-indigo-600" value={manualNumber} onChange={e => setManualNumber(e.target.value)} />
                 <button onClick={callManual} className="w-full p-3 bg-indigo-600 text-white rounded-xl font-bold text-sm">نداء الرقم</button>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => changeStatus('paused')} className={`flex-1 p-5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${selectedClinic?.status === 'paused' ? 'bg-red-600 text-white shadow-lg' : 'bg-red-50 text-red-600 border'}`}><Pause /> توقف العيادة</button>
              <button onClick={() => changeStatus('active')} className={`flex-1 p-5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${selectedClinic?.status === 'active' ? 'bg-green-600 text-white shadow-lg' : 'bg-green-50 text-green-600 border'}`}><Play /> استئناف العيادة</button>
            </div>
          </section>

          {/* Transfer Section */}
          <section className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xl font-black flex items-center gap-3 text-amber-500"><ArrowLeftRight size={20}/> تحويل مريض</h3>
            <div className="space-y-4">
               <div>
                  <label className="text-xs font-black text-slate-400 block mb-2 px-1">اختر العيادة المستهدفة:</label>
                  <select className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-amber-500" value={transferTargetId} onChange={e => setTransferTargetId(e.target.value)}>
                    <option value="">-- العيادة المستهدفة --</option>
                    {clinics.filter(c => c.id !== selectedClinic?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
               <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => handleTransfer(null)} className="w-full p-5 bg-amber-500 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center gap-3">
                    تحويل العميل الحالي ({selectedClinic?.current_number})
                  </button>
                  <div className="flex gap-2">
                    <input type="number" placeholder="رقم عميل آخر..." className="flex-1 p-4 border-2 rounded-2xl font-bold text-center" value={manualTransferNumber} onChange={e => setManualTransferNumber(e.target.value)} />
                    <button onClick={() => handleTransfer(parseInt(manualTransferNumber))} className="p-4 bg-slate-800 text-white rounded-2xl font-bold px-8">تحويل</button>
                  </div>
               </div>
            </div>
          </section>
        </div>

        {/* MIDDLE COLUMN: MESSAGING & NAMES */}
        <div className="xl:col-span-4 space-y-6">
          <section className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xl font-black flex items-center gap-3 text-indigo-600"><MessageSquare size={20}/> المراسلة والنداء</h3>
            
            <div className="space-y-4">
               <div className="pt-2">
                  <label className="text-xs font-black text-slate-400 block mb-2 px-1 uppercase">نداء مريض بالاسم (للشاشة):</label>
                  <div className="flex gap-2">
                    <input className="flex-1 p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600" placeholder="اسم المريض بالكامل..." value={customPatientName} onChange={e => setCustomPatientName(e.target.value)} />
                    <button onClick={callByName} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg"><User size={24}/></button>
                  </div>
               </div>

               <div className="pt-4 border-t-2 border-slate-50">
                  <label className="text-xs font-black text-slate-400 block mb-2 px-1 uppercase">رسالة لعيادة أخرى:</label>
                  <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold mb-2" value={msgToClinicTargetId} onChange={e => setMsgToClinicTargetId(e.target.value)}>
                     <option value="">-- اختر العيادة --</option>
                     {clinics.filter(c => c.id !== selectedClinic?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input className="flex-1 p-3 border rounded-xl font-bold" placeholder="نص الرسالة..." value={msgToClinicContent} onChange={e => setMsgToClinicContent(e.target.value)} />
                    <button onClick={sendToOtherClinic} className="bg-emerald-600 text-white p-3 rounded-xl"><Send size={20}/></button>
                  </div>
               </div>

               <div className="pt-4 border-t-2 border-slate-50">
                  <label className="text-xs font-black text-slate-400 block mb-2 px-1 uppercase">رسالة للمدير:</label>
                  <div className="flex gap-2">
                    <input className="flex-1 p-4 bg-slate-100 border-2 border-white rounded-2xl font-bold" placeholder="أدخل رسالتك للإدارة..." value={msgToAdminContent} onChange={e => setMsgToAdminContent(e.target.value)} />
                    <button onClick={sendToAdmin} className="bg-slate-800 text-white p-4 rounded-2xl shadow-md"><ShieldAlert size={20}/></button>
                  </div>
               </div>
            </div>
          </section>

          {/* Emergency Grid */}
          <section className="bg-white p-8 rounded-[2.5rem] border-2 border-red-50 shadow-sm space-y-6">
            <h3 className="text-xl font-black flex items-center gap-3 text-red-600"><AlertCircle size={20}/> حالات الطوارئ</h3>
            <div className="grid grid-cols-2 gap-3">
               <button onClick={() => sendEmergency('تنبيه: حريق في المبنى!')} className="p-4 bg-red-600 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-red-700 transition-all"><AlertCircle size={16}/> حريق</button>
               <button onClick={() => sendEmergency('تنبيه: تسرب غاز!')} className="p-4 bg-orange-600 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-orange-700 transition-all"><AlertCircle size={16}/> غاز</button>
               <button onClick={() => sendEmergency('عطل كهربائي طارئ!')} className="p-4 bg-amber-600 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-amber-700 transition-all"><AlertCircle size={16}/> كهرباء</button>
               <button onClick={() => sendEmergency('يرجى التوجه لنقطة التجمع!')} className="p-4 bg-blue-600 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-blue-700 transition-all"><Activity size={16}/> تجمع</button>
               <button onClick={() => { const m = prompt('رسالة طوارئ مخصصة:'); if(m) sendEmergency(m); }} className="col-span-2 p-4 border-2 border-dashed border-red-200 text-red-600 rounded-2xl font-black text-sm hover:bg-red-50 transition-all">طوارئ مخصصة...</button>
            </div>
          </section>
        </div>

        {/* LEFT COLUMN: ACTIVITY LOGS */}
        <div className="xl:col-span-4 space-y-6 h-full flex flex-col">
          <section className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-black flex items-center gap-3 text-blue-600"><Bell size={20}/> النشاط والتنبيهات</h3>
               <button onClick={fetchLogs} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-blue-600"><RefreshCw size={16}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                <div className="space-y-3">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">الواردة (Inbound)</p>
                   {inboundNotifications.length === 0 ? <p className="text-xs text-slate-300 italic py-4 text-center">لا توجد رسائل واردة</p> : 
                    inboundNotifications.map((n, i) => (
                      <div key={i} className={`p-4 rounded-2xl border-r-8 shadow-sm ${n.type === 'emergency' ? 'bg-red-50 border-red-600 animate-shake' : 'bg-blue-50 border-blue-600'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-black opacity-50 uppercase">{n.from_clinic || 'النظام'}</span>
                          <span className="text-[9px] font-bold text-slate-400">{new Date(n.created_at).toLocaleTimeString('ar-EG')}</span>
                        </div>
                        <p className="font-bold text-slate-800 text-sm leading-relaxed">{n.message}</p>
                      </div>
                    ))
                   }
                </div>

                <div className="space-y-3 mt-8">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">الصادرة (Outbound)</p>
                   {outboundNotifications.length === 0 ? <p className="text-xs text-slate-300 italic py-4 text-center">لا توجد رسائل صادرة</p> : 
                    outboundNotifications.map((n, i) => (
                      <div key={i} className="p-4 rounded-2xl border-r-8 bg-slate-50 border-slate-300 shadow-sm opacity-80">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-black opacity-50 uppercase">{n.type}</span>
                          <span className="text-[9px] font-bold text-slate-400">{new Date(n.created_at).toLocaleTimeString('ar-EG')}</span>
                        </div>
                        <p className="font-bold text-slate-600 text-sm leading-relaxed">{n.message}</p>
                      </div>
                    ))
                   }
                </div>
             </div>
          </section>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="p-6 bg-white border-t-2 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">
         نظام النداء الآلي &copy; إدارة عيادات {selectedClinic?.name}
      </footer>
    </div>
  );
};

export default ControlPanel;
