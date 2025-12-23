
import React, { useState, useEffect } from 'react';
import { 
  LogOut, Repeat, Send, 
  AlertCircle, Play, Pause, Bell, Clock, RefreshCw, 
  User, MessageSquare, ShieldAlert, Calendar, Activity, Zap, Flame, Droplets, Wind, X, ChevronLeft
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
  const [showLogs, setShowLogs] = useState(false); // لإظهار قائمة التنبيهات
  
  // الحالة الجديدة للتنبيه المنبثق
  const [activeNotif, setActiveNotif] = useState<Notification | null>(null);
  
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
          // تفعيل التنبيه المنبثق وصوت Ding
          setActiveNotif(n);
          playSimpleSound('/audio/ding.mp3');
          setTimeout(() => setActiveNotif(null), 6000);
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

  const getNotifClass = (type: string) => {
    switch(type) {
      case 'emergency': return 'border-red-600 notification-red';
      case 'transfer': return 'border-blue-600 notification-blue';
      default: return 'border-green-600 notification-green';
    }
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
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen font-cairo overflow-hidden relative">
      {/* تنبيه الجرس الجديد (نمط فيسبوك) */}
      {activeNotif && (
        <div className="fixed top-6 left-6 z-[100] animate-shake">
          <div className={`flex items-center gap-4 p-5 rounded-[2rem] shadow-2xl border-4 bg-white ${getNotifClass(activeNotif.type)}`}>
             <div className="relative">
                <div className="bg-slate-100 p-3 rounded-2xl">
                  <Bell size={32} className="animate-bounce text-slate-700" />
                </div>
                <span className="absolute -top-1 -right-1 bg-red-600 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center animate-ping"></span>
             </div>
             <div className="max-w-xs">
                <p className="text-sm font-black text-slate-800 leading-tight">{activeNotif.message}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">من: {activeNotif.from_clinic || 'النظام'}</p>
             </div>
          </div>
        </div>
      )}

      {/* الهيدر الجديد */}
      <header className="bg-white border-b-4 p-4 shadow-md sticky top-0 z-30">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* الجانب الأيمن: معلومات العيادة والحالة */}
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className={`p-3 px-6 rounded-2xl font-black text-4xl shadow-inner min-w-[120px] text-center ${selectedClinic?.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                {toHindiDigits(selectedClinic?.current_number || 0)}
             </div>
             <div>
                <h1 className="text-xl font-black text-slate-800">{selectedClinic?.name}</h1>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mt-1">
                   <span className="flex items-center gap-1"><Clock size={12}/> {currentTime.toLocaleTimeString('ar-EG')}</span>
                   <span className="flex items-center gap-1"><Calendar size={12}/> {currentTime.toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${selectedClinic?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedClinic?.status === 'active' ? '● العيادة نشطة' : '● العيادة متوقفة'}
                  </span>
                </div>
             </div>
          </div>

          {/* الجانب الأيسر: التنبيهات والخروج */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button 
              onClick={() => setShowLogs(!showLogs)} 
              className={`p-4 rounded-2xl transition-all relative ${showLogs ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <Bell size={24} />
              {inboundLogs.length > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
            </button>
            <button onClick={() => setIsLoggedIn(false)} className="bg-red-50 text-red-600 p-4 rounded-2xl hover:bg-red-600 hover:text-white transition-all">
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4 gap-6">
          
          {/* القسم الأول: التحكم بالطابور */}
          <section className="bg-white p-5 rounded-[2rem] border-t-8 border-emerald-500 shadow-sm flex flex-col gap-4">
            <h3 className="font-black text-lg text-emerald-700 flex items-center gap-2 border-b pb-2"><Activity size={20}/> التحكم بالطابور</h3>
            
            <div className="flex gap-2">
              <button onClick={() => updateNumber((selectedClinic?.current_number || 0) + 1)} className="flex-1 py-6 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:shadow-lg hover:scale-[1.02] transition-all">العميل التالي</button>
            </div>
            
            <div className="flex gap-2">
               <button onClick={() => updateNumber(Math.max(0, (selectedClinic?.current_number || 0) - 1))} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm">السابق</button>
               <button onClick={() => updateNumber(selectedClinic?.current_number || 0)} className="flex-1 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm flex items-center justify-center gap-1"><Repeat size={16}/> تكرار</button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
               <label className="text-[10px] font-black text-slate-400 mb-1 block">نداء رقم معين:</label>
               <div className="flex gap-2">
                  <input type="number" className="flex-1 p-2 border rounded-xl text-center font-bold" value={manualCallNum} onChange={e => setManualCallNum(e.target.value)} />
                  <button onClick={handleManualCall} className="bg-slate-800 text-white px-4 rounded-xl font-bold text-sm">نداء</button>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
              {selectedClinic?.status === 'active' ? (
                 <button onClick={() => handleStatusChange('paused')} className="py-3 bg-red-100 text-red-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Pause size={16}/> إيقاف مؤقت</button>
              ) : (
                 <button onClick={() => handleStatusChange('active')} className="py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Play size={16}/> استئناف العمل</button>
              )}
              <button onClick={async () => { if(confirm('هل أنت متأكد من تصفير العداد؟')) await supabase.from('clinics').update({current_number: 0}).eq('id', selectedClinic?.id); }} className="py-3 bg-slate-200 text-slate-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><RefreshCw size={16}/> تصفير</button>
            </div>
          </section>

          {/* القسم الثاني: التحويل */}
          <section className="bg-white p-5 rounded-[2rem] border-t-8 border-amber-500 shadow-sm flex flex-col gap-4">
            <h3 className="font-black text-lg text-amber-600 flex items-center gap-2 border-b pb-2"><Activity size={20} className="rotate-90"/> قسم التحويل</h3>
            
            <div>
               <label className="text-xs font-bold text-slate-500 mb-2 block">إلى عيادة:</label>
               <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm" value={transferTarget} onChange={e => setTransferTarget(e.target.value)}>
                  <option value="">-- اختر --</option>
                  {clinics.filter(c => c.id !== selectedClinic?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
            </div>

            <button onClick={() => handleTransfer(null)} className="w-full py-4 bg-amber-500 text-white rounded-xl font-black shadow-md hover:bg-amber-600 transition-all">
               تحويل العميل الحالي ({toHindiDigits(selectedClinic?.current_number || 0)})
            </button>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mt-auto">
               <label className="text-[10px] font-black text-amber-700 mb-1 block">تحويل عميل مخصص:</label>
               <div className="flex gap-2">
                  <input type="number" placeholder="رقم العميل" className="flex-1 p-2 border rounded-xl text-center font-bold" value={manualTransferNum} onChange={e => setManualTransferNum(e.target.value)} />
                  <button onClick={() => handleTransfer(parseInt(manualTransferNum))} className="bg-slate-800 text-white px-4 rounded-xl font-bold text-sm">تحويل</button>
               </div>
            </div>
          </section>

          {/* القسم الثالث: المراسلة والتنبيهات */}
          <section className="bg-white p-5 rounded-[2rem] border-t-8 border-indigo-500 shadow-sm flex flex-col gap-4">
             <h3 className="font-black text-lg text-indigo-600 flex items-center gap-2 border-b pb-2"><MessageSquare size={20}/> المراسلة والتنبيهات</h3>
             
             <div className="space-y-3">
                <div className="flex gap-2 items-end">
                   <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-400 mb-1 block">إذاعة اسم عميل:</label>
                      <input className="w-full p-2 border rounded-xl font-bold text-sm" placeholder="الاسم..." value={customName} onChange={e => setCustomName(e.target.value)} />
                   </div>
                   <button onClick={async () => { if(customName) { await supabase.from('notifications').insert({ from_clinic: selectedClinic?.name, message: customName, type:'name_call' }); setCustomName(''); alert('تم الإرسال'); } }} className="bg-indigo-600 text-white p-2 h-10 w-10 rounded-xl flex items-center justify-center"><User size={18}/></button>
                </div>

                <div className="border-t pt-3">
                   <label className="text-[10px] font-black text-slate-400 mb-1 block">تنبيه لعيادة أخرى:</label>
                   <select className="w-full p-2 mb-2 border rounded-xl font-bold text-xs" value={otherClinicMsgTarget} onChange={e => setOtherClinicMsgTarget(e.target.value)}>
                      <option value="">-- العيادة --</option>
                      {clinics.filter(c => c.id !== selectedClinic?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <div className="flex gap-2">
                      <input className="flex-1 p-2 border rounded-xl font-bold text-sm" placeholder="الرسالة..." value={otherClinicMsgText} onChange={e => setOtherClinicMsgText(e.target.value)} />
                      <button onClick={async () => { if(otherClinicMsgTarget && otherClinicMsgText) { await supabase.from('notifications').insert({ from_clinic: selectedClinic?.name, to_clinic: otherClinicMsgTarget, message: otherClinicMsgText, type:'normal' }); setOtherClinicMsgText(''); alert('تم الإرسال'); } }} className="bg-indigo-600 text-white p-2 h-10 w-10 rounded-xl flex items-center justify-center"><Send size={16}/></button>
                   </div>
                </div>

                <div className="border-t pt-3">
                   <label className="text-[10px] font-black text-slate-400 mb-1 block">تنبيه للمدير:</label>
                   <div className="flex gap-2">
                      <input className="flex-1 p-2 border rounded-xl font-bold text-sm" placeholder="نص الرسالة..." value={adminMsgText} onChange={e => setAdminMsgText(e.target.value)} />
                      <button onClick={async () => { if(adminMsgText) { await supabase.from('notifications').insert({ from_clinic: selectedClinic?.name, message: adminMsgText, type:'normal', to_admin: true }); setAdminMsgText(''); alert('تم الإرسال'); } }} className="bg-slate-800 text-white p-2 h-10 w-10 rounded-xl flex items-center justify-center"><ShieldAlert size={16}/></button>
                   </div>
                </div>
             </div>
          </section>

          {/* القسم الرابع: الطوارئ */}
          <section className="bg-white p-5 rounded-[2rem] border-t-8 border-red-600 shadow-sm flex flex-col gap-4">
             <h3 className="font-black text-lg text-red-600 flex items-center gap-2 border-b pb-2"><AlertCircle size={20}/> قسم الطوارئ</h3>
             
             <div className="grid grid-cols-2 gap-3">
                <button onClick={() => sendEmergency('تنبيه: حريق في المبنى!')} className="p-3 bg-red-600 text-white rounded-xl text-xs font-black flex flex-col items-center gap-1 hover:bg-red-700"><Flame size={20}/> حريق</button>
                <button onClick={() => sendEmergency('تنبيه: تسرب غاز!')} className="p-3 bg-orange-600 text-white rounded-xl text-xs font-black flex flex-col items-center gap-1 hover:bg-orange-700"><Droplets size={20}/> غاز</button>
                <button onClick={() => sendEmergency('يرجى التوجه لنقطة التجمع!')} className="p-3 bg-blue-600 text-white rounded-xl text-xs font-black flex flex-col items-center gap-1 hover:bg-blue-700"><Activity size={20}/> تجمع</button>
                <button onClick={() => sendEmergency('تنبيه: وجود دخان!')} className="p-3 bg-slate-500 text-white rounded-xl text-xs font-black flex flex-col items-center gap-1 hover:bg-slate-600"><Wind size={20}/> دخان</button>
             </div>
             
             <button onClick={() => { const m = prompt('رسالة طوارئ مخصصة:'); if(m) sendEmergency(m); }} className="w-full mt-auto p-3 border-2 border-dashed border-red-300 text-red-600 rounded-xl text-sm font-black hover:bg-red-50">
               إنذار بنص مخصص
             </button>
          </section>
        </div>
      </main>

      {/* لوحة سجل التنبيهات الجانبية */}
      {showLogs && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowLogs(false)} />
          <div className="relative w-80 bg-white h-full shadow-2xl p-6 overflow-y-auto animate-fadeInRight border-l-4 border-blue-600">
             <div className="flex justify-between items-center mb-6 border-b pb-4">
               <h3 className="font-black text-xl flex items-center gap-2"><Bell className="text-blue-600"/> التنبيهات</h3>
               <button onClick={() => setShowLogs(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
             </div>
             
             <div className="space-y-4">
                <div className="space-y-2">
                   <p className="text-xs font-black text-slate-400 uppercase">الواردة</p>
                   {inboundLogs.length === 0 ? <p className="text-xs text-slate-300 italic">لا توجد تنبيهات</p> : 
                     inboundLogs.map((n, i) => (
                      <div key={i} className={`p-3 rounded-xl border-r-4 text-xs font-bold ${n.type === 'emergency' ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-600'}`}>
                        <p>{n.message}</p>
                        <span className="block text-[9px] text-slate-400 mt-1 text-left">{new Date(n.created_at).toLocaleTimeString('ar-EG')}</span>
                      </div>
                     ))
                   }
                </div>
                <div className="space-y-2 pt-4 border-t">
                   <p className="text-xs font-black text-slate-400 uppercase">الصادرة منك</p>
                   {outboundLogs.length === 0 ? <p className="text-xs text-slate-300 italic">لا توجد رسائل</p> : 
                     outboundLogs.map((n, i) => (
                      <div key={i} className="p-3 rounded-xl border-r-4 bg-slate-50 border-slate-300 text-xs text-slate-600">
                        <p>{n.message}</p>
                        <span className="block text-[9px] text-slate-400 mt-1 text-left">{new Date(n.created_at).toLocaleTimeString('ar-EG')}</span>
                      </div>
                     ))
                   }
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
