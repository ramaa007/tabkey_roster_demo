import React, { useState, useEffect } from 'react';
import { supabase } from '../core/mock-db';
import { 
  Tablet, Play, Coffee, Clock, RefreshCw
} from 'lucide-react';
import logo from '../assets/logo.svg';
import Swal from 'sweetalert2';

export default function KioskPortal({ onPortalSwitch }) {
  const logoUrl = localStorage.getItem('custom_logo_url') || logo;
  const [pin, setPin] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [authenticatedStaff, setAuthenticatedStaff] = useState(null);
  const [activeLog, setActiveLog] = useState(null);
  const [screenState, setScreenState] = useState('pin'); // pin, actions
  const [orientation, setOrientation] = useState('portrait'); // portrait, landscape
  
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [targetPortal, setTargetPortal] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*');
    setProfiles(data || []);
  };

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      setPin(pin + num);
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleEnter = () => {
    if (pin.length !== 4) {
      Swal.fire({
        icon: 'warning',
        title: 'PIN Underlength',
        text: 'Please enter a full 4-digit PIN code.',
        confirmButtonColor: '#ea580c'
      });
      return;
    }

    const staff = profiles.find(p => p.kiosk_pin === pin && p.role !== 'manager');
    if (!staff) {
      Swal.fire({
        icon: 'error',
        title: 'Authentication Failure',
        text: 'Invalid security PIN code. Please try again.',
        confirmButtonColor: '#e11d48'
      });
      setPin('');
      return;
    }

    // Authenticated successfully! Now check their clock status
    setAuthenticatedStaff(staff);
    checkClockStatus(staff.id);
  };

  const checkClockStatus = async (userId) => {
    const { data } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', userId)
      .order('clock_in', { ascending: false });

    const openLog = (data || []).find(l => !l.clock_out);
    if (openLog) {
      setActiveLog(openLog);
    } else {
      setActiveLog(null);
    }
    setScreenState('actions');
  };

  const handleClockAction = async (action) => {
    if (!authenticatedStaff) return;

    if (action === 'in') {
      const newLog = {
        id: "tl-" + Math.random().toString(36).substr(2, 9),
        user_id: authenticatedStaff.id,
        clock_in: new Date().toISOString(),
        clock_out: null,
        break_start: null,
        break_end: null,
        notes: "Clocked in via Kiosk PIN verification.",
        is_approved: true
      };
      await supabase.from('time_logs').insert(newLog);

      Swal.fire({
        icon: 'success',
        title: 'Clock In Successful! 🌀',
        html: `Have an amazing shift, <strong>${authenticatedStaff.full_name}</strong>!<br/>Time to bake some fresh, warm Cinnabons!`,
        confirmButtonColor: '#10b981'
      });
      
      resetKiosk();
    } else if (action === 'break_start') {
      if (!activeLog) return;
      await supabase.from('time_logs').update({
        break_start: new Date().toISOString()
      }).eq('id', activeLog.id);
      
      Swal.fire({
        icon: 'info',
        title: 'Break Logged ☕',
        text: `Rest up, ${authenticatedStaff.full_name}! 30 min meal break clock active.`,
        confirmButtonColor: '#f59e0b'
      });

      resetKiosk();
    } else if (action === 'break_end') {
      if (!activeLog) return;
      await supabase.from('time_logs').update({
        break_end: new Date().toISOString()
      }).eq('id', activeLog.id);

      Swal.fire({
        icon: 'success',
        title: 'Break Complete 💪',
        text: `Welcome back on line, ${authenticatedStaff.full_name}. Let's bake some delicious Cinnabons!`,
        confirmButtonColor: '#10b981'
      });

      resetKiosk();
    } else if (action === 'out') {
      if (!activeLog) return;

      // Checklist lockout check on Kiosk too!
      const { data: tasks } = await supabase.from('tasks').select('*').eq('assigned_to', authenticatedStaff.id);
      const pendingCount = (tasks || []).filter(t => !t.is_completed).length;
      if (pendingCount > 0) {
        Swal.fire({
          icon: 'warning',
          title: '📋 Checklist Lockout Active',
          html: `Hey <strong>${authenticatedStaff.full_name}</strong>, you have <strong>${pendingCount} pending task(s)</strong>.<br/>Please complete all daily store tasks before clocking out.`,
          confirmButtonColor: '#e11d48'
        });
        return;
      }

      await supabase.from('time_logs').update({
        clock_out: new Date().toISOString(),
        notes: "Clocked out via Kiosk terminal."
      }).eq('id', activeLog.id);

      Swal.fire({
        icon: 'success',
        title: 'Shift Logged Successfully! 🌀',
        html: `Great shift today, <strong>${authenticatedStaff.full_name}</strong>!<br/>Checkout complete. Hours sent to Sarah Jenkins for approval.`,
        confirmButtonColor: '#4F46E5'
      });

      resetKiosk();
    }
  };

  const resetKiosk = () => {
    setScreenState('pin');
    setAuthenticatedStaff(null);
    setActiveLog(null);
    setPin('');
  };

  const triggerPortalSwitch = (portal) => {
    setTargetPortal(portal);
    setLoadingOverlay(true);
    setTimeout(() => {
      setLoadingOverlay(false);
      onPortalSwitch(portal);
    }, 1200);
  };

  return (
    <div className="w-full h-[100dvh] bg-[#f8fafc] dark:bg-[#090a0f] flex flex-col items-center justify-center p-4 md:p-8 text-center animate-fade-in relative overflow-hidden select-none pb-24 transition-colors duration-250">
      
      {/* Absolute Geometric Background Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-indigo-600/5 dark:bg-indigo-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-violet-600/5 dark:bg-violet-600/10 blur-3xl pointer-events-none" />

      {/* Floating Orientation Switcher Pill at the top */}
      <div className="z-30 mb-5 shrink-0 flex items-center justify-center">
        <button 
          onClick={() => setOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')}
          className="px-5 py-2.5 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 active:scale-95 text-slate-700 dark:text-white rounded-full font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border border-[#e2e8f0] dark:border-white/10 shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          <span>Rotate Tablet: <strong className="text-indigo-500 dark:text-indigo-400">{orientation === 'portrait' ? 'Portrait' : 'Landscape'}</strong></span>
        </button>
      </div>

      {/* iPad simulated device bezel */}
      <div 
        className={`transition-all duration-500 ease-in-out relative flex flex-col bg-slate-200 dark:bg-slate-900 border-[14px] border-slate-300 dark:border-slate-950 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden outline outline-2 outline-slate-300/30 dark:outline-white/5 shrink-0
          ${orientation === 'portrait' 
            ? 'w-full max-w-[390px] h-[640px] md:w-[410px] md:h-[680px]' 
            : 'w-full max-w-[680px] h-[390px] md:w-[740px] md:h-[410px]'
          }
        `}
      >
        {/* Device Camera Accent on bezel */}
        <div className={`absolute bg-slate-400 dark:bg-slate-950 z-30 flex items-center justify-center rounded-full transition-all duration-500
          ${orientation === 'portrait'
            ? 'top-3 left-1/2 -translate-x-1/2 w-2.5 h-2.5'
            : 'left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5'
          }
        `}>
          <div className="w-1 h-1 rounded-full bg-indigo-900/60" />
        </div>

        {/* Glossy reflection sheen overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/0 via-white/5 dark:via-white/2 to-white/0 z-20" />

        {/* Internal Screen Content */}
        <div className="w-full h-full flex flex-col bg-[#f8fafc] dark:bg-[#090a0f] text-slate-800 dark:text-slate-200 p-6 md:p-8 overflow-y-auto relative z-10 text-left justify-center transition-colors duration-250">
          
          {/* RENDER PIN SCREEN */}
          {screenState === 'pin' && (
            <div className="w-full animate-fade-in">
              {orientation === 'portrait' ? (
                /* Portrait stacked layout */
                <div className="flex flex-col space-y-6 text-center">
                  <img src={logoUrl} alt="Cinnabon Logo" className="h-9 w-auto mx-auto dark:brightness-110" />
                  
                  <div>
                    <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight leading-none">PIN Kiosk</h2>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-2">Enter PIN to clock attendance</p>
                  </div>

                  {/* Dots */}
                  <div className="flex items-center justify-center gap-4 py-1 select-none">
                    {[0, 1, 2, 3].map(i => (
                      <div 
                        key={i} 
                        className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                          pin.length > i 
                            ? 'bg-indigo-650 border-indigo-650 dark:bg-indigo-500 dark:border-indigo-500 scale-110 shadow-md shadow-indigo-500/30' 
                            : 'border-slate-200 dark:border-white/20 bg-transparent'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Keyboard */}
                  <div className="grid grid-cols-3 gap-3 font-bold text-slate-800 dark:text-white text-lg max-w-[15rem] mx-auto select-none pt-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <button 
                        key={n} 
                        onClick={() => handleKeyPress(n.toString())}
                        className="w-12 h-12 rounded-full border border-[#e2e8f0] dark:border-[#1f212e] bg-white dark:bg-[#12131a] hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 flex items-center justify-center mx-auto transition-all cursor-pointer text-base font-bold shadow-sm"
                      >
                        {n}
                      </button>
                    ))}
                    <button 
                      onClick={handleClear}
                      className="w-12 h-12 rounded-full border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 bg-rose-50/50 dark:bg-rose-500/5 hover:bg-rose-100/50 dark:hover:bg-rose-500/10 active:scale-95 flex items-center justify-center mx-auto text-[10px] uppercase font-black transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={() => handleKeyPress('0')}
                      className="w-12 h-12 rounded-full border border-[#e2e8f0] dark:border-[#1f212e] bg-white dark:bg-[#12131a] hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 flex items-center justify-center mx-auto transition-all cursor-pointer text-base font-bold shadow-sm"
                    >
                      0
                    </button>
                    <button 
                      onClick={handleEnter}
                      className="w-12 h-12 rounded-full border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10 active:scale-95 flex items-center justify-center mx-auto text-[10px] uppercase font-black transition-all cursor-pointer"
                    >
                      Enter
                    </button>
                  </div>
                </div>
              ) : (
                /* Landscape adaptive 2-column layout */
                <div className="grid grid-cols-12 gap-6 items-center">
                  {/* Left Column: Branding / Info */}
                  <div className="col-span-5 flex flex-col space-y-4 border-r border-[#e2e8f0] dark:border-white/5 pr-6 h-full justify-center text-center md:text-left">
                    <img src={logoUrl} alt="Cinnabon Logo" className="h-9 w-auto mx-auto md:mx-0 dark:brightness-110" />
                    <div>
                      <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight leading-none mt-2">PIN Kiosk</h2>
                      <p className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold uppercase tracking-widest mt-1">Cinnabon Attendance Terminal</p>
                    </div>
                    <div className="bg-white dark:bg-white/5 border border-[#e2e8f0] dark:border-white/10 p-3.5 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      <p className="text-indigo-650 dark:text-indigo-300 font-black uppercase text-[8px] tracking-widest mb-1">Store Information</p>
                      Cinnabon Westfield Carindale<br/>
                      Get Cinnabons Round & Tasty! 🌀
                    </div>
                  </div>

                  {/* Right Column: PIN Pad */}
                  <div className="col-span-7 flex flex-col space-y-4 pl-4 items-center justify-center">
                    {/* Dots */}
                    <div className="flex items-center justify-center gap-4 select-none">
                      {[0, 1, 2, 3].map(i => (
                        <div 
                          key={i} 
                          className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                            pin.length > i 
                              ? 'bg-indigo-650 border-indigo-650 dark:bg-indigo-500 dark:border-indigo-500 scale-110 shadow-md shadow-indigo-500/30' 
                              : 'border-slate-200 dark:border-white/20 bg-transparent'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Numeric Keyboard (compact grid) */}
                    <div className="grid grid-cols-3 gap-x-6 gap-y-2 font-bold text-slate-800 dark:text-white text-base max-w-[15rem] mx-auto select-none pt-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <button 
                          key={n} 
                          onClick={() => handleKeyPress(n.toString())}
                          className="w-10 h-10 rounded-full border border-[#e2e8f0] dark:border-[#1f212e] bg-white dark:bg-[#12131a] hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 flex items-center justify-center mx-auto transition-all cursor-pointer text-sm font-bold shadow-sm"
                        >
                          {n}
                        </button>
                      ))}
                      <button 
                        onClick={handleClear}
                        className="w-10 h-10 rounded-full border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 bg-rose-50/50 dark:bg-rose-500/5 hover:bg-rose-100/50 dark:hover:bg-rose-500/10 active:scale-95 flex items-center justify-center mx-auto text-[9px] uppercase font-black transition-all cursor-pointer"
                      >
                        Clear
                      </button>
                      <button 
                        onClick={() => handleKeyPress('0')}
                        className="w-10 h-10 rounded-full border border-[#e2e8f0] dark:border-[#1f212e] bg-white dark:bg-[#12131a] hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 flex items-center justify-center mx-auto transition-all cursor-pointer text-sm font-bold shadow-sm"
                      >
                        0
                      </button>
                      <button 
                        onClick={handleEnter}
                        className="w-10 h-10 rounded-full border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10 active:scale-95 flex items-center justify-center mx-auto text-[9px] uppercase font-black transition-all cursor-pointer"
                      >
                        Enter
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RENDER ACTIONS SELECTION SCREEN */}
          {screenState === 'actions' && authenticatedStaff && (
            <div className="w-full animate-fade-in">
              {orientation === 'portrait' ? (
                /* Portrait Actions stacked */
                <div className="flex flex-col space-y-6 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div 
                      style={{ backgroundColor: authenticatedStaff.color || '#4F46E5' }} 
                      className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-white text-xl uppercase shadow-md relative"
                    >
                      {authenticatedStaff.full_name[0]}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight leading-none">{authenticatedStaff.full_name}</h2>
                      <p className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold uppercase tracking-widest mt-2">
                        Cinnabon Team Member
                      </p>
                    </div>
                  </div>

                  <div className="w-full flex flex-col gap-3 max-w-[16rem] mx-auto">
                    {!activeLog ? (
                      <button 
                        onClick={() => handleClockAction('in')}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Clock In</span>
                      </button>
                    ) : (
                      <>
                        {activeLog.break_start && !activeLog.break_end ? (
                          <button 
                            onClick={() => handleClockAction('break_end')}
                            className="w-full py-3 bg-emerald-500 hover:bg-emerald-650 text-white rounded-xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                          >
                            <Coffee className="w-4 h-4" />
                            <span>End Break</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleClockAction('break_start')}
                            className="w-full py-3 bg-amber-500 hover:bg-amber-650 text-white rounded-xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                          >
                            <Coffee className="w-4 h-4" />
                            <span>Start Break</span>
                          </button>
                        )}

                        <button 
                          onClick={() => handleClockAction('out')}
                          className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                        >
                          <Clock className="w-4 h-4" />
                          <span>Clock Out</span>
                        </button>
                      </>
                    )}

                    <button 
                      onClick={resetKiosk}
                      className="w-full py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white rounded-xl font-semibold text-xs active:scale-95 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Landscape Actions side-by-side */
                <div className="grid grid-cols-12 gap-6 items-center">
                  {/* Left half: User Avatar & info */}
                  <div className="col-span-5 flex flex-col space-y-4 border-r border-[#e2e8f0] dark:border-white/5 pr-6 items-center text-center justify-center h-full">
                    <div 
                      style={{ backgroundColor: authenticatedStaff.color || '#4F46E5' }} 
                      className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-white text-xl uppercase shadow-md relative"
                    >
                      {authenticatedStaff.full_name[0]}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight leading-none">{authenticatedStaff.full_name}</h2>
                      <p className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold uppercase tracking-widest mt-1.5">
                        Cinnabon Team Member
                      </p>
                    </div>
                    <button 
                      onClick={resetKiosk}
                      className="w-full max-w-[10rem] py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white rounded-xl font-semibold text-xs active:scale-95 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Right half: touch Clocking actions */}
                  <div className="col-span-7 flex flex-col space-y-3 pl-4 items-center justify-center">
                    {!activeLog ? (
                      <button 
                        onClick={() => handleClockAction('in')}
                        className="w-full max-w-[16rem] py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Clock In</span>
                      </button>
                    ) : (
                      <>
                        {activeLog.break_start && !activeLog.break_end ? (
                          <button 
                            onClick={() => handleClockAction('break_end')}
                            className="w-full max-w-[16rem] py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                          >
                            <Coffee className="w-4 h-4" />
                            <span>End Break</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleClockAction('break_start')}
                            className="w-full max-w-[16rem] py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                          >
                            <Coffee className="w-4 h-4" />
                            <span>Start Break</span>
                          </button>
                        )}

                        <button 
                          onClick={() => handleClockAction('out')}
                          className="w-full max-w-[16rem] py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                        >
                          <Clock className="w-4 h-4" />
                          <span>Clock Out</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Switch Loading Overlay */}
      {loadingOverlay && (
        <div className="fixed inset-0 bg-[#090a0f]/80 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center animate-fade-in">
          <div className="space-y-4">
            <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
            <h3 className="text-white text-lg font-black tracking-tight leading-none">Switching Demo Portals</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Entering {targetPortal} Mode...</p>
          </div>
        </div>
      )}

    </div>
  );
}
