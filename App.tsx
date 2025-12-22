
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

// Pages
import Home from './pages/Home';
import ControlPanel from './pages/ControlPanel';
import DisplayScreen from './pages/DisplayScreen';
import AdminPanel from './pages/AdminPanel';
import FollowUp from './pages/FollowUp';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/control" element={<ControlPanel />} />
          <Route path="/display" element={<DisplayScreen />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/follow-up" element={<FollowUp />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
