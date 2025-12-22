
import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Users, Clock, Bell, Info } from 'lucide-react';
import { supabase, subscribeToChanges } from '../supabase';
import { Clinic } from '../types';
import { toHindiDigits, playSimpleSound } from '../utils';

const FollowUp: React.FC = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [myNumber, setMyNumber] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentClinicData, setCurrentClinicData] = useState<Clinic | null>(null);

  useEffect(() => {
    fetchClinics();
  }, []);

  useEffect(() => {
    if (isFollowing && selectedClinicId) {
      const sub = subscribeToChanges('clinics', (payload) => {
        if (payload.new.id === selectedClinicId) {
          const newData = payload.new as Clinic;
          setCurrentClinicData(newData);
          
          // تنبيهات عند اقتراب الدور
          const remaining = parseInt(myNumber) - newData.current_number;
          if (remaining === 0) {
            playSimpleSound('/audio/ding.mp3');
            if (Notification.permission === 'granted') {
              new Notification('حان دورك الآن!', { body: `يرجى التوجه إلى ${newData.name}` });
            }
          } else if (remaining === 2) {
            playSimpleSound('/audio/ding.mp3');
          }
        }
      });
      return () => { supabase.removeChannel(sub); };
    }
  }, [isFollowing, selectedClinicId, myNumber]);

  const fetchClinics = async () => {
    const { data } = await supabase.from('clinics').select('*').order('number');
    if (data) setClinics(data);
  };

  const startFollowing = () => {
    if (!selectedClinicId || !myNumber) {
      alert('يرجى اختيار العيادة وإدخال رقم تذكرتك');
      return;
    }
    const clinic = clinics.find(c => c.id === selectedClinicId);
    if (clinic) {
      setCurrentClinicData(clinic);
      setIsFollowing(true);
      // طلب إذن الإشعارات
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  };

  const remainingPeople = currentClinicData ? parseInt(myNumber) - currentClinicData.current_number : 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 p-6">
      {!isFollowing ? (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-lg border">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-amber-100 text-amber-600 p-5 rounded-full mb-4">
              <UserCheck size={50} />
            </div>
            <h2 className="text-3xl font-black text-slate-800">متابعة حالة الطابور</h2>
            <p className="text-slate-400 font-bold mt-2">تابع دورك لحظة بلحظة من هاتفك</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-black text-slate-500 mb-2">اختر العيادة</label>
              <select 
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold focus:border-amber-500 outline-none transition-all"
                value={selectedClinicId}
                onChange={e => setSelectedClinicId(e.target.value)}
              >
                <option value="">-- اختر من القائمة --</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-500 mb-2">رقم تذكرتك</label>
              <input 
                type="number" 
                placeholder="أدخل الرقم الموجود في التذكرة"
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold focus:border-amber-500 outline-none transition-all text-center text-2xl"
                value={myNumber}
                onChange={e => setMyNumber(e.target.value)}
              />
            </div>

            <button 
              onClick={startFollowing}
              className="w-full bg-amber-500 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-amber-100 hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Search /> ابدأ المتابعة
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-2xl space-y-6 animate-fadeIn">
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16" />
            
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800">{currentClinicData?.name}</h3>
                <p className="text-slate-400 font-bold flex items-center gap-2 mt-1">
                  <Clock size={16} /> تحديث تلقائي مستمر
                </p>
              </div>
              <button 
                onClick={() => setIsFollowing(false)}
                className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl font-bold hover:bg-slate-200"
              >
                تغيير العيادة
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-50 p-6 rounded-[2rem] text-center border">
                <p className="text-xs font-black text-slate-400 mb-2">رقمك الخاص</p>
                <p className="text-5xl font-black text-amber-600">{toHindiDigits(myNumber)}</p>
              </div>
              <div className="bg-blue-50 p-6 rounded-[2rem] text-center border border-blue-100">
                <p className="text-xs font-black text-blue-400 mb-2">الرقم الحالي</p>
                <p className="text-5xl font-black text-blue-600">{toHindiDigits(currentClinicData?.current_number || 0)}</p>
              </div>
            </div>

            <div className="mt-8 p-8 rounded-[2.5rem] bg-slate-900 text-white text-center shadow-inner relative overflow-hidden">
              {remainingPeople > 0 ? (
                <>
                  <p className="text-lg font-bold mb-2">متبقي قبلك</p>
                  <p className="text-7xl font-black">{toHindiDigits(remainingPeople)}</p>
                  <p className="text-sm text-slate-400 mt-4">عملاء في الانتظار</p>
                </>
              ) : remainingPeople === 0 ? (
                <div className="py-4 animate-pulse">
                  <Bell size={48} className="mx-auto mb-4 text-amber-400" />
                  <p className="text-3xl font-black">حان دورك الآن!</p>
                  <p className="text-sm text-slate-400 mt-2">تفضل بالتوجه لغرفة الكشف</p>
                </div>
              ) : (
                <div className="py-4">
                  <p className="text-2xl font-black text-red-400">لقد فات دورك</p>
                  <p className="text-sm text-slate-400 mt-2">يرجى مراجعة الاستقبال</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-start gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <Info className="text-amber-500 shrink-0" />
              <p className="text-xs text-amber-800 font-bold leading-relaxed">
                سيتم تنبيهك صوتياً وبإشعار على الهاتف عندما يتبقى شخصان فقط قبل دورك. يرجى إبقاء هذه الصفحة مفتوحة.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <p className="text-slate-400 text-xs font-bold flex items-center gap-2">
              <Users size={14} /> حالة العيادة: 
              <span className={currentClinicData?.status === 'active' ? 'text-green-500' : 'text-red-500'}>
                {currentClinicData?.status === 'active' ? 'تعمل الآن' : 'متوقفة مؤقتاً'}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUp;
