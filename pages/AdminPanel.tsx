
import React, { useState, useEffect } from 'react';
import { 
  Settings, Users, Tv, Stethoscope, Trash2, Edit, Plus, RefreshCw, Send, 
  Volume2, AlertCircle, Play, Pause, Repeat, Hash, SkipBack, 
  UserPlus, Bell, Printer, Save, MessageSquare, Mic, ShieldAlert, X,
  Activity, Zap, Flame, Droplets, Calendar, Clock, ArrowLeftRight, Check
} from 'lucide-react';
import { toHindiDigits, playSimpleSound, playCallSequence } from '../utils';
import { supabase, subscribeToChanges } from '../supabase';
import { Clinic, Doctor, Screen, SystemSettings, Notification } from '../types';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'clinics' | 'doctors' | 'screens' | 'remote' | 'print'>('settings');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [adminNotifications, setAdminNotifications] = useState<Notification[]>([]);
  
  const [showAddClinicModal, setShowAddClinicModal] = useState(false);
  const [newClinic, setNewClinic] = useState({ name: '', number: '', linked_screens: [] as string[] });

  // Remote Control Logic
  const [targetClinicId, setTargetClinicId] = useState<string>('');
  const [remoteCustomName, setRemoteCustomName] = useState('');
  const [remoteManualNum, setRemoteManualNum] = useState('');
  const [remoteTransferTarget, setRemoteTransferTarget] = useState('');
  const [remoteMsgText, setRemoteMsgText] = useState('');

  const [printClinicId, setPrintClinicId] = useState('');
  const [printRange, setPrintRange] = useState({ from: 1, to: 20 });

  useEffect(() => {
    fetchData();
    const sub = subscribeToChanges('notifications', (payload) => {
      const n = payload.new as Notification;
      if (n.to_admin || n.type === 'emergency') {
        setAdminNotifications(prev => [n, ...prev]);
        playSimpleSound('/audio/ring.mp3');
      }
    });
    return () => { supabase.removeChannel(sub); };
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
      case 'msg':
        await supabase.from('notifications').insert({ from_clinic: 'الإدارة', to_clinic: targetClinicId, message: remoteMsgText, type: 'normal' });
        setRemoteMsgText('');
        alert('تم إرسال الرسالة');
        break;
      case 'emergency':
        await supabase.from('notifications').insert({ from_clinic: 'الإدارة', message: payload, type: 'emergency' });
        playSimpleSound('/audio/emergency.mp3');
        break;
      case 'transfer':
        if(!remoteTransferTarget) return alert('اختر العيادة المحول إليها');
        await supabase.from('notifications').insert({
          from_clinic: clinic.name, to_clinic: remoteTransferTarget, 
          message: `تحويل عميل رقم (${clinic.current_number}) من ${clinic.name}`,
          type: 'transfer', patient_number: clinic.current_number
        });
        alert('تم التحويل بنجاح');
        break;
    }
    fetchData();
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

  const selectedRemoteClinic = clinics.find(c => c.id === targetClinicId);

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 min-h-screen overflow-hidden print:bg-white font-cairo">
      <aside className="w-full md:w-72 bg-slate-900 text-slate-300 p-6 space-y-2 shrink-0 print:hidden overflow-y-auto shadow-2xl">
        <h2 className="text-2xl font-black text-white mb-10 px-2 flex items-center gap-3"><ShieldAlert className="text-blue-500" /> لوحة المدير</h2>
        <nav className="space-y-1">
          {[
            { id: 'settings', label: 'الإعدادات العامة', icon: Settings },
            { id: 'clinics', label: 'إدارة العيادات', icon: Users },
            { id: 'doctors', label: 'إدارة الأطباء', icon: Stethoscope },
            { id: 'screens', label: 'إدارة الشاشات', icon: Tv },
            { id: 'remote', label: 'التحكم الموحد', icon: Mic },
            { id: 'print', label: 'طباعة التذاكر', icon: Printer }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><tab.icon size={20} /> <span className="font-bold">{tab.label}</span></button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto print:p-0">
        {activeTab === 'settings' && settings && (
          <div className="max-w-4xl space-y-8 animate-fadeIn">
            <h3 className="text-3xl font-black">الإعدادات العامة</h3>
            <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
               <div className="grid grid-cols-2 gap-6">
                 <div><label className="text-sm font-bold block mb-2">اسم المركز</label><input className="w-full p-4 border rounded-2xl font-bold" value={settings.center_name} onChange={e => setSettings({...settings, center_name: e.target.value})} /></div>
                 <div><label className="text-sm font-bold block mb-2">سرعة الشريط</label><input type="number" className="w-full p-4 border rounded-2xl font-bold" value={settings.ticker_speed} onChange={e => setSettings({...settings, ticker_speed: parseInt(e.target.value)})} /></div>
               </div>
               <div><label className="text-sm font-bold block mb-2">محتوى شريط الأخبار</label><textarea className="w-full p-4 border rounded-2xl h-32 font-bold" value={settings.ticker_content} onChange={e => setSettings({...settings, ticker_content: e.target.value})} /></div>
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

        {activeTab === 'remote' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-3xl font-black">التحكم الموحد الكامل</h3>
              <select className="p-4 border-2 border-blue-100 rounded-2xl font-black bg-blue-50 text-blue-700 min-w-[300px]" value={targetClinicId} onChange={e => setTargetClinicId(e.target.value)}>
                <option value="">-- اختر العيادة للتحكم --</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            {selectedRemoteClinic ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                    <h4 className="font-black text-lg border-b pb-2 flex items-center justify-between">التحكم في الطابور <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-sm">{toHindiDigits(selectedRemoteClinic.current_number)}</span></h4>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => remoteAction('update_num', selectedRemoteClinic.current_number + 1)} className="p-4 bg-emerald-600 text-white rounded-xl font-bold">التالي</button>
                      <button onClick={() => remoteAction('update_num', Math.max(0, selectedRemoteClinic.current_number - 1))} className="p-4 bg-slate-100 rounded-xl font-bold">السابق</button>
                      <button onClick={() => remoteAction('update_num', selectedRemoteClinic.current_number)} className="p-4 bg-blue-50 text-blue-600 rounded-xl font-bold">تكرار</button>
                      <button onClick={() => remoteAction('update_num', 0)} className="p-4 bg-red-50 text-red-600 rounded-xl font-bold">تصفير</button>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => remoteAction('status', 'paused')} className={`flex-1 p-3 rounded-xl font-bold ${selectedRemoteClinic.status === 'paused' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}>توقف</button>
                       <button onClick={() => remoteAction('status', 'active')} className={`flex-1 p-3 rounded-xl font-bold ${selectedRemoteClinic.status === 'active' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600'}`}>استئناف</button>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                    <h4 className="font-black text-lg border-b pb-2">التحويل والمراسلة</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold block mb-1">تحويل العميل لعيادة:</label>
                        <select className="w-full p-2 border rounded-xl" value={remoteTransferTarget} onChange={e => setRemoteTransferTarget(e.target.value)}>
                           <option value="">-- اختر --</option>
                           {clinics.filter(c => c.id !== targetClinicId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={() => remoteAction('transfer')} className="w-full mt-2 p-3 bg-amber-500 text-white rounded-xl font-bold">تحويل المريض</button>
                      </div>
                      <div className="pt-2 border-t">
                        <input className="w-full p-3 border rounded-xl font-bold text-sm" placeholder="رسالة للعيادة..." value={remoteMsgText} onChange={e => setRemoteMsgText(e.target.value)} />
                        <button onClick={() => remoteAction('msg')} className="w-full mt-2 p-3 bg-emerald-600 text-white rounded-xl font-bold">إرسال التنبيه</button>
                      </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                    <h4 className="font-black text-lg border-b pb-2">الطوارئ العامة</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => remoteAction('emergency', 'تنبيه: حريق في المبنى!')} className="p-3 bg-red-600 text-white rounded-xl text-xs font-black flex items-center gap-2"><Flame size={14}/> حريق</button>
                      <button onClick={() => remoteAction('emergency', 'يرجى التوجه لنقطة التجمع')} className="p-3 bg-blue-600 text-white rounded-xl text-xs font-black flex items-center gap-2"><Activity size={14}/> تجمع</button>
                    </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 text-slate-300">
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

      <aside className="w-80 bg-white border-l p-6 hidden xl:flex flex-col print:hidden shadow-xl">
         <h4 className="font-black text-xl mb-6 flex items-center gap-3"><Bell className="text-blue-500" /> تنبيهات المدير</h4>
         <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
            {adminNotifications.length === 0 ? <p className="text-center text-slate-300 mt-20 italic">لا توجد رسائل حالياً</p> :
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
      </aside>

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
                  {screens.length === 0 && <p className="col-span-2 text-xs text-slate-400 text-center py-2">لا توجد شاشات مسجلة</p>}
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
