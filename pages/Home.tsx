
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tv, LayoutDashboard, Settings, UserCheck } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    { title: 'شاشة العرض', icon: <Tv size={48} />, path: '/display', color: 'bg-blue-600' },
    { title: 'لوحة التحكم', icon: <LayoutDashboard size={48} />, path: '/control', color: 'bg-emerald-600' },
    { title: 'متابعة دورك', icon: <UserCheck size={48} />, path: '/follow-up', color: 'bg-amber-500' },
    { title: 'الإدارة', icon: <Settings size={48} />, path: '/admin', color: 'bg-purple-600' },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50">
      <h1 className="text-4xl font-black text-slate-800 mb-12">نظام إدارة العيادات الذكي</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`${item.color} hover:scale-105 transition-all text-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6 group`}
          >
            <div className="p-5 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
              {item.icon}
            </div>
            <span className="text-2xl font-bold">{item.title}</span>
          </button>
        ))}
      </div>
      <footer className="mt-20 text-slate-400 text-sm font-bold">
        نظام النداء الآلي المتكامل &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Home;
