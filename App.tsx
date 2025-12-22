
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

// Pages
import Home from './pages/Home';
import ControlPanel from './pages/ControlPanel';
import DisplayScreen from './pages/DisplayScreen';
import AdminPanel from './pages/AdminPanel';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/control" element={<ControlPanel />} />
          <Route path="/display" element={<DisplayScreen />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
