
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Tv, Settings, BookOpen, LogOut, Activity, PhoneCall, AlertTriangle, UserPlus, ArrowLeftRight } from 'lucide-react';
import { toHindiDigits } from './utils';

// Pages (defined in separate components below for clarity)
import Home from './pages/Home';
import ControlPanel from './pages/ControlPanel';
import DisplayScreen from './pages/DisplayScreen';
import AdminPanel from './pages/AdminPanel';
import Instructions from './pages/Instructions';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/control" element={<ControlPanel />} />
          <Route path="/display" element={<DisplayScreen />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/instructions" element={<Instructions />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
