
import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Users, Tv, Stethoscope, Trash2, Edit, Plus, RefreshCw, Send, 
  Volume2, AlertCircle, Play, Pause, Repeat, Hash, Mic, ShieldAlert, X,
  Activity, Zap, Flame, Droplets, Calendar, Clock, ArrowLeftRight, Check,
  Bell, MessageSquare, Wind, Music, Square, Printer, Save, MonitorPlay, SkipForward, SkipBack, StopCircle, LayoutTemplate, Lock, VolumeX
} from 'lucide-react';
import { toHindiDigits, playSimpleSound, playCallSequence } from '../utils';
import { supabase, subscribeToChanges } from '../supabase';
import { Clinic, Doctor, Screen, SystemSettings, Notification, DisplayConfig } from '../types';

const AdminPanel: React.FC = () => {
  // Login State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');

  const [activeTab, setActiveTab] = useState<'settings' | 'clinics' | 'doctors' | 'screens' | 'remote' | 'print' | 'display_control'>('settings');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [adminNotifications, setAdminNotifications] = useState<Notification[]>([]);
  
  // التحكم في الشاشة Live
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig | null>(null);
  
  // التنبيهات
  const [activeNotif, setActiveNotif] = useState<Notification | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  // Modal State
  const [showAddClinicModal, setShowAddClinicModal] = useState(false);
  const [newClinic, setNewClinic] = useState({ name: '', number: '', linked_screens: [] as string[] });

  // Remote Control Logic
  const [targetClinicId, setTargetClinicId] = useState<string>('');
  const [remoteCustomName, setRemoteCustomName] = useState('');
  const [remoteManualNum, setRemoteManualNum] = useState('');
  const [remoteTransferTarget, setRemoteTransferTarget] = useState('');
  const [remoteManualTransferNum, setRemoteManualTransferNum] = useState('');
  const [remoteMsgText, setRemoteMsgText] = useState('');
  const [remoteClinicMsgTarget, setRemoteClinicMsgTarget] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Audio Logic
  const [selectedAudioFile, setSelectedAudioFile] = useState('instant1.mp3');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Printing
  const [printClinicId, setPrintClinicId] = useState('');
  const [printRange, setPrintRange] = useState({ from: 1, to: 20 });

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const sub = subscribeToChanges('notifications', (payload) => {
      const n = payload.new as Notification;
      if (n.to_admin || n.type === 'emergency') {
        setAdminNotifications(prev => [n, ...prev]);
        setActiveNotif(n);
        playSimpleSound('/audio/ding.mp3');
        setTimeout(() => setActiveNotif(null), 6000);
      }
    });

    const displaySub = subscribeToChanges('display_config', (payload) => {
      if (payload.new) setDisplayConfig(payload.new as DisplayConfig);
    });

    // تحديث بيانات العيادة المختارة للتحكم الموحد بشكل لحظي
    const clinicSub = subscribeToChanges('clinics', (payload) => {
      setClinics(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
    });

    return () => { 
        supabase.removeChannel(sub); 
        supabase.removeChannel(clinicSub);
        supabase.removeChannel(displaySub);
        clearInterval(timer); 
    };
  }, [activeTab]);

  const fetchData = async () => {
    const { data: c } = await supabase.from('clinics').select('*').order('number');
    if (c) setClinics(c);
    const { data: d } = await supabase.from('doctors').select('*').order('name');
    if (d) setDoctors(d);
    const { data: s } = await supabase.from('screens').select('*').order('number');
    if (s) setScreens(s);
    const { data: set } = await supabase.from('settings').select('*').single();
    if (set) setSettings(set);
    const { data: notifs } = await supabase.from('notifications').select('*').eq('to_admin', true).order('created_at', { ascending: false }).limit(20);
    if (notifs) setAdminNotifications(notifs);
    const { data: dc } = await supabase.from('display_config').select('*').single();
    if (dc) setDisplayConfig(dc);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings && settings.admin_password && loginPassword === settings.admin_password) {
      setIsAuthenticated(true);
    } else if (settings && !settings.admin_password) {
       // في حالة عدم وجود باسورد في القاعدة، نسمح بالدخول (أو يمكن رفضه حسب السياسة)
       setIsAuthenticated(true);
    } else {
      alert('كلمة المرور غير صحيحة');
    }
  };

  const updateDisplayConfig = async (updates: Partial<DisplayConfig>) => {
    if(!displayConfig) return;
    const { error } = await supabase.from('display_config').update(updates).eq('id', displayConfig.id);
    if(error) alert('فشل التحديث');
    else setDisplayConfig({ ...displayConfig, ...updates });
  };

  const deleteItem = async (table: string, id: string) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        alert("فشل الحذف. قد يكون هناك سجلات مرتبطة.");
      } else {
        fetchData();
      }
    }
  };

  const remoteAction = async (action: string, payload?: any) => {
    if (!targetClinicId) return alert('اختر العيادة أولاً');
    const clinic = clinics.find(c => c.id === targetClinicId);
    if (!clinic) return;

    switch(action) {
      case 'update_num':
        await supabase.from('clinics').update({ current_number: payload }).eq('id', clinic.id);
        playCallSequence(payload, clinic.number);
        break;
      case 'status':
        await supabase.from('clinics').update({ status: payload }).eq('id', clinic.id);
        break;
      case 'name_call':
         if(remoteCustomName) {
            await supabase.from('notifications').insert({ from_clinic: 'الإدارة', message: remoteCustomName, type: 'name_call' });
            setRemoteCustomName('');
            alert('تم النداء');
         }
         break;
      case 'msg_clinic':
        if(remoteClinicMsgTarget && remoteMsgText) {
            await supabase.from('notifications').insert({ from_clinic: 'الإدارة', to_clinic: remoteClinicMsgTarget, message: remoteMsgText, type: 'normal' });
            setRemoteMsgText('');
            alert('تم الإرسال للعيادة');
        }
        break;
      case 'msg_admin':
         // رسالة لنفس اللوحة (تجربة)
         await supabase.from('notifications').insert({ from_clinic: 'الإدارة', message: remoteMsgText, type: 'normal', to_admin: true });
         setRemoteMsgText('');
         break;
      case 'emergency':
        await supabase.from('notifications').insert({ from_clinic: 'الإدارة', message: payload, type: 'emergency' });
        playSimpleSound('/audio/emergency.mp3');
        break;
      case 'transfer':
        if(!remoteTransferTarget) return alert('اختر العيادة المحول إليها');
        const numToTransfer = payload || clinic.current_number;
        await supabase.from('notifications').insert({
          from_clinic: clinic.name, to_clinic: remoteTransferTarget, 
          message: `تحويل عميل رقم (${numToTransfer}) من ${clinic.name} (بواسطة الإدارة)`,
          type: 'transfer', patient_number: numToTransfer
        });
        alert('تم التحويل بنجاح');
        setRemoteManualTransferNum('');
        break;
    }
  };

  // Audio Functions
  const playInstantAudio = () => {
    playSimpleSound(`/audio/${selectedAudioFile}`);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play(); // Play locally (Broadcast via PA system connected to PC)
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
            stopRecording();
        }
      }, 10000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('لا يمكن الوصول للميكروفون');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAddClinic = async () => {
    if (!newClinic.name || !newClinic.number) return alert('يرجى إدخال الاسم والرقم');
    const { error } = await supabase.from('clinics').insert({
      name: newClinic.name,
      number: parseInt(newClinic.number),
      status: 'active',
      password: '123',
      current_number: 0,
      linked_screens: newClinic.linked_screens
    });
    if (error) {
      alert("خطأ في الإضافة: " + error.message);
    } else {
      setShowAddClinicModal(false);
      setNewClinic({ name: '', number: '', linked_screens: [] });
      fetchData();
    }
  };

  const toggleScreenLink = (screenId: string) => {
    setNewClinic(prev => {
      const exists = prev.linked_screens.includes(screenId);
      if (exists) {
        return { ...prev, linked_screens: prev.linked_screens.filter(id => id !== screenId) };
      } else {
        return { ...prev, linked_screens: [...prev.linked_screens, screenId] };
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const getNotifClass = (type: string) => {
    switch(type) {
      case 'emergency': return 'border-red-600 notification-red';
      case 'transfer': return 'border-blue-600 notification-blue';
      default: return 'border-blue-600 notification-blue'; 
    }
  };

  const selectedRemoteClinic = clinics.find(c => c.id === targetClinicId);

  // واجهة تسجيل الدخول
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-cairo">
         <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border-t-8 border-blue-600">
           <div className="flex justify-center mb-8">
             <div className="bg-blue-100 p-6 rounded-full">
               <ShieldAlert size={64} className="text-blue-600" />
             </div>
           </div>
           <h2 className="text-3xl font-black text-center mb-2 text-slate-800">لوحة الإدارة</h2>
           <p className="text-center text-slate-400 font-bold mb-8">يرجى تسجيل الدخول للمتابعة</p>
           
           <form onSubmit={handleLogin} className="space-y-6">
             <div className="relative">
               <Lock className="absolute top-5 right-5 text-slate-400" size={20} />
               <input 
                 type="password" 
                 placeholder="كلمة المرور" 
                 className="w-full p-4 pr-12 border-2 rounded-2xl font-bold bg-slate-50 focus:border-blue-600 outline-none transition-all" 
                 value={loginPassword} 
                 onChange={(e) => setLoginPassword(e.target.value)} 
               />
             </div>
             <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-lg text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
               تسجيل الدخول
             </button>
           </form>
         </div>
         <p className="mt-8 text-slate-500 font-bold text-sm">نظام إدارة الطوابير الذكي</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 min-h-screen overflow-hidden print:bg-white font-cairo relative">
      {/* تنبيه الجرس المنبثق */}
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

      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900 text-slate-300 p-6 space-y-2 shrink-0 print:hidden overflow-y-auto shadow-2xl">
        <h2 className="text-2xl font-black text-white mb-10 px-2 flex items-center gap-3"><ShieldAlert className="text-blue-500" /> لوحة المدير</h2>
        <nav className="space-y-1">
          {[
            { id: 'settings', label: 'الإعدادات العامة', icon: Settings },
            { id: 'clinics', label: 'إدارة العيادات', icon: Users },
            { id: 'doctors', label: 'إدارة الأطباء', icon: Stethoscope },
            { id: 'screens', label: 'إدارة الشاشات', icon: Tv },
            { id: 'remote', label: 'التحكم الموحد', icon: Mic },
            { id: 'display_control', label: 'تحكم الشاشة Live', icon: MonitorPlay },
            { id: 'print', label: 'طباعة التذاكر', icon: Printer }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><tab.icon size={20} /> <span className="font-bold">{tab.label}</span></button>
          ))}
        </nav>
        
        <div className="mt-10 pt-6 border-t border-slate-700">
           <button onClick={() => setIsAuthenticated(false)} className="w-full flex items-center gap-4 p-4 rounded-xl text-red-400 hover:bg-slate-800 hover:text-red-300 transition-all font-bold">
              <X size={20} /> تسجيل الخروج
           </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto print:p-0 flex flex-col">
        {/* Top Bar with Bell */}
        <div className="flex justify-between items-center mb-8 print:hidden">
            <h2 className="text-2xl font-black text-slate-800">
               {activeTab === 'remote' ? 'التحكم الحي الموحد' : (activeTab === 'display_control' ? 'التحكم في الشاشة' : 'إدارة النظام')}
            </h2>
            <button 
              onClick={() => setShowLogs(!showLogs)} 
              className={`p-3 rounded-2xl transition-all relative ${showLogs ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 shadow-sm hover:shadow-md'}`}
            >
              <Bell size={24} />
              {adminNotifications.length > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
            </button>
        </div>

        {activeTab === 'settings' && settings && (
          <div className="max-w-4xl space-y-8 animate-fadeIn">
            <h3 className="text-3xl font-black">الإعدادات العامة</h3>
            <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
               <div className="grid grid-cols-2 gap-6">
                 <div><label className="text-sm font-bold block mb-2">اسم المركز</label><input className="w-full p-4 border rounded-2xl font-bold" value={settings.center_name} onChange={e => setSettings({...settings, center_name: e.target.value})} /></div>
                 <div><label className="text-sm font-bold block mb-2">سرعة الشريط</label><input type="number" className="w-full p-4 border rounded-2xl font-bold" value={settings.ticker_speed} onChange={e => setSettings({...settings, ticker_speed: parseInt(e.target.value)})} /></div>
               </div>
               <div><label className="text-sm font-bold block mb-2">محتوى شريط الأخبار</label><textarea className="w-full p-4 border rounded-2xl h-32 font-bold" value={settings.ticker_content} onChange={e => setSettings({...settings, ticker_content: e.target.value})} /></div>
               
               <div className="pt-4 border-t">
                  <h4 className="font-black text-red-500 mb-4 flex items-center gap-2"><Lock size={18}/> منطقة الأمان</h4>
                  <div>
                    <label className="text-sm font-bold block mb-2">كلمة مرور المدير (Admin Password)</label>
                    <input 
                      type="text" 
                      placeholder="اتركه فارغاً إذا لم ترد تغييره"
                      className="w-full p-4 border-2 border-red-100 bg-red-50 rounded-2xl font-bold text-red-900 focus:border-red-500 outline-none" 
                      value={settings.admin_password || ''} 
                      onChange={e => setSettings({...settings, admin_password: e.target.value})} 
                    />
                  </div>
               </div>

               <button onClick={async () => { await supabase.from('settings').update(settings).eq('id', settings.id); alert('تم الحفظ'); }} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg flex items-center gap-3"><Save /> حفظ الإعدادات</button>
            </div>
          </div>
        )}

        {activeTab === 'clinics' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center"><h3 className="text-3xl font-black">إدارة العيادات</h3><button onClick={() => setShowAddClinicModal(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Plus /> إضافة عيادة</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clinics.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-3xl border shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-slate-100 p-2 px-4 rounded-lg font-black text-slate-500">#{c.number}</span>
                    <button onClick={() => deleteItem('clinics', c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                  </div>
                  <h4 className="text-xl font-black mb-1">{c.name}</h4>
                  <p className="text-sm text-slate-400 font-bold mb-4">الرقم الحالي: {toHindiDigits(c.current_number)}</p>
                  <button onClick={async () => { const n = prompt('الاسم الجديد:', c.name); if(n) { await supabase.from('clinics').update({name: n}).eq('id', c.id); fetchData(); } }} className="w-full p-2 bg-slate-50 rounded-xl font-bold text-slate-600 flex items-center justify-center gap-2"><Edit size={16}/> تعديل الاسم</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'doctors' && (
           <div className="space-y-6 animate-fadeIn">
             <div className="flex justify-between items-center"><h3 className="text-3xl font-black">إدارة الأطباء</h3><button onClick={async () => { const name = prompt('اسم الطبيب:'); if(name) { await supabase.from('doctors').insert({ name, specialty:'طبيب متخصص', number: doctors.length+1 }); fetchData(); } }} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Plus /> إضافة طبيب</button></div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors.map(d => (
                  <div key={d.id} className="bg-white p-6 rounded-3xl border shadow-sm flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                      {d.image_url ? <img src={d.image_url} className="w-full h-full object-cover" /> : <Stethoscope size={32} className="text-slate-300" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-slate-800">{d.name}</h4>
                      <p className="text-sm font-bold text-slate-400">{d.specialty}</p>
                    </div>
                    <button onClick={() => deleteItem('doctors', d.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                  </div>
                ))}
             </div>
           </div>
        )}

        {activeTab === 'screens' && (
           <div className="space-y-6 animate-fadeIn">
             <div className="flex justify-between items-center"><h3 className="text-3xl font-black">إدارة الشاشات</h3><button onClick={async () => { const name = prompt('اسم الشاشة:'); if(name) { await supabase.from('screens').insert({ name, password: '123', number: screens.length+1 }); fetchData(); } }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Plus /> إضافة شاشة</button></div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {screens.map(s => (
                 <div key={s.id} className="bg-white p-6 rounded-3xl border shadow-sm">
                   <div className="flex justify-between items-start mb-4">
                     <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Tv size={24}/></div>
                     <button onClick={() => deleteItem('screens', s.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                   </div>
                   <h4 className="text-xl font-black mb-1">{s.name}</h4>
                   <p className="text-xs font-bold text-slate-400 mb-4">الرقم: #{s.number} | كلمة السر: {s.password}</p>
                 </div>
               ))}
             </div>
           </div>
        )}

        {activeTab === 'display_control' && displayConfig && (
          <div className="space-y-8 animate-fadeIn pb-10">
             {/* التحكم في الفيديو */}
             <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <h3 className="text-xl font-black flex items-center gap-2 mb-6 text-slate-800"><MonitorPlay className="text-blue-600"/> التحكم في الفيديو</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="flex gap-2 bg-slate-100 p-2 rounded-2xl justify-center">
                      <button onClick={() => updateDisplayConfig({ video_status: 'play' })} className={`flex-1 py-3 rounded-xl font-black flex items-center justify-center gap-2 ${displayConfig.video_status === 'play' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}><Play size={20}/> تشغيل</button>
                      <button onClick={() => updateDisplayConfig({ video_status: 'pause' })} className={`flex-1 py-3 rounded-xl font-black flex items-center justify-center gap-2 ${displayConfig.video_status === 'pause' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}><Pause size={20}/> إيقاف مؤقت</button>
                      <button onClick={() => updateDisplayConfig({ video_status: 'stop' })} className={`flex-1 py-3 rounded-xl font-black flex items-center justify-center gap-2 ${displayConfig.video_status === 'stop' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}><StopCircle size={20}/> إيقاف</button>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => updateDisplayConfig({ video_trigger: 'prev-' + Date.now() })} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-900"><SkipBack/> السابق</button>
                      <button onClick={() => updateDisplayConfig({ video_trigger: 'next-' + Date.now() })} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-900">التالي <SkipForward/></button>
                   </div>
                   <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-center text-center">
                      <p className="text-blue-800 font-bold text-sm">الحالة الحالية: <span className="font-black text-lg">{displayConfig.video_status === 'play' ? 'تشغيل' : displayConfig.video_status === 'pause' ? 'مؤقت' : 'متوقف'}</span></p>
                   </div>
                </div>

                {/* التحكم في الصوت الجديد */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                    <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Volume2 size={20}/> إعدادات الصوت</h4>
                    <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-2xl border">
                        <button 
                            onClick={() => updateDisplayConfig({ video_muted: !displayConfig.video_muted })}
                            className={`p-4 rounded-2xl transition-all flex items-center gap-2 font-black ${displayConfig.video_muted ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                        >
                            {displayConfig.video_muted ? <><VolumeX size={24}/> مكتوم</> : <><Volume2 size={24}/> تشغيل الصوت</>}
                        </button>
                        
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-500 mb-2 flex justify-between">
                                <span>مستوى الصوت</span>
                                <span className="bg-white px-2 rounded-md border">{displayConfig.video_volume}%</span>
                            </label>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                className="w-full h-4 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                value={displayConfig.video_volume} 
                                onChange={e => updateDisplayConfig({ video_volume: parseInt(e.target.value) })} 
                                disabled={displayConfig.video_muted}
                            />
                        </div>
                    </div>
                </div>
             </div>

             {/* التحكم في التصميم */}
             <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <h3 className="text-xl font-black flex items-center gap-2 mb-6 text-slate-800"><LayoutTemplate className="text-purple-600"/> إعدادات التصميم (Realtime)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <label className="text-sm font-bold block">نسبة مساحة الكروت (Cards Percent)</label>
                      <div className="flex items-center gap-4">
                        <input type="range" min="20" max="80" className="flex-1 h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600" value={displayConfig.cards_percent} onChange={e => updateDisplayConfig({ cards_percent: parseInt(e.target.value) })} />
                        <span className="w-16 text-center font-black bg-slate-100 p-2 rounded-lg">{displayConfig.cards_percent}%</span>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="text-sm font-bold block">عدد الأعمدة (Columns Count)</label>
                      <div className="flex items-center gap-4">
                        <input type="range" min="1" max="6" className="flex-1 h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600" value={displayConfig.columns_count} onChange={e => updateDisplayConfig({ columns_count: parseInt(e.target.value) })} />
                        <span className="w-16 text-center font-black bg-slate-100 p-2 rounded-lg">{displayConfig.columns_count}</span>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="text-sm font-bold block">ارتفاع الكارت (Card Height)</label>
                      <div className="flex items-center gap-4">
                        <input type="range" min="100" max="400" className="flex-1 h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600" value={displayConfig.card_height} onChange={e => updateDisplayConfig({ card_height: parseInt(e.target.value) })} />
                        <span className="w-16 text-center font-black bg-slate-100 p-2 rounded-lg">{displayConfig.card_height}px</span>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="text-sm font-bold block">عرض الكارت (Card Width %)</label>
                      <div className="flex items-center gap-4">
                        <input type="range" min="50" max="100" className="flex-1 h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600" value={displayConfig.card_width} onChange={e => updateDisplayConfig({ card_width: parseInt(e.target.value) })} />
                        <span className="w-16 text-center font-black bg-slate-100 p-2 rounded-lg">{displayConfig.card_width}%</span>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="text-sm font-bold block">حجم الخط (Font Size)</label>
                      <div className="flex items-center gap-4">
                        <input type="range" min="1.5" max="8" step="0.1" className="flex-1 h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600" value={displayConfig.font_size} onChange={e => updateDisplayConfig({ font_size: parseFloat(e.target.value) })} />
                        <span className="w-16 text-center font-black bg-slate-100 p-2 rounded-lg">{displayConfig.font_size}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'remote' && (
          <div className="space-y-6 animate-fadeIn pb-10">
            {/* اختيار العيادة */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border mb-4">
               <label className="text-sm font-bold text-slate-500 mb-2 block">اختر العيادة للتحكم بها:</label>
               <select className="w-full p-4 border-2 border-blue-100 rounded-2xl font-black bg-blue-50 text-blue-700" value={targetClinicId} onChange={e => setTargetClinicId(e.target.value)}>
                <option value="">-- اضغط للاختيار --</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            {selectedRemoteClinic ? (
              <div className="space-y-6">
                 {/* هيدر العيادة المختارة */}
                 <header className="bg-white border-b-4 p-4 shadow-sm rounded-[2rem]">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className={`p-3 px-6 rounded-2xl font-black text-4xl shadow-inner min-w-[120px] text-center ${selectedRemoteClinic?.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                            {toHindiDigits(selectedRemoteClinic?.current_number || 0)}
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800">{selectedRemoteClinic?.name}</h1>
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><Clock size={12}/> {currentTime.toLocaleTimeString('ar-EG')}</span>
                            <span className="flex items-center gap-1"><Calendar size={12}/> {currentTime.toLocaleDateString('ar-EG')}</span>
                            </div>
                            <div className="mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${selectedRemoteClinic?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {selectedRemoteClinic?.status === 'active' ? '● العيادة نشطة' : '● العيادة متوقفة'}
                            </span>
                            </div>
                        </div>
                      </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {/* القسم الأول: التحكم بالطابور */}
                    <section className="bg-white p-5 rounded-[2rem] border-t-8 border-emerald-500 shadow-sm flex flex-col gap-4">
                        <h3 className="font-black text-lg text-emerald-700 flex items-center gap-2 border-b pb-2"><Activity size={20}/> التحكم بالطابور</h3>
                        <div className="flex gap-2">
                        <button onClick={() => remoteAction('update_num', (selectedRemoteClinic.current_number || 0) + 1)} className="flex-1 py-6 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:shadow-lg hover:scale-[1.02] transition-all">العميل التالي</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => remoteAction('update_num', Math.max(0, (selectedRemoteClinic.current_number || 0) - 1))} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm">السابق</button>
                            <button onClick={() => remoteAction('update_num', selectedRemoteClinic.current_number || 0)} className="flex-1 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm flex items-center justify-center gap-1"><Repeat size={16}/> تكرار</button>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 mb-1 block">نداء رقم معين:</label>
                            <div className="flex gap-2">
                                <input type="number" className="flex-1 p-2 border rounded-xl text-center font-bold" value={remoteManualNum} onChange={e => setRemoteManualNum(e.target.value)} />
                                <button onClick={() => { remoteAction('update_num', parseInt(remoteManualNum)); setRemoteManualNum(''); }} className="bg-slate-800 text-white px-4 rounded-xl font-bold text-sm">نداء</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button onClick={() => remoteAction('status', selectedRemoteClinic.status === 'active' ? 'paused' : 'active')} className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${selectedRemoteClinic.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {selectedRemoteClinic.status === 'active' ? <><Pause size={16}/> إيقاف مؤقت</> : <><Play size={16}/> استئناف</>}
                        </button>
                        <button onClick={() => remoteAction('update_num', 0)} className="py-3 bg-slate-200 text-slate-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><RefreshCw size={16}/> تصفير</button>
                        </div>
                    </section>

                    {/* القسم الثاني: التحويل */}
                    <section className="bg-white p-5 rounded-[2rem] border-t-8 border-amber-500 shadow-sm flex flex-col gap-4">
                        <h3 className="font-black text-lg text-amber-600 flex items-center gap-2 border-b pb-2"><ArrowLeftRight size={20}/> قسم التحويل</h3>
                        <div>
                        <label className="text-xs font-bold text-slate-500 mb-2 block">إلى عيادة:</label>
                        <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm" value={remoteTransferTarget} onChange={e => setRemoteTransferTarget(e.target.value)}>
                            <option value="">-- اختر --</option>
                            {clinics.filter(c => c.id !== targetClinicId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        </div>
                        <button onClick={() => remoteAction('transfer')} className="w-full py-4 bg-amber-500 text-white rounded-xl font-black shadow-md hover:bg-amber-600 transition-all">
                        تحويل العميل الحالي ({toHindiDigits(selectedRemoteClinic.current_number || 0)})
                        </button>
                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mt-auto">
                        <label className="text-[10px] font-black text-amber-700 mb-1 block">تحويل عميل مخصص:</label>
                        <div className="flex gap-2">
                            <input type="number" placeholder="رقم العميل" className="flex-1 p-2 border rounded-xl text-center font-bold" value={remoteManualTransferNum} onChange={e => setRemoteManualTransferNum(e.target.value)} />
                            <button onClick={() => remoteAction('transfer', parseInt(remoteManualTransferNum))} className="bg-slate-800 text-white px-4 rounded-xl font-bold text-sm">تحويل</button>
                        </div>
                        </div>
                    </section>

                    {/* القسم الثالث: المراسلة */}
                    <section className="bg-white p-5 rounded-[2rem] border-t-8 border-indigo-500 shadow-sm flex flex-col gap-4">
                        <h3 className="font-black text-lg text-indigo-600 flex items-center gap-2 border-b pb-2"><MessageSquare size={20}/> المراسلة والتنبيهات</h3>
                        <div className="space-y-3">
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-slate-400 mb-1 block">إذاعة اسم عميل:</label>
                                    <input className="w-full p-2 border rounded-xl font-bold text-sm" placeholder="الاسم..." value={remoteCustomName} onChange={e => setRemoteCustomName(e.target.value)} />
                                </div>
                                <button onClick={() => remoteAction('name_call')} className="bg-indigo-600 text-white p-2 h-10 w-10 rounded-xl flex items-center justify-center"><Users size={18}/></button>
                            </div>
                            <div className="border-t pt-3">
                                <label className="text-[10px] font-black text-slate-400 mb-1 block">تنبيه لعيادة أخرى:</label>
                                <select className="w-full p-2 mb-2 border rounded-xl font-bold text-xs" value={remoteClinicMsgTarget} onChange={e => setRemoteClinicMsgTarget(e.target.value)}>
                                    <option value="">-- العيادة --</option>
                                    {clinics.filter(c => c.id !== targetClinicId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <div className="flex gap-2">
                                    <input className="flex-1 p-2 border rounded-xl font-bold text-sm" placeholder="الرسالة..." value={remoteMsgText} onChange={e => setRemoteMsgText(e.target.value)} />
                                    <button onClick={() => remoteAction('msg_clinic')} className="bg-indigo-600 text-white p-2 h-10 w-10 rounded-xl flex items-center justify-center"><Send size={16}/></button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* القسم الرابع: الطوارئ */}
                    <section className="bg-white p-5 rounded-[2rem] border-t-8 border-red-600 shadow-sm flex flex-col gap-4">
                        <h3 className="font-black text-lg text-red-600 flex items-center gap-2 border-b pb-2"><AlertCircle size={20}/> قسم الطوارئ</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => remoteAction('emergency', 'تنبيه: حريق في المبنى!')} className="p-3 bg-red-600 text-white rounded-xl text-xs font-black flex flex-col items-center gap-1 hover:bg-red-700"><Flame size={20}/> حريق</button>
                            <button onClick={() => remoteAction('emergency', 'تنبيه: تسرب غاز!')} className="p-3 bg-orange-600 text-white rounded-xl text-xs font-black flex flex-col items-center gap-1 hover:bg-orange-700"><Droplets size={20}/> غاز</button>
                            <button onClick={() => remoteAction('emergency', 'يرجى التوجه لنقطة التجمع!')} className="p-3 bg-blue-600 text-white rounded-xl text-xs font-black flex flex-col items-center gap-1 hover:bg-blue-700"><Activity size={20}/> تجمع</button>
                            <button onClick={() => remoteAction('emergency', 'تنبيه: وجود دخان!')} className="p-3 bg-slate-500 text-white rounded-xl text-xs font-black flex flex-col items-center gap-1 hover:bg-slate-600"><Wind size={20}/> دخان</button>
                        </div>
                        <button onClick={() => { const m = prompt('رسالة طوارئ مخصصة:'); if(m) remoteAction('emergency', m); }} className="w-full mt-auto p-3 border-2 border-dashed border-red-300 text-red-600 rounded-xl text-sm font-black hover:bg-red-50">إنذار بنص مخصص</button>
                    </section>
                    
                    {/* القسم الخامس: الإذاعة */}
                    <section className="bg-white p-5 rounded-[2rem] border-t-8 border-purple-600 shadow-sm flex flex-col gap-4 lg:col-span-2 2xl:col-span-1">
                        <h3 className="font-black text-lg text-purple-600 flex items-center gap-2 border-b pb-2"><Music size={20}/> قسم الإذاعة الصوتية</h3>
                        
                        <div className="space-y-4">
                            {/* ملفات جاهزة */}
                            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                                <label className="text-[10px] font-black text-purple-700 mb-2 block">ملفات جاهزة (Instant Audio):</label>
                                <div className="flex gap-2">
                                    <select className="flex-1 p-3 border rounded-xl font-bold text-sm" value={selectedAudioFile} onChange={e => setSelectedAudioFile(e.target.value)}>
                                        {Array.from({length: 10}).map((_, i) => (
                                            <option key={i} value={`instant${i+1}.mp3`}>ملف صوتي {i+1} (instant{i+1}.mp3)</option>
                                        ))}
                                    </select>
                                    <button onClick={playInstantAudio} className="bg-purple-600 text-white px-4 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-purple-700"><Volume2 size={16}/> إذاعة</button>
                                </div>
                            </div>

                            {/* تسجيل صوتي */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <label className="text-[10px] font-black text-slate-500 mb-2 block">إذاعة فورية (تسجيل 10 ثواني):</label>
                                <button 
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={`w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-white hover:bg-slate-900'}`}
                                >
                                    {isRecording ? <><Square size={16}/> إيقاف التسجيل وإذاعة</> : <><Mic size={16}/> بدء التسجيل (10s)</>}
                                </button>
                                {isRecording && <p className="text-center text-xs text-red-500 font-bold mt-2">جاري التسجيل...</p>}
                            </div>
                        </div>
                    </section>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 text-slate-300 border-2 border-dashed rounded-[3rem]">
                <Mic size={100} className="mb-6 opacity-20" />
                <p className="text-xl font-black italic">برجاء اختيار العيادة لبدء التحكم الموحد</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'print' && (
          <div className="animate-fadeIn print:block">
            <div className="mb-10 p-8 bg-white rounded-3xl border shadow-sm space-y-6 print:hidden">
              <h3 className="text-2xl font-black">طباعة التذاكر</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <select className="p-4 border rounded-2xl font-bold" value={printClinicId} onChange={e => setPrintClinicId(e.target.value)}>
                    <option value="">-- اختر العيادة --</option>
                    {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" className="p-4 border rounded-2xl font-bold text-center" placeholder="من" value={printRange.from} onChange={e => setPrintRange({...printRange, from: parseInt(e.target.value)})} />
                <input type="number" className="p-4 border rounded-2xl font-bold text-center" placeholder="إلى" value={printRange.to} onChange={e => setPrintRange({...printRange, to: parseInt(e.target.value)})} />
              </div>
              <button onClick={handlePrint} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-4 hover:scale-[1.01] transition-all"><Printer size={32}/> طباعة الدفعة</button>
            </div>
            <div className="print-grid-container bg-white w-[21cm] mx-auto min-h-[29.7cm] p-4 hidden print:block">
               <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: Math.max(0, printRange.to - printRange.from + 1) }).map((_, idx) => {
                    const num = printRange.from + idx;
                    const clinic = clinics.find(c => c.id === printClinicId);
                    return (
                      <div key={idx} className="border-2 border-black w-[5cm] h-[5cm] flex flex-col items-center justify-center p-2 text-center text-black">
                        <p className="text-[10px] font-black mb-1">{settings?.center_name}</p>
                        <p className="text-[12px] font-black border-b border-black w-full pb-1 mb-2">{clinic?.name || 'العيادة'}</p>
                        <p className="text-4xl font-black my-1">{toHindiDigits(num)}</p>
                        <p className="text-[8px] mt-2 font-bold">{new Date().toLocaleDateString('ar-EG')}</p>
                      </div>
                    );
                  })}
               </div>
            </div>
          </div>
        )}
      </main>

      {/* لوحة سجل التنبيهات الجانبية للمدير */}
      {showLogs && (
        <div className="fixed inset-0 z-[200] flex justify-end print:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowLogs(false)} />
          <div className="relative w-80 bg-white h-full shadow-2xl p-6 overflow-y-auto animate-fadeInRight border-l-4 border-blue-600">
             <div className="flex justify-between items-center mb-6 border-b pb-4">
               <h3 className="font-black text-xl flex items-center gap-2"><Bell className="text-blue-600"/> سجل التنبيهات</h3>
               <button onClick={() => setShowLogs(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
             </div>
             
             <div className="space-y-4">
                {adminNotifications.length === 0 ? <p className="text-center text-slate-300 mt-10 italic">لا توجد رسائل</p> :
                  adminNotifications.map((n, i) => (
                    <div key={i} className={`p-4 rounded-2xl border-r-8 shadow-sm transition-all ${n.type === 'emergency' ? 'bg-red-50 border-red-500 animate-shake' : 'bg-blue-50 border-blue-600'}`}>
                      <p className="font-black text-slate-800 text-sm">{n.message}</p>
                      <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400">
                        <span className="uppercase">{n.from_clinic || 'النظام'}</span>
                        <span>{new Date(n.created_at).toLocaleTimeString('ar-EG')}</span>
                      </div>
                    </div>
                  ))
                }
             </div>
          </div>
        </div>
      )}

      {/* Modal إضافة عيادة */}
      {showAddClinicModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full">
            <h3 className="text-2xl font-black mb-6">إضافة عيادة جديدة</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-500 block mb-1">اسم العيادة</label>
                <input 
                  className="w-full p-4 border rounded-xl font-bold" 
                  placeholder="مثال: عيادة الباطنة"
                  value={newClinic.name} 
                  onChange={e => setNewClinic({...newClinic, name: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-500 block mb-1">رقم العيادة</label>
                <input 
                  type="number"
                  className="w-full p-4 border rounded-xl font-bold" 
                  placeholder="مثال: 1"
                  value={newClinic.number} 
                  onChange={e => setNewClinic({...newClinic, number: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-500 block mb-1">ربط بالشاشات</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border p-2 rounded-xl">
                  {screens.map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => toggleScreenLink(s.id)}
                      className={`p-2 rounded-lg text-sm font-bold flex items-center justify-between border transition-all ${newClinic.linked_screens.includes(s.id) ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      {s.name}
                      {newClinic.linked_screens.includes(s.id) && <Check size={14}/>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={handleAddClinic} className="flex-1 bg-emerald-600 text-white p-4 rounded-xl font-black">إضافة</button>
              <button onClick={() => setShowAddClinicModal(false)} className="flex-1 bg-slate-100 text-slate-500 p-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
