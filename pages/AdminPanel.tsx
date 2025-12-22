
import React, { useState } from 'react';
import { Settings, Users, Tv, Stethoscope, Trash2, Edit, Plus, RefreshCw, Send, Phone, Volume2 } from 'lucide-react';
import { toHindiDigits } from '../utils';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'clinics' | 'doctors' | 'screens' | 'remote'>('settings');

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar */}
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
        <button onClick={() => setActiveTab('screens')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'screens' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
          <Tv size={20} /> الشاشات
        </button>
        <button onClick={() => setActiveTab('remote')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'remote' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
          <Send size={20} /> نداء عن بعد
        </button>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-8 animate-fadeIn">
            <h3 className="text-2xl font-bold text-slate-800">الإعدادات العامة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">اسم المركز</label>
                <input type="text" className="w-full p-3 border rounded-xl" defaultValue="مجمع الأمل الطبي" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">سرعة النطق (1.0 - 2.0)</label>
                <input type="number" step="0.1" className="w-full p-3 border rounded-xl" defaultValue="1.0" />
              </div>
              <div className="space-y-2 col-span-full">
                <label className="text-sm font-bold">محتوى الشريط الإخباري</label>
                <textarea className="w-full p-3 border rounded-xl h-24" defaultValue="أهلاً بكم في مجمع الأمل الطبي.." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">سرعة الشريط</label>
                <input type="range" className="w-full" />
              </div>
            </div>
            <div className="pt-8 border-t flex gap-4">
              <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">حفظ التعديلات</button>
              <button className="bg-red-50 text-red-600 px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                <RefreshCw size={18} /> تصفير جميع العيادات
              </button>
            </div>
          </div>
        )}

        {activeTab === 'clinics' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-slate-800">إدارة العيادات</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={18} /> إضافة عيادة</button>
            </div>
            <table className="w-full bg-white rounded-2xl overflow-hidden shadow-sm">
              <thead className="bg-slate-100 text-slate-500 text-right">
                <tr>
                  <th className="p-4">الرقم</th>
                  <th className="p-4">الاسم</th>
                  <th className="p-4">الرقم الحالي</th>
                  <th className="p-4">كلمة السر</th>
                  <th className="p-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-4 font-bold">{toHindiDigits(1)}</td>
                  <td className="p-4">عيادة الباطنة</td>
                  <td className="p-4 text-blue-600 font-black">{toHindiDigits(14)}</td>
                  <td className="p-4">****</td>
                  <td className="p-4 flex gap-2">
                    <button className="p-2 text-slate-400 hover:text-blue-600"><Edit size={18} /></button>
                    <button className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'remote' && (
          <div className="space-y-8 animate-fadeIn">
             <h3 className="text-2xl font-bold text-slate-800">أدوات النداء الموحدة</h3>
             <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
               <label className="block mb-2 font-bold">اختر العيادة للتحكم بها:</label>
               <select className="w-full p-4 border rounded-xl text-lg">
                 <option>عيادة الباطنة</option>
                 <option>عيادة العيون</option>
               </select>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                  <h4 className="font-bold border-b pb-2">التحكم المباشر</h4>
                  <button className="w-full bg-blue-600 text-white p-3 rounded-lg">العميل التالي</button>
                  <button className="w-full bg-slate-100 text-slate-700 p-3 rounded-lg">تكرار النداء</button>
                  <button className="w-full bg-red-100 text-red-600 p-3 rounded-lg">توقف العيادة</button>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                  <h4 className="font-bold border-b pb-2">إجراءات إضافية</h4>
                  <button className="w-full flex items-center justify-center gap-2 border p-3 rounded-lg hover:bg-slate-50">
                    <Volume2 size={18} /> نداء مخصص
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 border p-3 rounded-lg hover:bg-slate-50 text-amber-600">
                    <Phone size={18} /> رن على العيادة
                  </button>
                  <button className="w-full bg-slate-900 text-white p-3 rounded-lg">تسجيل وبث مقطع صوتي</button>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                   <h4 className="font-bold border-b pb-2 mb-4">التنبيهات الواردة للمدير</h4>
                   <div className="space-y-2 text-sm text-slate-500">
                     <p>• عيادة الأسنان تطلب المساعدة (١٠:١٥ ص)</p>
                     <p>• بلاغ طوارئ من الاستقبال (٠٩:٣٠ ص)</p>
                   </div>
                </div>
             </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminPanel;
