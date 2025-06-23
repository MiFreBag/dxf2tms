import React, { useState, useEffect } from 'react';
import { 
  Upload, Download, Trash2, File, Folder, Search, 
  Grid, List, Plus, Settings, User, Bell, 
  CheckCircle, Clock, AlertCircle, X, Eye,
  Share2, Copy, MoreVertical, Filter
} from 'lucide-react';
import FileBrokerUI from './components/FileManager/FileManager';
import MapTilerComponent from './components/MapTiler/MapTilerComponent';
import './styles/globals.css';

function App() {
  const [token, setToken] = React.useState(localStorage.getItem('auth_token'));
  const [notifications, setNotifications] = React.useState([]);

  const addMessage = (message, type = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    const newNotification = { id: Date.now(), message, type };
    setNotifications(prev => [...prev, newNotification]);
    setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  };

  // This is a placeholder for a real login flow
  React.useEffect(() => {
    const fetchToken = async () => {
      if (!localStorage.getItem('auth_token')) {
        try {
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
          });
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('auth_token', data.access_token);
            setToken(data.access_token);
          }
        } catch (error) {
          console.error("Failed to login for token", error);
        }
      }
    };
    fetchToken();
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen">
      <FileBrokerUI token={token} onMessage={addMessage} />
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow">
          <MapTilerComponent token={token} onMessage={addMessage} />
        </div>
      </div>
      {/* Simple notification display */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {notifications.map(n => (
              <div key={n.id} className={`px-4 py-3 rounded-lg shadow-lg text-white ${n.type === 'error' ? 'bg-red-500' : n.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}>
                  {n.message}
              </div>
          ))}
      </div>
    </div>
  );
}

export default App;