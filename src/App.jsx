import React, { useState, useEffect } from 'react';
import LoginPortal from './components/LoginPortal';
import EmployeePortal from './components/EmployeePortal';
import ManagerDashboard from './components/ManagerDashboard';
import KioskPortal from './components/KioskPortal';
import { supabase } from './core/mock-db';
import Swal from 'sweetalert2';

export default function App() {
  const [user, setUser] = useState(null);
  const [portalMode, setPortalMode] = useState('employee'); // employee, manager, kiosk

  useEffect(() => {
    runDbDiagnostics();
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'kiosk') {
      setPortalMode('kiosk');
    }
  }, []);

  useEffect(() => {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    const safariId = import.meta.env.VITE_ONESIGNAL_SAFARI_ID;
    
    if (appId) {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal) {
        try {
          await OneSignal.init({
            appId: appId,
            safari_web_id: safariId || undefined,
            notifyButton: {
              enable: false,
            }
          });
          console.log("OneSignal successfully initialised in React!");
        } catch(e) {
          console.log("OneSignal init blocked safely:", e.message);
        }
      });
    }
  }, []);

  useEffect(() => {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!appId) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal) {
      try {
        if (user && user.id) {
          await OneSignal.login(user.id);
          setTimeout(async () => {
            try {
              await OneSignal.Slidedown.promptPush();
            } catch (err) {}
          }, 1500);
          console.log(`OneSignal synced login: ${user.id}`);
        } else {
          await OneSignal.logout();
          console.log("OneSignal synced logout");
        }
      } catch (e) {
        console.log("OneSignal user sync error:", e);
      }
    });
  }, [user]);

  const runDbDiagnostics = async () => {
    // Only run diagnostics if live connection is configured
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const isLive = envUrl && envKey && envUrl !== "https://your-project-id.supabase.co";
    if (!isLive) return;

    const tables = ['profiles', 'shifts', 'time_logs', 'leave_requests', 'swap_requests', 'notices', 'xero_tokens'];
    const errors = [];
    
    for (let table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          errors.push(`Table "${table}": ${error.message} (${error.code})`);
        }
      } catch (e) {
        errors.push(`Table "${table}" exception: ${e.message}`);
      }
    }
    
    if (errors.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Supabase Database Diagnostics',
        html: `<div style="text-align: left; font-size: 12px; max-height: 250px; overflow-y: auto;">
          <p>We detected the following database schema issues on your Supabase project:</p>
          <ul style="padding-left: 15px; color: #e11d48; font-weight: bold; list-style-type: disc;">
            ${errors.map(err => `<li style="margin-bottom: 5px;">${err}</li>`).join('')}
          </ul>
          <p style="margin-top: 10px; font-weight: bold; color: #4F46E5;">Remediation: Make sure these tables exist in your Supabase schema and RLS has been disabled or configured to allow anonymous reads/writes.</p>
        </div>`,
        confirmButtonColor: '#ea580c',
        width: '480px'
      });
    }
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    // If manager logs in, defaults to manager dashboard
    if (loggedInUser.role === 'manager') {
      setPortalMode('manager');
    } else {
      setPortalMode('employee');
    }
  };

  const handlePortalSwitch = (targetMode) => {
    setPortalMode(targetMode);
    
    // Auto-log in mock users if switching between portals during presentation
    if (targetMode === 'manager') {
      setUser({ id: 'p-manager', role: 'manager', full_name: 'Sarah Jenkins', color: '#4F46E5' });
    } else if (targetMode === 'employee') {
      setUser({ id: 'p-alex', role: 'employee', full_name: 'Alex Mercer', color: '#ea580c' });
    }
  };

  const handleLogout = () => {
    setUser(null);
    setPortalMode('employee');
  };

  // 2. Authenticated Portals & Presentation Switcher
  return (
    <div className="w-full h-[100dvh] bg-[#f8fafc] dark:bg-[#090a0f] text-slate-800 dark:text-slate-200 relative overflow-hidden font-sans transition-colors duration-250">
      
      {/* RENDER LOGIN PORTAL */}
      {!user && portalMode !== 'kiosk' && (
        <LoginPortal onLoginSuccess={handleLoginSuccess} />
      )}

      {/* RENDER EMPLOYEE PORTAL */}
      {portalMode === 'employee' && user && (
        <EmployeePortal 
          user={user} 
          onLogout={handleLogout} 
          onPortalSwitch={handlePortalSwitch} 
        />
      )}

      {/* RENDER MANAGER DASHBOARD */}
      {portalMode === 'manager' && user && (
        <ManagerDashboard 
          user={user} 
          onLogout={handleLogout} 
          onPortalSwitch={handlePortalSwitch} 
        />
      )}

      {/* RENDER iPad KIOSK PORTAL (PIN pad Attendance Clock) */}
      {portalMode === 'kiosk' && (
        <KioskPortal 
          onPortalSwitch={handlePortalSwitch} 
        />
      )}

      {/* FLOATING PORTAL SWITCHER PILL (FOR PRESENTATIONS & DEMOS ONLY) */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[99999] bg-white/90 dark:bg-[#12131a]/90 backdrop-blur-md p-2 rounded-2xl border border-indigo-500/20 shadow-2xl flex flex-col gap-2 select-none">
        <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center border-b border-slate-100 dark:border-white/5 pb-1 mb-0.5 font-display select-none">
          Demo Nav
        </div>
        <button
          onClick={() => handlePortalSwitch('manager')}
          className={`px-3 py-2 rounded-xl text-[9px] font-bold font-display uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none text-left w-28 ${
            portalMode === 'manager' && user
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-white/5'
          }`}
        >
          <span>💼</span>
          <span>Manager</span>
        </button>

        <button
          onClick={() => handlePortalSwitch('employee')}
          className={`px-3 py-2 rounded-xl text-[9px] font-bold font-display uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none text-left w-28 ${
            portalMode === 'employee' && user
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-white/5'
          }`}
        >
          <span>👤</span>
          <span>Staff App</span>
        </button>

        <button
          onClick={() => handlePortalSwitch('kiosk')}
          className={`px-3 py-2 rounded-xl text-[9px] font-bold font-display uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-none text-left w-28 ${
            portalMode === 'kiosk'
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-white/5'
          }`}
        >
          <span>📟</span>
          <span>iPad Kiosk</span>
        </button>
      </div>

    </div>
  );
}
