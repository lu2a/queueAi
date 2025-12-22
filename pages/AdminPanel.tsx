
import React, { useState, useEffect } from 'react';
import { Settings, Users, Tv, Stethoscope, Trash2, Edit, Plus, RefreshCw, Send, Phone, Volume2 } from 'lucide-react';
import { toHindiDigits } from '../utils';
import { supabase } from '../supabase';
import { Clinic, Doctor, Screen, SystemSettings } from '../types';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'clinics' | 'doctors' | 'screens' | 'remote'>('settings');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    if (activeTab === 'clinics') {
      const { data } = await supabase.from('clinics').select('*').order('number');
      if (data) setClinics(data);
    } else if (activeTab === 'doctors') {
      const { data } = await supabase.from('doctors').select('*');
      if (data) setDoctors(data);
    } else if (activeTab === 'settings') {
      const { data } = await supabase.from('settings').select('*').single();
      if (data) setSettings(data);
    }
  };

  const handleAddClinic = async () => {
    const name = prompt('اسم العيادة:');
    const num = prompt('رقم العيادة (رقمي):');
    if (name && num) {
      await supabase.from('clinics').insert({ name, number: parseInt(num), password: '123' });
      fetchData();
    }
  };

  const deleteClinic = async (id: string) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      await supabase.from('clinics').delete().eq('id', id);
      fetchData();
    }
  };

  const resetAll = async () => {
    if (confirm('سيتم تصفير جميع العدادات، هل تريد الاستمرار؟')) {
      await supabase.from('clinics').update({ current_number: 0 });
      fetchData();
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50">
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 p-6 space-y-2">
        <h2 className="text-xl font-black text-white mb-8 px-2">لوحة الإدارة</h2>
        <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
          <Settings size={20} /> الإعدادات العامة
        </button>
        <button onClick={() => setActiveTab('clinics')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'clinics' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
          <Users size={20} /> العيادات
        </button>
        <button onClick={() => setActiveTab('doctors')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'doctors' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
          <Stethoscope size={20} /> الأطباء
        </button>
        <button onClick={() => setActiveTab('remote')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'remote' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
          <Send size={20} /> نداء عن بعد
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'settings' && settings && (
          <div className="max-w-3xl space-y-8 animate-fadeIn">
            <h3 className="text-2xl font-bold text-slate-800">الإعدادات العامة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">اسم المركز</label>
                <input 
                  type="text" 
                  className="w-full p-3 border rounded-xl" 
                  value={settings.center_name} 
                  onChange={(e) => setSettings({...settings, center_name: e.target.value})}
                />
              </div>
              <div className="space-y-2 col-span-full">
                <label className="text-sm font-bold">محتوى الشريط الإخباري</label>
                <textarea 
                  className="w-full p-3 border rounded-xl h-24" 
                  value={settings.ticker_content}
                  onChange={(e) => setSettings({...settings, ticker_content: e.target.value})}
                />
              </div>
            </div>
            <div className="pt-8 border-t flex gap-4">
              <button 
                onClick={async () => {
                  await supabase.from('settings').update(settings).eq('id', settings.id);
                  alert('تم الحفظ');
                }}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold"
              >حفظ التعديلات</button>
              <button onClick={resetAll} className="bg-red-50 text-red-600 px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                <RefreshCw size={18} /> تصفير كل العيادات
              </button>
            </div>
          </div>
        )}

        {activeTab === 'clinics' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-slate-800">إدارة العيادات</h3>
              <button onClick={handleAddClinic} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={18} /> إضافة عيادة</button>
            </div>
            <table className="w-full bg-white rounded-2xl overflow-hidden shadow-sm">
              <thead className="bg-slate-100 text-slate-500 text-right">
                <tr>
                  <th className="p-4">الرقم</th>
                  <th className="p-4">الاسم</th>
                  <th className="p-4">الرقم الحالي</th>
                  <th className="p-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {clinics.map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="p-4 font-bold">{toHindiDigits(c.number)}</td>
                    <td className="p-4">{c.name}</td>
                    <td className="p-4 text-blue-600 font-black">{toHindiDigits(c.current_number)}</td>
                    <td className="p-4 flex gap-2">
                      <button onClick={() => deleteClinic(c.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'remote' && (
           <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
             <h3 className="text-xl font-bold mb-4">النداء عن بعد</h3>
             <p className="text-slate-500">اختر العيادة من لوحة التحكم الموحدة لبدء النداء المباشر.</p>
             <button onClick={() => window.location.hash = '/control'} className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-lg">فتح لوحة التحكم</button>
           </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
