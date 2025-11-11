import React, { useState } from 'react';
import Navigation from './components/Navigation';
import HomePage from './components/HomePage';
import DealerPanel from './components/DealerPanel';
import InsurancePanel from './components/InsurancePanel';
import WorkshopPanel from './components/WorkshopPanel';

function App() {
  const [currentPanel, setCurrentPanel] = useState('home');

  const renderPanel = () => {
    switch (currentPanel) {
      case 'dealer':
        return <DealerPanel />;
      case 'insurance':
        return <InsurancePanel />;
      case 'workshop':
        return <WorkshopPanel />;
      default:
        return <HomePage onPanelChange={setCurrentPanel} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPanel={currentPanel} onPanelChange={setCurrentPanel} />
      {renderPanel()}
    </div>
  );
}

export default App;