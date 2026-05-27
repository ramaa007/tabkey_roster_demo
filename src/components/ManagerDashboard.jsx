import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Printer, Copy, Zap, Trash2, 
  Send, DollarSign, AlertTriangle, CheckCircle, Plus, 
  UserPlus, X, RefreshCw, LogOut, Smartphone, Tablet, Monitor, Megaphone,
  Users, ShieldCheck, Repeat, Settings, Clock, PieChart, 
  Edit, MessageSquare, Coffee, Check, CloudLightning, Activity,
  Sliders, PlusCircle, LayoutDashboard, Shield, CloudSun, Brain, TrendingUp,
  FileText, Camera, Heart, CheckSquare, Award, UserCheck, Eye, Calendar
} from 'lucide-react';
import { supabase, resetDemoData } from '../core/mock-db';
import { calculateShiftMetrics, checkShiftOverlap, checkLeaveConflict } from '../core/calculator';
import Swal from 'sweetalert2';

const STORAGE_KEY_PREFIX = "tabkey_roster_solution_db_";

// Helper to get 7 date strings starting from a given Monday date string (YYYY-MM-DD)
function getDatesForMonday(mondayStr) {
  const dates = [];
  const parts = mondayStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(year, month, day + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}


// Helper to get dates for the week based on offset
function getWeekDates(offsetWeeks = 0) {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday of current week
  const monday = new Date(d.setDate(diff));
  monday.setDate(monday.getDate() + (offsetWeeks * 7));
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    const y = nextDay.getFullYear();
    const m = String(nextDay.getMonth() + 1).padStart(2, '0');
    const da = String(nextDay.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${da}`);
  }
  return dates;
}

// Premium Weather Mini Icon component with CSS/SVG animations
function WeatherMiniIcon({ weather }) {
  if (weather === 'Sunny') {
    return (
      <div className="relative w-5 h-5 flex items-center justify-center animate-weather-spin-slow text-amber-500 drop-shadow-sm select-none">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="5" className="text-amber-500" />
          {[...Array(8)].map((_, i) => (
            <line
              key={i}
              x1="12"
              y1="1"
              x2="12"
              y2="4"
              transform={`rotate(${i * 45} 12 12)`}
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-amber-400"
            />
          ))}
        </svg>
      </div>
    );
  }
  if (weather === 'Rainy') {
    return (
      <div className="relative w-5 h-5 flex items-center justify-center text-blue-500 select-none">
        <svg className="w-4 h-4 animate-weather-cloud-drift" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.36 10.04a6 6 0 0 0-11.32-2.05 4 4 0 0 0-.58 7.89h11.23a4.5 4.5 0 0 0 .67-5.84z" className="text-slate-400 dark:text-slate-500" />
        </svg>
        <div className="absolute inset-0 top-2.5 flex justify-center gap-0.5 text-blue-400 font-bold text-[8px] animate-pulse">
          <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>.</span>
        </div>
      </div>
    );
  }
  if (weather === 'Heatwave') {
    return (
      <div className="relative w-5 h-5 flex items-center justify-center text-orange-500 animate-weather-pulse-glow select-none">
        <span className="text-xs">🔥</span>
      </div>
    );
  }
  if (weather === 'Cold') {
    return (
      <div className="relative w-5 h-5 flex items-center justify-center text-cyan-500 animate-spin select-none" style={{ animationDuration: '8s' }}>
        <span className="text-xs">❄️</span>
      </div>
    );
  }
  return <span className="text-xs select-none">🌤️</span>;
}

// Full-scale interactive Animated Canvas for Roster Weather Forecaster Card
function WeatherLiveCanvas({ weather }) {
  if (weather === 'Sunny') {
    return (
      <div className="relative h-28 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400/20 via-sky-300/10 to-indigo-500/5 dark:from-amber-500/10 dark:via-sky-950/20 dark:to-[#090a0f] border border-amber-200/30 dark:border-amber-500/10 flex items-center justify-center">
        <div className="absolute w-36 h-36 border border-dashed border-amber-300/20 dark:border-amber-400/10 rounded-full animate-weather-spin-slow" />
        <div className="absolute w-24 h-24 border border-dashed border-amber-300/30 dark:border-amber-400/20 rounded-full animate-weather-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '15s' }} />
        
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center animate-weather-pulse-glow relative shadow-lg shadow-amber-500/25">
          <span className="text-2xl select-none">☀️</span>
          <div className="absolute inset-[-6px] rounded-full border border-amber-400/40 animate-ping" style={{ animationDuration: '3s' }} />
        </div>
      </div>
    );
  }
  
  if (weather === 'Rainy') {
    return (
      <div className="relative h-28 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700/25 via-slate-800/10 to-indigo-900/10 dark:from-slate-900/30 dark:via-[#12131a] dark:to-blue-950/20 border border-slate-500/20 dark:border-slate-500/10">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 animate-weather-cloud-drift select-none">
          <span className="text-3xl filter drop-shadow-md opacity-85">🌧️</span>
          <span className="text-2xl opacity-60 filter drop-shadow-sm -ml-2 mb-2">☁️</span>
        </div>
        
        <div className="absolute inset-0 flex justify-around pointer-events-none px-4">
          {[...Array(12)].map((_, i) => {
            const delay = (i * 0.15).toFixed(2);
            const duration = (0.6 + Math.random() * 0.4).toFixed(2);
            return (
              <div 
                key={i} 
                className="w-[1.5px] bg-gradient-to-b from-blue-400 to-transparent rounded-full opacity-65"
                style={{
                  height: '18px',
                  animation: `weather-rain-fall ${duration}s infinite linear`,
                  animationDelay: `${delay}s`,
                  transform: 'translate3d(0, -20px, 0)',
                  willChange: 'transform'
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }
  
  if (weather === 'Heatwave') {
    return (
      <div className="relative h-28 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600/15 via-rose-500/10 to-amber-500/5 dark:from-orange-700/10 dark:via-red-950/20 dark:to-[#090a0f] border border-orange-500/20 dark:border-orange-500/10 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600/10 to-amber-500/20 absolute blur-xl animate-pulse" />
        
        <div className="absolute bottom-2 flex justify-around w-full pointer-events-none px-4">
          {[...Array(10)].map((_, i) => {
            const delay = (i * 0.2).toFixed(2);
            const duration = (1.5 + Math.random() * 0.8).toFixed(2);
            return (
              <div 
                key={i}
                className="w-1 h-14 bg-gradient-to-t from-red-500/35 via-orange-400/20 to-transparent rounded-full"
                style={{
                  animation: `weather-heat-rise ${duration}s infinite ease-in-out`,
                  animationDelay: `${delay}s`,
                  transform: 'translate3d(0, 110px, 0)',
                  willChange: 'transform'
                }}
              />
            );
          })}
        </div>
        
        <div className="z-10 flex flex-col items-center select-none">
          <span className="text-3xl animate-bounce" style={{ animationDuration: '3s' }}>🔥</span>
          <span className="text-[8px] font-extrabold font-display uppercase tracking-widest text-orange-600/80 dark:text-orange-400 mt-1">Extreme Thermal Load</span>
        </div>
      </div>
    );
  }

  if (weather === 'Cold') {
    return (
      <div className="relative h-28 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400/15 via-blue-500/10 to-indigo-900/15 dark:from-cyan-900/10 dark:via-[#12131a] dark:to-indigo-950/20 border border-cyan-300/30 dark:border-cyan-500/10 flex items-center justify-center">
        <div className="absolute w-20 h-20 border border-dashed border-cyan-400/15 rounded-full animate-spin" style={{ animationDuration: '25s' }} />
        
        <div className="absolute inset-0 flex justify-around pointer-events-none px-4">
          {[...Array(10)].map((_, i) => {
            const delay = (i * 0.35).toFixed(2);
            const duration = (2.2 + Math.random() * 1.2).toFixed(2);
            return (
              <div 
                key={i}
                className="text-cyan-400/70 select-none font-bold text-xs"
                style={{
                  animation: `weather-snow-drift ${duration}s infinite linear`,
                  animationDelay: `${delay}s`,
                  transform: 'translate3d(0, -20px, 0)',
                  willChange: 'transform'
                }}
              >
                ❄️
              </div>
            );
          })}
        </div>

        <div className="z-10 flex flex-col items-center select-none">
          <span className="text-3xl animate-spin text-cyan-400" style={{ animationDuration: '10s' }}>❄️</span>
          <span className="text-[8px] font-extrabold font-display uppercase tracking-widest text-cyan-500/80 dark:text-cyan-400 mt-1">Freezing Winter Rhythms</span>
        </div>
      </div>
    );
  }

  return null;
}

export default function ManagerDashboard({ user, onLogout, onPortalSwitch }) {
  const [managerTab, setManagerTab] = useState('dashboard'); // dashboard, roster, time, swaps, leave, docs, staff, reports, payroll, settings

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [managerViewMode, setManagerViewMode] = useState('desktop'); // desktop, mobile

  useEffect(() => {
    setShowMobileSidebar(false);
  }, [managerTab]);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [activeMobileDate, setActiveMobileDate] = useState(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return todayStr;
  });
  const [weekOffset, setWeekOffset] = useState(0);
  const [shifts, setShifts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  
  // Custom Store Settings & Dynamic states
  const [budgetTarget, setBudgetTarget] = useState(4500);
  const [penaltySat, setPenaltySat] = useState(1.25);
  const [penaltySun, setPenaltySun] = useState(1.50);
  const [penaltyPH, setPenaltyPH] = useState(2.25);
  const [autoBreakThreshold, setAutoBreakThreshold] = useState(5.0);
  const [compactMode, setCompactMode] = useState(false);
  const [marketKillSwitch, setMarketKillSwitch] = useState(false);
  const [mobileClockInAllowed, setMobileClockInAllowed] = useState(true);
  const [kioskBreaksAllowed, setKioskBreaksAllowed] = useState(true);

  // Innovation 1: Weather & Sales states
  const [weatherMock, setWeatherMock] = useState('Rainy'); // Sunny, Rainy, Heatwave, Cold
  const [estimatedDailySales, setEstimatedDailySales] = useState({
    0: 4200, // Mon
    1: 3900, // Tue
    2: 4100, // Wed
    3: 4500, // Thu
    4: 5500, // Fri
    5: 6000, // Sat
    6: 5200  // Sun
  });
  const [manualSalesForecast, setManualSalesForecast] = useState(33400);

  // Innovation 3: Fatigue & Sentiment states
  const [selectedFatigueEmp, setSelectedFatigueEmp] = useState(null);

  // Innovation 4: Compliance Incident DVR states
  const [selectedIncidentDay, setSelectedIncidentDay] = useState(0); // 0 (Mon) to 6 (Sun)
  const [complianceOverrides, setComplianceOverrides] = useState({}); // shiftId -> override reason text

  // Innovation 5: Smart-Walk Handover states
  const [handovers, setHandovers] = useState([]);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState(null);

  // Core Dialog/Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showManualClockModal, setShowManualClockModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayEmployee, setBirthdayEmployee] = useState(null);
  
  // Expanded employee timesheet cards
  const [expandedEmps, setExpandedEmps] = useState({});
  // Timesheet editor states
  const [showEditTimesheetModal, setShowEditTimesheetModal] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState(null);
  const [editingTimesheetDate, setEditingTimesheetDate] = useState('');
  const [editingTimesheetIn, setEditingTimesheetIn] = useState('');
  const [editingTimesheetOut, setEditingTimesheetOut] = useState('');

  // Printable Audit PDF Modal states
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAuditDoc, setSelectedAuditDoc] = useState(null);

  // Manual Add/Edit Employee Modals states
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    full_name: '',
    email: '',
    phone: '',
    dob: '',
    type: 'casual',
    hourly_rate: 29.23,
    contracted_hours: 15,
    color: '#4F46E5',
    payroll_id: ''
  });
  const [editingEmployee, setEditingEmployee] = useState(null);

  
  // Form States
  const [newShift, setNewShift] = useState({ user_id: 'open', start_time: '09:00', end_time: '17:00', shift_date: '' });
  const [editingShift, setEditingShift] = useState(null);
  const [manualClockUser, setManualClockUser] = useState('');
  const [manualClockDate, setManualClockDate] = useState('');
  const [manualClockIn, setManualClockIn] = useState('09:00');
  const [manualClockOut, setManualClockOut] = useState('17:00');
  const [csvText, setCsvText] = useState('');

  // Compliance policy documents states
  const [documents, setDocuments] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [newDoc, setNewDoc] = useState({ title: '', content: '', is_mandatory: true });
  const [editingDoc, setEditingDoc] = useState(null);
  const [showEditDocModal, setShowEditDocModal] = useState(false);
  
  // Task Management States
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskShiftId, setTaskShiftId] = useState('');
  const [taskAssignType, setTaskAssignType] = useState('person'); // person, shift

  // Unified Task Center Template States
  const [taskTab, setTaskTab] = useState('dispatch'); // 'dispatch', 'opening', 'closing'
  const [openingTemplates, setOpeningTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem('tabkey_opening_templates');
      return saved ? JSON.parse(saved) : [
        "Perform opening system health checks 💻",
        "Prepare client welcome desks and showcase materials 📋",
        "Verify registers have correct opening cash floats 🪙"
      ];
    } catch (e) {
      return [
        "Perform opening system health checks 💻",
        "Prepare client welcome desks and showcase materials 📋",
        "Verify registers have correct opening cash floats 🪙"
      ];
    }
  });
  const [closingTemplates, setClosingTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem('tabkey_closing_templates');
      return saved ? JSON.parse(saved) : [
        "Ensure all commercial ovens and appliances are powered down 🔌",
        "Lock key till cash in store safe & arm alarm system 🔒",
        "Complete daily stock count and secure premises 🚪"
      ];
    } catch (e) {
      return [
        "Ensure all commercial ovens and appliances are powered down 🔌",
        "Lock key till cash in store safe & arm alarm system 🔒",
        "Complete daily stock count and secure premises 🚪"
      ];
    }
  });
  const [newTemplateItem, setNewTemplateItem] = useState('');
  
  // Announcement / Notice Feed States
  const [feed, setFeed] = useState([]);
  const [newFeedTitle, setNewFeedTitle] = useState('');
  const [newFeedContent, setNewFeedContent] = useState('');

  useEffect(() => {
    localStorage.setItem('tabkey_opening_templates', JSON.stringify(openingTemplates));
  }, [openingTemplates]);

  useEffect(() => {
    localStorage.setItem('tabkey_closing_templates', JSON.stringify(closingTemplates));
  }, [closingTemplates]);
  
  // Presentation switch overlays
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [targetPortal, setTargetPortal] = useState('');

  // Email Drawer previews
  const [showEmailDrawer, setShowEmailDrawer] = useState(false);
  const [activeEmailTemplate, setActiveEmailTemplate] = useState('welcome'); // welcome, roster, swap, birthday
  const [emailPreviewEmployee, setEmailPreviewEmployee] = useState(null);
  const [publicHolidays, setPublicHolidays] = useState([]);

  const weekDates = getWeekDates(weekOffset);
  const parseLocalDate = (dateStr) => {
    const [y, m, da] = dateStr.split('-');
    return new Date(y, m - 1, da);
  };
  
  const d1 = parseLocalDate(weekDates[0]);
  const d2 = parseLocalDate(weekDates[6]);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const weekDisplay = `${d1.getDate()} ${monthNames[d1.getMonth()]} - ${d2.getDate()} ${monthNames[d2.getMonth()]}`;

  const getEmployeeWeekHours = (empId) => {
    const emp = profiles.find(p => p.id === empId);
    if (!emp) return 0;
    const empShifts = weekShifts.filter(s => s.user_id === empId);
    let sched = 0;
    empShifts.forEach(s => {
      sched += calculateShiftMetrics(s, weekShifts, true, emp).paidDuration;
    });
    return sched;
  };

  const toggleEmpExpand = (empId) => {
    setExpandedEmps(prev => ({
      ...prev,
      [empId]: !prev[empId]
    }));
  };


  useEffect(() => {
    fetchData();
  }, [weekOffset]);

  const fetchData = async () => {
    try {
      const { data: shiftData, error: shiftErr } = await supabase.from('shifts').select('*');
      if (shiftErr) console.error("Error fetching shifts:", shiftErr);
      setShifts(shiftData || []);
    } catch (err) {
      console.error("Shifts fetch caught exception:", err);
    }
    
    try {
      const { data: profileData, error: profErr } = await supabase.from('profiles').select('*');
      if (profErr) console.error("Error fetching profiles:", profErr);
      setProfiles(profileData || []);
    } catch (err) {
      console.error("Profiles fetch caught exception:", err);
    }

    try {
      const { data: leaveData, error: leaveErr } = await supabase.from('leave_requests').select('*');
      if (leaveErr) console.error("Error fetching leave requests:", leaveErr);
      setLeaveRequests(leaveData || []);
    } catch (err) {
      console.error("Leave requests fetch caught exception:", err);
    }

    try {
      const { data: swapData, error: swapErr } = await supabase.from('swap_requests').select('*');
      if (swapErr) console.error("Error fetching swap requests:", swapErr);
      setSwapRequests(swapData || []);
    } catch (err) {
      console.error("Swap requests fetch caught exception:", err);
    }

    try {
      const { data: logsData, error: logsErr } = await supabase.from('time_logs').select('*');
      if (logsErr) console.error("Error fetching time logs:", logsErr);
      setTimeLogs(logsData || []);
    } catch (err) {
      console.error("Time logs fetch caught exception:", err);
    }

    try {
      const { data: docData, error: docsErr } = await supabase.from('documents').select('*');
      if (docsErr) console.error("Error fetching documents:", docsErr);
      setDocuments(docData || []);
    } catch (err) {
      console.error("Documents fetch caught exception:", err);
    }

    try {
      const { data: sigData, error: sigErr } = await supabase.from('document_signatures').select('*');
      if (sigErr) console.error("Error fetching signatures:", sigErr);
      setSignatures(sigData || []);
    } catch (err) {
      console.error("Signatures fetch caught exception:", err);
    }

    try {
      const { data: handoverData, error: handoverErr } = await supabase.from('store_handovers').select('*');
      if (handoverErr) console.error("Error fetching handovers:", handoverErr);
      setHandovers(handoverData || []);
    } catch (err) {
      console.error("Handovers fetch caught exception:", err);
    }

    try {
      const { data: settingsData, error: settingsErr } = await supabase.from('store_settings').select('*').single();
      if (settingsErr) console.error("Error fetching store settings:", settingsErr);
      if (settingsData) {
        setBudgetTarget(settingsData.labor_budget);
        setCompactMode(settingsData.compact_mode);
        setMarketKillSwitch(settingsData.market_kill_switch);
        setMobileClockInAllowed(settingsData.mobile_clock_in_allowed);
        setKioskBreaksAllowed(settingsData.kiosk_breaks_allowed);
        setPenaltySat(settingsData.penalty_sat);
        setPenaltySun(settingsData.penalty_sun);
        setPenaltyPH(settingsData.penalty_ph);
        setAutoBreakThreshold(settingsData.auto_break_threshold);
        setWeatherMock(settingsData.weather_mock);
      }
    } catch (err) {
      console.error("Store settings fetch caught exception:", err);
    }

    try {
      const { data: taskData, error: taskErr } = await supabase.from('tasks').select('*');
      if (taskErr) console.error("Error fetching tasks:", taskErr);
      setTasks(taskData || []);
    } catch (err) {
      console.error("Tasks fetch caught exception:", err);
    }

    try {
      const { data: feedData, error: feedErr } = await supabase.from('feed').select('*').order('created_at', { ascending: false });
      if (feedErr) console.error("Error fetching feed:", feedErr);
      setFeed(feedData || []);
    } catch (err) {
      console.error("Feed fetch caught exception:", err);
    }

    try {
      const { data: noticesData, error: noticesErr } = await supabase.from('notices').select('*');
      if (noticesErr) console.error("Error fetching notices:", noticesErr);
      if (noticesData) {
        const holidayRow = noticesData.find(row => row.message && row.message.startsWith('SETTING_HOLIDAYS_'));
        if (holidayRow) {
          try {
            const jsonPart = holidayRow.message.replace('SETTING_HOLIDAYS_', '');
            const parsedHolidays = JSON.parse(jsonPart);
            setPublicHolidays(parsedHolidays || []);
          } catch (e) {
            console.error("Error parsing public holidays from notices:", e);
          }
        }
      }
    } catch (err) {
      console.error("Notices fetch caught exception:", err);
    }
  };

  // Filter shifts and time logs for active week
  const weekShifts = shifts.filter(s => s && s.shift_date && weekDates.includes(s.shift_date));
  const weekLogs = timeLogs.filter(log => {
    if (!log || !log.clock_in) return false;
    const logDateStr = log.clock_in.split('T')[0];
    return weekDates.includes(logDateStr);
  });

  // Calculate dynamic weekly payroll costs and aggregates
  let totalScheduledHours = 0;
  let totalLaborSpend = 0;
  let warningCount = 0;
  let criticalCount = 0;
  let allocatedShiftsCount = 0;

  // Track compliance incidents list
  const activeIncidents = [];

  weekShifts.forEach(s => {
    if (s.user_id !== 'open') {
      allocatedShiftsCount++;
      const emp = profiles.find(p => p.id === s.user_id);
      const metrics = calculateShiftMetrics(s, weekShifts, true, emp);
      
      totalScheduledHours += metrics.paidDuration;
      
      // Aggregate compliance checks
      if (metrics.violations.length > 0) {
        warningCount += metrics.violations.filter(v => v.includes('⚠️')).length;
        criticalCount += metrics.violations.filter(v => v.includes('❌')).length;
        
        metrics.violations.forEach(v => {
          activeIncidents.push({
            shift: s,
            employee: emp,
            message: v,
            isCritical: v.includes('❌')
          });
        });
      }

      if (emp) {
        const d = parseLocalDate(s.shift_date);
        const dayOfWeek = d.getDay(); 
        
        let penaltyMult = 1;
        // Thursday holidayhighlighting
        const isHoliday = s.shift_date === weekDates[3]; 
        
        if (isHoliday) penaltyMult = penaltyPH;
        else if (dayOfWeek === 6) penaltyMult = penaltySat; // Saturday
        else if (dayOfWeek === 0) penaltyMult = penaltySun; // Sunday
        
        totalLaborSpend += (metrics.paidDuration * parseFloat(emp.hourly_rate || 29.23) * penaltyMult);
      }
    }
  });

  // Dynamic Sales Predictions based on weather toggle
  const getWeatherSalesMultiplier = () => {
    if (weatherMock === 'Sunny') return 1.15; // +15% cold drinks and crowds
    if (weatherMock === 'Rainy') return 1.25; // +25% baking warm rolls & hot coffee!
    if (weatherMock === 'Heatwave') return 0.80; // -20% hot baking drops, dry sweets
    if (weatherMock === 'Cold') return 1.10; // +10% standard winter sales
    return 1.0;
  };

  const salesMultiplier = getWeatherSalesMultiplier();
  const totalWeeklySalesForecast = manualSalesForecast * salesMultiplier;

  // Innovation 5: Labor Cost-to-Sales (LCTS) metric
  const currentLCTS = totalWeeklySalesForecast > 0 ? (totalLaborSpend / totalWeeklySalesForecast) * 100 : 0;

  // Live clock-ins
  const activeClockIns = timeLogs.filter(log => log.clock_in && !log.clock_out);

  // Late detection (60s simulation check)
  const lateStaffList = [];
  const nowTime = new Date();
  const currentTodayDateStr = nowTime.toISOString().split('T')[0];
  
  shifts.forEach(s => {
    if (s && s.user_id !== 'open' && s.shift_date === currentTodayDateStr) {
      const alreadyClocked = timeLogs.some(log => log && log.user_id === s.user_id && log.clock_in && log.clock_in.startsWith(currentTodayDateStr));
      if (!alreadyClocked && s.start_time) {
        const [sh, sm] = s.start_time.split(':').map(Number);
        const shiftStartToday = new Date();
        shiftStartToday.setHours(sh, sm, 0, 0);
        
        // If current time is 5+ minutes past shift start
        const timeDiffMins = (nowTime - shiftStartToday) / (1000 * 60);
        if (timeDiffMins >= 5) {
          const emp = profiles.find(p => p.id === s.user_id);
          lateStaffList.push({
            shift: s,
            employee: emp,
            minsLate: Math.floor(timeDiffMins)
          });
        }
      }
    }
  });

  // Birthdays in upcoming 7 days
  const upcomingBirthdays = [];
  profiles.forEach(p => {
    if (p.role !== 'manager' && p.dob) {
      const [by, bm, bd] = p.dob.split('-').map(Number);
      const bdayThisYear = new Date(nowTime.getFullYear(), bm - 1, bd);
      
      const diffTime = bdayThisYear - nowTime;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays <= 7) {
        upcomingBirthdays.push({ employee: p, daysRemaining: diffDays });
      }
    }
  });

  // Recent Activity Logs (last 6 clocks/approvals)
  const recentActivities = [
    { type: 'clock_in', text: 'Alex Mercer clocked in at 06:58 AM', time: 'Today', icon: 'Clock', color: 'text-indigo-600 bg-indigo-50' },
    { type: 'approval', text: 'TabKey Manager approved Alex\'s Sick Leave', time: 'Yesterday', icon: 'UserCheck', color: 'text-emerald-600 bg-emerald-50' },
    { type: 'clock_out', text: 'Charlie Puth clocked out at 10:04 PM', time: 'Yesterday', icon: 'Clock', color: 'text-rose-600 bg-rose-50' },
    { type: 'swap', text: 'Shift swap requested by Charlie Puth', time: '2 days ago', icon: 'Repeat', color: 'text-amber-600 bg-amber-50' },
    { type: 'doc', text: 'Mandatory Policy "Fast Food Award" published', time: '3 days ago', icon: 'FileText', color: 'text-purple-600 bg-purple-50' },
    { type: 'kiosk', text: 'Bella Thorne clocked in via Store iPad Kiosk', time: '4 days ago', icon: 'Tablet', color: 'text-blue-600 bg-blue-50' }
  ];

  // Core Actions
  const handleResetDemo = () => {
    if (window.confirm("Reset entire system back to clean seed data? This includes all handovers, compliance signatures, settings and clock logs.")) {
      resetDemoData();
      fetchData();
      alert("System database has been completely re-seeded successfully!");
    }
  };

  const triggerPortalSwitch = (portal) => {
    setTargetPortal(portal);
    setLoadingOverlay(true);
    setTimeout(() => {
      setLoadingOverlay(false);
      onPortalSwitch(portal);
    }, 1200);
  };

  // Magic Blanks: Smart cost-optimized auto-filler (Generates 28 unallocated shifts: 4 per day)
  const triggerMagicBlanks = async () => {
    setLoadingOverlay(true);
    setTimeout(async () => {
      const startTimes = ["07:00", "09:00", "11:00", "15:00"];
      const endTimes = ["15:00", "17:00", "19:00", "22:00"];
      
      const newShiftsList = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dateStr = weekDates[dayIndex];
        
        for (let shiftIndex = 0; shiftIndex < 4; shiftIndex++) {
          newShiftsList.push({
            id: `magic-s-${dayIndex}-${shiftIndex}-${Math.random().toString(36).substr(2, 5)}`,
            user_id: 'open',
            shift_date: dateStr,
            start_time: startTimes[shiftIndex],
            end_time: endTimes[shiftIndex],
            status: 'draft',
            created_at: new Date().toISOString()
          });
        }
      }

      // Polymorphic DB insert
      await supabase.from('shifts').insert(newShiftsList);
      
      fetchData();
      setLoadingOverlay(false);
      alert("TabKey AI Co-Pilot filled 28 unassigned award-compliant drafts! Click 'Publish Roster' to launch.");
    }, 1000);
  };

  const triggerCopyWeek = async () => {
    const { value: selectedDate } = await Swal.fire({
      title: 'Copy Shifts From Another Week',
      text: 'Select the Monday date of the week you wish to copy FROM. All shifts from that week will be cloned into the current week view.',
      input: 'date',
      inputLabel: 'Source Monday Date',
      inputValue: new Date().toISOString().split('T')[0],
      showCancelButton: true,
      confirmButtonText: 'Next',
      confirmButtonColor: '#4F46E5',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to select a date!';
        }
        const d = new Date(value);
        const day = d.getDay(); // 0 is Sunday, 1 is Monday...
        if (day !== 1) {
          return 'Please select a Monday! (Roster periods run Mon - Sun)';
        }
      }
    });

    if (selectedDate) {
      const sourceWeekDates = getDatesForMonday(selectedDate);
      
      setLoadingOverlay(true);
      try {
        const { data: sourceShifts, error } = await supabase
          .from('shifts')
          .select('*')
          .in('shift_date', sourceWeekDates);

        if (error) throw error;

        if (!sourceShifts || sourceShifts.length === 0) {
          setLoadingOverlay(false);
          Swal.fire({
            icon: 'info',
            title: 'No Shifts Found',
            text: 'There are no shifts scheduled in the selected source week roster.',
            confirmButtonColor: '#4F46E5'
          });
          return;
        }

        const result = await Swal.fire({
          title: 'Confirm Roster Copy',
          text: `Found ${sourceShifts.length} shifts to copy. Any existing draft shifts in your current active week will remain. Do you want to proceed?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes, Copy Them!',
          confirmButtonColor: '#4F46E5'
        });

        if (result.isConfirmed) {
          const clonedShifts = sourceShifts.map(s => {
            const sourceDayIndex = sourceWeekDates.indexOf(s.shift_date);
            return {
              id: "s-man-" + Math.random().toString(36).substr(2, 9),
              user_id: s.user_id,
              shift_date: weekDates[sourceDayIndex],
              start_time: s.start_time,
              end_time: s.end_time,
              status: 'draft',
              created_at: new Date().toISOString()
            };
          });

          await supabase.from('shifts').insert(clonedShifts);
          fetchData();
          setLoadingOverlay(false);
          
          Swal.fire({
            icon: 'success',
            title: 'Roster Cloned!',
            text: `Successfully copied ${clonedShifts.length} shifts into the active week.`,
            confirmButtonColor: '#4F46E5'
          });
        } else {
          setLoadingOverlay(false);
        }
      } catch (err) {
        setLoadingOverlay(false);
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Error Copying Roster',
          text: 'Something went wrong when copying shifts from the selected week.',
          confirmButtonColor: '#ea580c'
        });
      }
    }
  };


  const triggerClearWeek = async () => {
    if (window.confirm("Clear all scheduled shifts for the active week view?")) {
      for (let dateStr of weekDates) {
        await supabase.from('shifts').delete().eq('shift_date', dateStr);
      }
      fetchData();
      alert("Current week shifts completely cleared.");
    }
  };

  const triggerPublish = async () => {
    for (let dateStr of weekDates) {
      await supabase.from('shifts').update({ status: 'published' }).eq('shift_date', dateStr);
    }
    fetchData();
    alert("Weekly Roster published! Sent push notifications and roster emails to all scheduled staff.");
  };

  // Add/Edit Shift Database operations
  const handleAddShift = async (e) => {
    e.preventDefault();
    if (checkShiftOverlap(newShift.user_id, newShift.shift_date, newShift.start_time, newShift.end_time, shifts)) {
      alert("❌ OVERLAP DETECTED: This employee is already scheduled for another shift on this day/time!");
      return;
    }
    
    if (checkLeaveConflict(newShift.user_id, newShift.shift_date, leaveRequests)) {
      alert("⚠️ LEAVE CONFLICT: Employee has an approved leave request on this date!");
    }

    const shiftToInsert = {
      id: "s-man-" + Math.random().toString(36).substr(2, 9),
      ...newShift,
      status: 'draft',
      created_at: new Date().toISOString()
    };

    await supabase.from('shifts').insert(shiftToInsert);
    setShowAddModal(false);
    fetchData();
  };

  const handleEditShift = async (e) => {
    e.preventDefault();
    await supabase.from('shifts').update(editingShift).eq('id', editingShift.id);
    setShowEditModal(false);
    fetchData();
  };

  const handleDeleteShift = async (id) => {
    if (window.confirm("Delete this shift?")) {
      await supabase.from('shifts').delete().eq('id', id);
      setShowEditModal(false);
      fetchData();
    }
  };

  // Compliance Doc Management
  const handleCreateDoc = async (e) => {
    e.preventDefault();
    if (!newDoc.title || !newDoc.content) return;
    const docToInsert = {
      id: "d-" + Math.random().toString(36).substr(2, 9),
      ...newDoc,
      created_at: new Date().toISOString()
    };
    await supabase.from('documents').insert(docToInsert);
    setNewDoc({ title: '', content: '', is_mandatory: true });
    fetchData();
    alert("Mandatory Compliance Document broadcasted to all staff portals!");
  };

  const handleSaveDoc = async (e) => {
    e.preventDefault();
    if (!editingDoc || !editingDoc.title || !editingDoc.content) return;
    await supabase.from('documents').update({
      title: editingDoc.title,
      content: editingDoc.content,
      is_mandatory: editingDoc.is_mandatory
    }).eq('id', editingDoc.id);
    setShowEditDocModal(false);
    setEditingDoc(null);
    fetchData();
    alert("Compliance Document updated successfully!");
  };

  const handleDeleteDoc = async (id) => {
    if (window.confirm("Are you sure you want to remove this compliance policy document?")) {
      await supabase.from('documents').delete().eq('id', id);
      fetchData();
    }
  };

  const handleDispatchQuickTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    let targetEmpId = "";

    if (taskAssignType === 'person') {
      if (!taskAssignee) {
        alert("Please select an employee to assign this task to.");
        return;
      }
      targetEmpId = taskAssignee;
    } else if (taskAssignType === 'shift') {
      if (!taskShiftId) {
        alert("Please select a scheduled shift.");
        return;
      }
      const matchShift = shifts.find(s => s.id === taskShiftId);
      if (matchShift) {
        if (matchShift.user_id === 'open') {
          alert("This shift is currently open. Please assign it to an employee first or choose a specific person.");
          return;
        }
        targetEmpId = matchShift.user_id;
      }
    }

    if (!targetEmpId) return;

    const newTask = {
      id: "t-" + Math.random().toString(36).substr(2, 9),
      title: newTaskTitle,
      is_completed: false,
      assigned_to: targetEmpId,
      created_at: new Date().toISOString()
    };

    await supabase.from('tasks').insert(newTask);
    
    setNewTaskTitle('');
    setTaskAssignee('');
    setTaskShiftId('');
    fetchData();

    Swal.fire({
      icon: 'success',
      title: 'Task Dispatched! ⚡',
      text: `Task successfully assigned to ${profiles.find(p => p.id === targetEmpId)?.full_name}.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleDispatchTimePreset = async (presetType) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayShifts = shifts.filter(s => s.shift_date === todayStr && s.user_id !== 'open');
    
    let targets = [];
    let taskTitles = [];
    let presetName = "";

    if (presetType === 'morning') {
      presetName = "Morning Opening Bake";
      targets = todayShifts.filter(s => {
        const hr = parseInt(s.start_time.split(':')[0]);
        return hr < 10;
      });
      taskTitles = [
        "Perform opening system health checks 💻",
        "Prepare client welcome desks and showcase materials 📋"
      ];
    } else if (presetType === 'midday') {
      presetName = "Mid-day Coffee & Counter Clean";
      targets = todayShifts.filter(s => {
        const hr = parseInt(s.start_time.split(':')[0]);
        return hr >= 10 && hr < 15;
      });
      taskTitles = [
        "Deep-clean espresso machine group heads ☕",
        "Wipe down counters & sanitize registers 🧼"
      ];
    } else if (presetType === 'evening') {
      presetName = "Evening Closeout Security";
      targets = todayShifts.filter(s => {
        const hr = parseInt(s.start_time.split(':')[0]);
        return hr >= 15;
      });
      taskTitles = [
        "Ensure all 3 commercial ovens are powered down 🔐",
        "Lock key till cash in store safe & arm alarm 🔐"
      ];
    }

    if (targets.length === 0) {
      const weekStaffShifts = weekShifts.filter(s => s.user_id !== 'open');
      if (weekStaffShifts.length > 0) {
        targets = [weekStaffShifts[0]];
      } else {
        targets = [{ user_id: 'p-alex' }];
      }
    }

    for (let target of targets) {
      for (let title of taskTitles) {
        const newTask = {
          id: "t-" + Math.random().toString(36).substr(2, 9),
          title: title,
          is_completed: false,
          assigned_to: target.user_id,
          created_at: new Date().toISOString()
        };
        await supabase.from('tasks').insert(newTask);
      }
    }

    fetchData();
    Swal.fire({
      icon: 'success',
      title: `${presetName} Presets Dispatched!`,
      text: `Successfully created and synchronized ${taskTitles.length} tasks for scheduled staff. 🌀⚡`,
      confirmButtonColor: '#4F46E5',
      timer: 3000
    });
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newFeedTitle.trim() || !newFeedContent.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Info',
        text: 'Please write both a title and content for your announcement!',
        confirmButtonColor: '#4F46E5'
      });
      return;
    }

    const announcement = {
      id: "f-" + Math.random().toString(36).substr(2, 9),
      author_id: "p-manager",
      title: newFeedTitle,
      content: newFeedContent,
      likes: 0,
      comments: [],
      created_at: new Date().toISOString()
    };

    await supabase.from('feed').insert(announcement);
    setNewFeedTitle('');
    setNewFeedContent('');
    fetchData();

    Swal.fire({
      icon: 'success',
      title: 'Announcement Broadcasted! 📢',
      text: 'Your notification is now live on everyone\'s mobile homepage.',
      confirmButtonColor: '#4F46E5'
    });
  };

  const handleAddTemplateItem = (type) => {
    if (!newTemplateItem.trim()) return;
    if (type === 'opening') {
      setOpeningTemplates(prev => {
        const next = [...prev, newTemplateItem.trim()];
        localStorage.setItem('tabkey_opening_templates', JSON.stringify(next));
        return next;
      });
    } else {
      setClosingTemplates(prev => {
        const next = [...prev, newTemplateItem.trim()];
        localStorage.setItem('tabkey_closing_templates', JSON.stringify(next));
        return next;
      });
    }
    setNewTemplateItem('');
    Swal.fire({
      icon: 'success',
      title: 'Template Updated! ⚡',
      text: 'New automated shift template task added successfully.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleRemoveTemplateItem = (type, index) => {
    if (type === 'opening') {
      setOpeningTemplates(prev => {
        const next = prev.filter((_, idx) => idx !== index);
        localStorage.setItem('tabkey_opening_templates', JSON.stringify(next));
        return next;
      });
    } else {
      setClosingTemplates(prev => {
        const next = prev.filter((_, idx) => idx !== index);
        localStorage.setItem('tabkey_closing_templates', JSON.stringify(next));
        return next;
      });
    }
    Swal.fire({
      icon: 'success',
      title: 'Item Removed',
      text: 'Shift template task deleted.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const triggerDownloadCsvReport = () => {
    const rows = [
      ["Document Title", "Employee Name", "Role Type", "Signature Status", "Date Signed"],
      ...documents.flatMap(doc => 
        profiles.filter(p => p.role !== 'manager').map(p => {
          const sig = signatures.find(s => s.document_id === doc.id && s.user_id === p.id);
          return [
            doc.title,
            p.full_name,
            p.type,
            sig ? "SIGNED" : "PENDING",
            sig ? new Date(sig.signed_at).toLocaleString() : "N/A"
          ];
        })
      )
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tabkey_compliance_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPayrollCSV = async () => {
    const startEl = document.getElementById('payroll-start');
    const endEl = document.getElementById('payroll-end');
    const startDateStr = startEl ? startEl.value : weekDates[0];
    const endDateStr = endEl ? endEl.value : weekDates[6];

    if (!startDateStr || !endDateStr) {
      Swal.fire({
        icon: 'warning',
        title: 'Dates Required',
        text: 'Please select both start and end dates.',
        confirmButtonColor: '#4F46E5'
      });
      return;
    }

    setLoadingOverlay(true);
    try {
      const { data, error } = await supabase.functions.invoke('xero-sync', {
        body: {
          action: 'sync_timesheets',
          startDate: startDateStr,
          endDate: endDateStr,
          publicHolidays: publicHolidays || []
        }
      });
      setLoadingOverlay(false);
      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
        return;
      }
      Swal.fire({
        icon: 'success',
        title: 'Xero Sync Complete',
        text: data?.message || 'Sync completed successfully!',
        confirmButtonColor: '#4F46E5'
      });
    } catch (e) {
      setLoadingOverlay(false);
      Swal.fire({
        icon: 'error',
        title: 'Sync Error',
        text: e.message || 'Something went wrong when connecting to Xero.',
        confirmButtonColor: '#ea580c'
      });
    }
  };

  const handleSyncXero = async () => {
    const weekLogs = timeLogs.filter(log => {
      if (!log || !log.clock_in) return false;
      const logDateStr = log.clock_in.split('T')[0];
      return weekDates.includes(logDateStr);
    });
    const pendingLogs = weekLogs.filter(l => !l.is_approved);

    if (pendingLogs.length > 0) {
      const result = await Swal.fire({
        title: '⚠️ Pending Timesheets Exist',
        text: `You have ${pendingLogs.length} unapproved timesheet entries this week. Only fully approved timesheet hours will be sent to Xero Payroll. Unapproved entries will be skipped.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Override & Sync Approved Only',
        cancelButtonText: 'Check Timesheets Again',
        confirmButtonColor: '#4F46E5',
        cancelButtonColor: '#64748b'
      });
      
      if (!result.isConfirmed) {
        setManagerTab('time'); // switch back to timesheets tab!
        return;
      }
    }
    
    await exportPayrollCSV();
  };

  const testXeroConnection = async () => {
    setLoadingOverlay(true);
    try {
      const { data, error } = await supabase.functions.invoke('xero-sync', {
        body: { action: 'test' }
      });
      setLoadingOverlay(false);
      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
        return;
      }
      Swal.fire({
        icon: 'success',
        title: 'Connection Successful',
        text: data?.message || 'Xero Connection is active and healthy!',
        confirmButtonColor: '#4F46E5'
      });
    } catch (e) {
      setLoadingOverlay(false);
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: e.message || 'Connection test failed.',
        confirmButtonColor: '#ea580c'
      });
    }
  };

  // Staff CSV Bulk Importer
  const handleCsvImport = async () => {
    try {
      const lines = csvText.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) {
        alert("Please paste valid CSV content (with headers)!");
        return;
      }
      
      const newProfiles = [];
      // Expecting: Name,Email,Phone,DOB,Type,HourlyRate,ContractedHours
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        if (cols.length < 5) continue;
        
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        const colors = ["#4F46E5", "#10b981", "#ea580c", "#e11d48", "#7c3aed", "#d97706"];
        
        newProfiles.push({
          id: `p-csv-${Math.random().toString(36).substr(2, 5)}`,
          full_name: cols[0],
          email: cols[1],
          phone: cols[2],
          dob: cols[3] || '2001-01-01',
          type: cols[4] || 'Casual',
          hourly_rate: parseFloat(cols[5] || '29.23'),
          contracted_hours: parseInt(cols[6] || '0'),
          kiosk_pin: randomPin,
          temp_password: `pass${randomPin}`,
          color: colors[i % colors.length],
          role: 'employee',
          level: 1,
          points: 0,
          streak: 0,
          created_at: new Date().toISOString()
        });
      }

      await supabase.from('profiles').insert(newProfiles);
      
      fetchData();
      setShowCsvModal(false);
      setCsvText('');
      alert(`Bulk CSV Import complete! Added ${newProfiles.length} new employees with auto-generated Kiosk PINs.`);
    } catch (e) {
      alert("Error parsing CSV. Ensure correct comma-separated formatting!");
    }
  };

  // Timesheet approval operations
  const handleApproveLog = async (logId, approve = true) => {
    await supabase.from('time_logs').update({ is_approved: approve }).eq('id', logId);
    fetchData();
  };

  const handleApproveAllUserLogs = async (userId) => {
    const userLogs = timeLogs.filter(log => log.user_id === userId && !log.is_approved);
    for (let log of userLogs) {
      await supabase.from('time_logs').update({ is_approved: true }).eq('id', log.id);
    }
    fetchData();
    alert("Approved all pending timesheet records for this employee!");
  };

  const handleAddManualClock = async (e) => {
    e.preventDefault();
    if (!manualClockUser) return;
    
    const newLog = {
      id: "tl-" + Math.random().toString(36).substr(2, 9),
      user_id: manualClockUser,
      clock_in: `${manualClockDate}T${manualClockIn}:00.000Z`,
      clock_out: `${manualClockDate}T${manualClockOut}:00.000Z`,
      break_start: null,
      break_end: null,
      notes: "Manually entered by manager",
      is_approved: true,
      created_at: new Date().toISOString()
    };
    
    await supabase.from('time_logs').insert(newLog);
    setShowManualClockModal(false);
    fetchData();
    alert("Manual clock timesheet logged successfully.");
  };

  const triggerForceClockOut = async (logId) => {
    const timeStr = new Date().toISOString();
    await supabase.from('time_logs').update({ clock_out: timeStr, notes: "Forced clock out by manager" }).eq('id', logId);
    fetchData();
    alert("Forced employee clock out.");
  };

  const handleDeleteTimesheet = async (logId) => {
    if (window.confirm("Delete this timesheet log permanently?")) {
      await supabase.from('time_logs').delete().eq('id', logId);
      fetchData();
    }
  };

  const handleSaveEditTimesheet = async (e) => {
    e.preventDefault();
    if (!editingTimesheet) return;

    // Build ISO dates correctly from local states
    const inIso = `${editingTimesheetDate}T${editingTimesheetIn}:00.000Z`;
    const outIso = editingTimesheetOut ? `${editingTimesheetDate}T${editingTimesheetOut}:00.000Z` : null;

    const updatedLog = {
      clock_in: inIso,
      clock_out: outIso,
      notes: editingTimesheet.notes || "Manually adjusted by manager"
    };

    await supabase.from('time_logs').update(updatedLog).eq('id', editingTimesheet.id);
    setShowEditTimesheetModal(false);
    fetchData();
    Swal.fire({
      icon: 'success',
      title: 'Timesheet Entry Updated!',
      text: 'The clock entry has been adjusted successfully in the database.',
      confirmButtonColor: '#4F46E5'
    });
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.full_name || !newEmployee.email) {
      Swal.fire({ icon: 'error', title: 'Missing Info', text: 'Please provide employee name and email!', confirmButtonColor: '#ea580c' });
      return;
    }

    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#3B82F6', '#14B8A6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const employeeToInsert = {
      id: "p-man-" + Math.random().toString(36).substr(2, 9),
      full_name: newEmployee.full_name,
      email: newEmployee.email,
      phone: newEmployee.phone || '',
      dob: newEmployee.dob || '',
      type: newEmployee.type,
      hourly_rate: parseFloat(newEmployee.hourly_rate || 29.23),
      contracted_hours: parseFloat(newEmployee.contracted_hours || 0),
      kiosk_pin: randomPin,
      temp_password: `pass${randomPin}`,
      color: randomColor,
      role: 'employee',
      level: 1,
      points: 0,
      streak: 0,
      payroll_id: newEmployee.payroll_id || `XERO-${randomPin}`,
      created_at: new Date().toISOString()
    };

    await supabase.from('profiles').insert(employeeToInsert);
    setShowAddEmployeeModal(false);
    fetchData();
    Swal.fire({
      icon: 'success',
      title: 'Employee Added!',
      html: `Profile for <strong>${newEmployee.full_name}</strong> created successfully.<br/>iPad Kiosk PIN code: <strong className="text-indigo-600 font-mono text-lg">${randomPin}</strong>`,
      confirmButtonColor: '#4F46E5'
    });
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;

    await supabase.from('profiles').update({
      full_name: editingEmployee.full_name,
      email: editingEmployee.email,
      phone: editingEmployee.phone || '',
      dob: editingEmployee.dob || '',
      type: editingEmployee.type,
      hourly_rate: parseFloat(editingEmployee.hourly_rate || 29.23),
      contracted_hours: parseFloat(editingEmployee.contracted_hours || 0),
      kiosk_pin: editingEmployee.kiosk_pin || '',
      temp_password: editingEmployee.temp_password || '',
      payroll_id: editingEmployee.payroll_id || ''
    }).eq('id', editingEmployee.id);

    setShowEditEmployeeModal(false);
    fetchData();
    Swal.fire({
      icon: 'success',
      title: 'Employee Updated!',
      text: 'Profile details saved successfully in the database.',
      confirmButtonColor: '#4F46E5'
    });
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    const result = await Swal.fire({
      title: 'Delete Profile?',
      text: `Are you sure you want to completely remove ${employeeName || 'this employee'}? This will permanently delete their profile, scheduled shifts, swap requests, timesheets, and task lists. This action is irreversible!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Yes, delete completely',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: 'Deleting Employee Profile...',
          html: 'Safely purging associated shift logs, rosters, and credentials...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // 1. Delete linked swap requests (where employee is requester or target claimant)
        await supabase.from('swap_requests').delete().eq('requester_id', employeeId);
        await supabase.from('swap_requests').delete().eq('target_user_id', employeeId);

        // 2. Delete shifts
        await supabase.from('shifts').delete().eq('user_id', employeeId);

        // 3. Delete time logs
        await supabase.from('time_logs').delete().eq('user_id', employeeId);

        // 4. Delete leave requests
        await supabase.from('leave_requests').delete().eq('user_id', employeeId);

        // 5. Delete tasks
        await supabase.from('tasks').delete().eq('assigned_to', employeeId);

        // 6. Delete document signatures
        await supabase.from('document_signatures').delete().eq('user_id', employeeId);

        // 7. Delete reward claims
        await supabase.from('reward_claims').delete().eq('user_id', employeeId);

        // 8. Finally, delete profile
        await supabase.from('profiles').delete().eq('id', employeeId);

        await fetchData();

        Swal.fire({
          icon: 'success',
          title: 'Employee Deleted!',
          text: `Profile for ${employeeName} has been completely removed.`,
          confirmButtonColor: '#4F46E5'
        });
      } catch (err) {
        console.error("Error deleting employee:", err);
        Swal.fire({
          icon: 'error',
          title: 'Deletion Failed',
          text: 'An unexpected database error occurred during profile scrubbing.',
          confirmButtonColor: '#4F46E5'
        });
      }
    }
  };


  // Swap Requests handling
  const handleSwapApproval = async (swapId, approve = true) => {
    const swap = swapRequests.find(s => s.id === swapId);
    if (!swap) return;
    
    if (approve) {
      if (swap.target_user_id === 'open') {
        // Approve dropping the shift: make it an open shift
        await supabase.from('shifts').update({ user_id: 'open' }).eq('id', swap.shift_id);
        await supabase.from('swap_requests').update({ status: 'approved' }).eq('id', swapId);
        alert("Drop approved! Shift is now open for anyone to claim.");
      } else {
        // Approve swap trade: reassign to claimant
        const claimUser = profiles.find(p => p.id === swap.target_user_id);
        if (claimUser) {
          await supabase.from('shifts').update({ user_id: claimUser.id }).eq('id', swap.shift_id);
          await supabase.from('swap_requests').update({ status: 'approved' }).eq('id', swapId);
          alert(`Swap approved! Shift reassigned to ${claimUser.full_name}.`);
        }
      }
    } else {
      await supabase.from('swap_requests').update({ status: 'declined' }).eq('id', swapId);
      alert("Swap trade declined.");
    }
    fetchData();
  };

  // Leave Requests handling
  const handleLeaveApproval = async (leaveId, approve = true) => {
    const leave = leaveRequests.find(l => l.id === leaveId);
    if (!leave) return;

    if (approve) {
      await supabase.from('leave_requests').update({ status: 'approved' }).eq('id', leaveId);
      // Automatically clear scheduled shifts on leave dates
      const { data: allShifts } = await supabase.from('shifts');
      const shiftsToClear = (allShifts || []).filter(s => s.user_id === leave.user_id && s.shift_date >= leave.start_date && s.shift_date <= leave.end_date);
      for (let s of shiftsToClear) {
        await supabase.from('shifts').delete().eq('id', s.id);
      }
    } else {
      await supabase.from('leave_requests').update({ status: 'declined' }).eq('id', leaveId);
    }
    fetchData();
    alert(approve ? "Approved! Overlapping shifts cleared automatically." : "Leave request declined.");
  };

  // Email template triggers
  const triggerEmailPreview = (template, emp = null) => {
    setActiveEmailTemplate(template);
    setEmailPreviewEmployee(emp || profiles[1]); // default to Alex
    setShowEmailDrawer(true);
  };

  // Counts
  const pendingTimesheetsCount = timeLogs.filter(log => !log.is_approved).length;
  const pendingSwapsCount = swapRequests.filter(s => s.status === 'pending').length;
  const pendingLeavesCount = leaveRequests.filter(l => l.status === 'pending').length;

  // Mobile Dashboard Home Viewport
  const renderMobileDashboardHome = () => {
    return (
      <div className="space-y-4 font-sans select-none">
        {/* Weather Forecaster Card */}
        <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] p-4 rounded-xl shadow-sm text-left">
          <div className="flex justify-between items-center mb-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest leading-none">
                {new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 select-none">
                <WeatherMiniIcon weather={weatherMock} />
                <h4 className="font-bold font-display text-xs text-slate-805 dark:text-slate-200 mt-0.5 leading-none">
                  Simulated: <strong className="text-indigo-600 dark:text-indigo-400 font-black">{weatherMock}</strong>
                </h4>
              </div>
            </div>
            <div className="flex bg-[#f8fafc] dark:bg-[#090a0f] p-1 border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl text-[8px] font-bold font-display">
              {["Sunny", "Rainy", "Heatwave", "Cold"].map(w => (
                <button 
                  key={w}
                  onClick={() => setWeatherMock(w)}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${weatherMock === w ? 'bg-indigo-600 text-white shadow-sm' : 'bg-transparent text-slate-400 dark:text-slate-500 hover:text-slate-650'}`}
                >
                  {w[0]}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-[#f8fafc] dark:bg-[#090a0f] rounded-xl p-3 border border-[#e2e8f0] dark:border-[#1f212e] space-y-3">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 dark:text-slate-400 dark:text-slate-500">
              <div>
                <p className="text-[8px] text-slate-400 dark:text-slate-500 uppercase">Forecast Multiplier</p>
                <p className="text-sm font-bold font-display text-slate-850 dark:text-slate-205">{(salesMultiplier * 100).toFixed(0)}%</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-slate-400 dark:text-slate-500 uppercase">Revenue Target</p>
                <p className="text-sm font-bold font-display text-indigo-600 dark:text-indigo-400">${totalWeeklySalesForecast.toFixed(0)}</p>
              </div>
            </div>

            {/* Immersive Animated Live Weather Canvas */}
            <div>
              <WeatherLiveCanvas weather={weatherMock} />
            </div>
            
            <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-[10px] font-bold text-indigo-850 leading-normal flex gap-2">
              <Zap className="w-3.5 h-3.5 shrink-0 text-indigo-600 mt-0.5 animate-pulse" />
              <div>
                {weatherMock === 'Rainy' && <p>☔ **Spike warning!** Rainy weather spikes roll & coffee sales. Estimated +25% revenue.</p>}
                {weatherMock === 'Sunny' && <p>☀️ **Optimal traffic!** High mall footfalls. Estimated +15% cold sweets sales.</p>}
                {weatherMock === 'Heatwave' && <p>🥵 **Heatwave warning!** Hot baking drops. Preserving profit dials is recommended.</p>}
                {weatherMock === 'Cold' && <p>❄️ **Winter Chill!** Hot baking stable. Estimated +10% standard demand.</p>}
              </div>
            </div>

            <button
              onClick={async () => {
                const { value: val } = await Swal.fire({
                  title: '📝 Set Sales Forecast',
                  text: 'Enter base sales target:',
                  input: 'number',
                  inputValue: manualSalesForecast,
                  showCancelButton: true,
                  confirmButtonColor: '#4F46E5'
                });
                if (val) setManualSalesForecast(parseFloat(val));
              }}
              className="w-full py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[9px] font-bold font-display uppercase tracking-widest text-center cursor-pointer active:scale-95 transition-all"
            >
              Adjust Base Sales Target
            </button>
          </div>
        </div>

        {/* Highlight Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 text-left shadow-sm">
            <p className="text-[8px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Team Size</p>
            <h3 className="text-xl font-bold font-display text-slate-800 dark:text-slate-200 mt-1">{profiles.filter(p => p.role !== 'manager').length} staff</h3>
          </div>
          <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 text-left shadow-sm">
            <p className="text-[8px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Live Clocked-In</p>
            <h3 className="text-xl font-bold font-display text-emerald-600 mt-1">{activeClockIns.length} online</h3>
          </div>
        </div>

        {/* Labor Budget Progress */}
        <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 text-left shadow-sm space-y-2">
          <div className="flex justify-between items-baseline">
            <p className="text-[8px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Weekly Labor budget</p>
            <span className="text-[10px] text-slate-800 dark:text-slate-200 font-bold font-display">${totalLaborSpend.toFixed(0)} / ${budgetTarget}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-[#090a0f] h-2 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${Math.min((totalLaborSpend / budgetTarget) * 100, 100)}%` }}
              className={`h-full ${totalLaborSpend > budgetTarget ? 'bg-rose-500' : 'bg-indigo-600'}`}
            />
          </div>
          <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 leading-none">{(totalLaborSpend / budgetTarget * 100).toFixed(0)}% budget consumed</p>
        </div>

        {/* Fatigue Monitoring Widget */}
        <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 text-left shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-2 py-0.5">
            <Brain className="w-4 h-4 text-indigo-650" />
            <h4 className="text-xs font-bold font-display text-indigo-950 leading-none uppercase tracking-wider">🧠 Employee Fatigue Radar</h4>
          </div>
          
          <div className="space-y-2.5">
            {profiles.filter(p => p.role !== 'manager').slice(0, 3).map(p => {
              const userShifts = weekShifts.filter(s => s.user_id === p.id);
              const consecutiveDays = userShifts.length;
              let fatigue = 20 + (consecutiveDays * 12);
              if (p.id === 'p-bella') fatigue += 28;
              if (p.id === 'p-david') fatigue += 15;
              
              return (
                <div key={p.id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2 last:border-0 last:pb-0 font-bold">
                  <span className="text-slate-700 dark:text-slate-300">{p.full_name}</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wider ${
                    fatigue > 70 ? 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse' :
                    fatigue > 40 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  }`}>
                    {fatigue}% stress
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Supervisor crossover logs */}
        <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 text-left shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-2 py-0.5">
            <FileText className="w-4 h-4 text-indigo-655" />
            <h4 className="text-xs font-bold font-display text-indigo-950 leading-none uppercase tracking-wider">📋 Smart-Walk Handover Diary</h4>
          </div>
          <div className="space-y-2.5">
            {handovers.slice(0, 2).map(handover => (
              <div 
                key={handover.id} 
                onClick={() => { setSelectedHandover(handover); setShowHandoverModal(true); }}
                className="bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-indigo-50/30 border border-[#e2e8f0] dark:border-[#1f212e] p-3 rounded-xl cursor-pointer transition-all flex justify-between items-center"
              >
                <div>
                  <p className="text-slate-800 dark:text-slate-200 font-bold text-xs leading-none">{handover.lead_name}</p>
                  <p className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold mt-1">Score: {handover.rating} ★ • click to review audit</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  };

  // Mobile Roster Viewport
  const renderMobileRoster = () => {
    const dates = getWeekDates(weekOffset);
    return (
      <div className="space-y-4 font-sans text-slate-700 dark:text-slate-300">
        {/* Date Selector Header */}
        <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] p-4 rounded-xl shadow-sm text-center">
          <div className="flex justify-between items-center mb-3">
            <button 
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1.5 bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-slate-100 dark:bg-[#090a0f] rounded-xl text-slate-600 dark:text-slate-400 dark:text-slate-500 transition-all cursor-pointer border border-[#e2e8f0] dark:border-[#1f212e]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Roster Period</p>
              <p className="text-xs font-bold font-display text-slate-850">
                {new Date(dates[0]).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - {new Date(dates[6]).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <button 
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-1.5 bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-slate-100 dark:bg-[#090a0f] rounded-xl text-slate-600 dark:text-slate-400 dark:text-slate-500 transition-all cursor-pointer border border-[#e2e8f0] dark:border-[#1f212e]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          {/* Day list row */}
          <div className="flex justify-between gap-1 select-none">
            {dates.map(dateStr => {
              const d = new Date(dateStr);
              const isSelected = activeMobileDate === dateStr;
              const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
              const dayName = dayNames[d.getDay()];
              const dayNum = d.getDate();
              
              const todayShifts = shifts.filter(s => s.shift_date === dateStr);
              
              return (
                <button
                  key={dateStr}
                  onClick={() => setActiveMobileDate(dateStr)}
                  className={`flex-1 py-2 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    isSelected ? 'bg-indigo-600 text-white font-bold font-display shadow-md' : 'bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-slate-100 dark:bg-[#090a0f] text-slate-600 dark:text-slate-400 dark:text-slate-500 font-bold'
                  }`}
                >
                  <span className="text-[7px] uppercase tracking-wider leading-none">{dayName[0]}</span>
                  <span className="text-xs leading-none mt-0.5">{dayNum}</span>
                  {todayShifts.length > 0 && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white dark:bg-[#12131a]' : 'bg-indigo-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day's Shifts list */}
        <div className="space-y-3 text-left">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-xs font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
              Shifts ({shifts.filter(s => s.shift_date === activeMobileDate).length})
            </h4>
            <button
              onClick={() => {
                setNewShift(prev => ({ ...prev, shift_date: activeMobileDate }));
                setShowAddModal(true);
              }}
              className="text-[8px] font-bold font-display uppercase text-indigo-600 hover:text-indigo-755 bg-indigo-50 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer border border-indigo-100"
            >
              <Plus className="w-3 h-3" />
              <span>Add Shift</span>
            </button>
          </div>
          
          {shifts.filter(s => s.shift_date === activeMobileDate).length === 0 ? (
            <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 text-center text-slate-400 dark:text-slate-500 text-xs font-bold shadow-sm">
              No shifts scheduled for this day.
            </div>
          ) : (
            shifts.filter(s => s.shift_date === activeMobileDate).map(shift => {
              const emp = profiles.find(p => p.id === shift.user_id);
              const empName = emp ? emp.full_name : 'Open Shift / Draft';
              const initialLetter = empName.charAt(0).toUpperCase();
              
              return (
                <div 
                  key={shift.id} 
                  className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 shadow-sm text-xs font-bold flex items-center justify-between text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:border-[#e2e8f0] dark:border-[#1f212e] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      style={{ backgroundColor: emp ? emp.color : '#64748b' }}
                      className="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold font-display text-xs uppercase shrink-0 shadow-sm"
                    >
                      {initialLetter}
                    </div>
                    <div>
                      <p className="text-slate-800 dark:text-slate-200 font-bold font-display">{empName}</p>
                      <p className="text-[10px] text-indigo-650 font-bold uppercase tracking-wider mt-0.5">
                        🕒 {shift.start_time} - {shift.end_time}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-1.5 select-none">
                    <button
                      onClick={() => {
                        setEditingShift(shift);
                        setShowEditModal(true);
                      }}
                      className="p-2 bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-indigo-50 text-slate-400 dark:text-slate-500 hover:text-indigo-600 rounded-xl transition-all cursor-pointer border border-[#e2e8f0] dark:border-[#1f212e]"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteShift(shift.id)}
                      className="p-2 bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-rose-50 text-slate-400 dark:text-slate-500 hover:text-rose-500 rounded-xl transition-all cursor-pointer border border-[#e2e8f0] dark:border-[#1f212e]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Mobile Timesheets Viewport
  const renderMobileTimesheets = () => {
    return (
      <div className="space-y-4 font-sans text-slate-700 dark:text-slate-300 text-left">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-xs font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Timesheet Entries</h4>
          <button 
            onClick={() => setShowManualClockModal(true)}
            className="text-[8px] font-bold font-display uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Manual</span>
          </button>
        </div>

        {timeLogs.length === 0 ? (
          <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 text-center text-slate-400 dark:text-slate-500 text-xs font-bold shadow-sm">
            No timesheet logs recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {timeLogs.slice(0, 8).map(log => {
              const emp = profiles.find(p => p.id === log.user_id);
              const empName = emp ? emp.full_name : 'Unknown Staff';
              const initialLetter = empName.charAt(0).toUpperCase();
              
              const formattedIn = new Date(log.clock_in).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
              const formattedOut = log.clock_out 
                ? new Date(log.clock_out).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
                : 'Working Now';

              const logDate = new Date(log.clock_in).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
              
              return (
                <div key={log.id} className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 shadow-sm space-y-3 text-xs font-bold text-slate-650 dark:text-slate-400 dark:text-slate-500">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <div 
                        style={{ backgroundColor: emp ? emp.color : '#64748b' }}
                        className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold font-display text-[10px] uppercase shrink-0 shadow-sm"
                      >
                        {initialLetter}
                      </div>
                      <div>
                        <p className="text-slate-800 dark:text-slate-200 font-bold font-display leading-none">{empName}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1.5">{logDate} • {formattedIn} - {formattedOut}</p>
                      </div>
                    </div>
                    
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wider ${
                      log.is_approved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {log.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  
                  {log.notes && (
                    <div className="bg-[#f8fafc] dark:bg-[#090a0f] p-2.5 rounded-xl text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-normal italic">
                      "{log.notes}"
                    </div>
                  )}

                  {!log.is_approved && (
                    <div className="flex gap-2 select-none border-t border-[#e2e8f0] dark:border-[#1f212e] pt-3 mt-1">
                      <button 
                        onClick={() => handleApproveLog(log.id, true)}
                        className="flex-grow py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] uppercase tracking-wider font-bold font-display text-center cursor-pointer active:scale-95 transition-all shadow-sm"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => {
                          setEditingTimesheet(log);
                          setEditingTimesheetDate(log.clock_in.split('T')[0]);
                          setEditingTimesheetIn(new Date(log.clock_in).toISOString().substr(11, 5));
                          setEditingTimesheetOut(log.clock_out ? new Date(log.clock_out).toISOString().substr(11, 5) : '');
                          setShowEditTimesheetModal(true);
                        }}
                        className="p-2 bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-indigo-50 border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl text-slate-400 dark:text-slate-500 hover:text-indigo-650 transition-all cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTimesheet(log.id)}
                        className="p-2 bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-rose-50 border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Mobile Secondary Operational Panels Viewport
  const renderMobileSecondaryTabs = () => {
    if (managerTab === 'swaps') {
      return (
        <div className="space-y-4 animate-fade-in text-left font-sans text-slate-700 dark:text-slate-300">
          <h4 className="text-xs font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 leading-none">Swap Approvals</h4>
          
          {swapRequests.filter(s => s.status === 'pending').length === 0 ? (
            <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 text-center text-slate-400 dark:text-slate-500 text-xs font-bold shadow-sm">
              No pending swap requests active.
            </div>
          ) : (
            swapRequests.filter(s => s.status === 'pending').map(swap => {
              const req = profiles.find(p => p.id === swap.requester_id);
              const target = swap.target_user_id === 'open' ? null : profiles.find(p => p.id === swap.target_user_id);
              const shift = shifts.find(s => s.id === swap.shift_id);
              
              if (!req || !shift) return null;
              
              return (
                <div key={swap.id} className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 shadow-sm space-y-3 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-500">
                  <div>
                    <span className="text-[8px] font-bold font-display uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded leading-none">Swap Broadcast Request</span>
                    <p className="text-slate-800 dark:text-slate-200 font-bold font-display text-sm mt-2">{req.full_name}</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 leading-none">
                      ➡ {target ? `Claimed by: ${target.full_name}` : 'Posted to Open pool'}
                    </p>
                  </div>
                  
                  <div className="bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] p-3 rounded-xl text-[10px] text-slate-650 dark:text-slate-400 dark:text-slate-500 space-y-1">
                    <p>📅 **Shift Date**: {shift.shift_date}</p>
                    <p>🕒 **Hours**: {shift.start_time} - {shift.end_time}</p>
                  </div>
                  
                  <div className="flex gap-2 select-none border-t border-[#e2e8f0] dark:border-[#1f212e] pt-3">
                    <button 
                      onClick={() => handleSwapApproval(swap.id, true)}
                      className="flex-grow py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] uppercase font-bold font-display text-center cursor-pointer active:scale-95 transition-all shadow-sm"
                    >
                      Approve Swap
                    </button>
                    <button 
                      onClick={() => handleSwapApproval(swap.id, false)}
                      className="py-2 px-4 bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-rose-50 text-slate-500 dark:text-slate-450 hover:text-rose-600 border border-[#e2e8f0] dark:border-[#1f212e] hover:border-rose-100 rounded-xl text-[10px] uppercase font-bold font-display text-center cursor-pointer active:scale-95 transition-all"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      );
    }

    if (managerTab === 'leave') {
      return (
        <div className="space-y-4 animate-fade-in text-left font-sans text-slate-700 dark:text-slate-300">
          <h4 className="text-xs font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 leading-none">Leave Approvals</h4>
          
          {leaveRequests.filter(l => l.status === 'pending').length === 0 ? (
            <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 text-center text-slate-400 dark:text-slate-500 text-xs font-bold shadow-sm">
              No pending leave requests.
            </div>
          ) : (
            leaveRequests.filter(l => l.status === 'pending').map(leave => {
              const emp = profiles.find(p => p.id === leave.user_id);
              if (!emp) return null;
              
              return (
                <div key={leave.id} className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 shadow-sm space-y-3 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-500">
                  <div>
                    <span className="text-[8px] font-bold font-display uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded leading-none">{leave.leave_type} Leave</span>
                    <h3 className="text-slate-800 dark:text-slate-200 font-bold font-display text-sm mt-2">{emp.full_name}</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
                      {new Date(leave.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - {new Date(leave.end_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  
                  {leave.employee_notes && (
                    <div className="bg-[#f8fafc] dark:bg-[#090a0f] p-2.5 rounded-xl text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-normal italic">
                      "{leave.employee_notes}"
                    </div>
                  )}
                  
                  <div className="flex gap-2 select-none border-t border-[#e2e8f0] dark:border-[#1f212e] pt-3">
                    <button 
                      onClick={() => handleLeaveApproval(leave.id, true)}
                      className="flex-grow py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] uppercase font-bold font-display text-center cursor-pointer active:scale-95 transition-all shadow-sm"
                    >
                      Approve Leave
                    </button>
                    <button 
                      onClick={() => handleLeaveApproval(leave.id, false)}
                      className="py-2 px-4 bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-rose-50 border border-[#e2e8f0] dark:border-[#1f212e] hover:border-rose-100 rounded-xl text-slate-500 dark:text-slate-450 hover:text-rose-600 text-[10px] uppercase font-bold font-display text-center cursor-pointer active:scale-95 transition-all"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      );
    }

    if (managerTab === 'docs') {
      return (
        <div className="space-y-4 animate-fade-in text-left font-sans text-slate-700 dark:text-slate-300">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-xs font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Compliance Docs</h4>
            <button 
              onClick={() => {
                Swal.fire({
                  title: '📢 Create Compliance Policy',
                  text: 'Please utilize full desktop mode to draft extensive regulatory award policy updates.',
                  icon: 'info',
                  confirmButtonColor: '#4F46E5'
                });
              }}
              className="text-[8px] font-bold font-display uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              Add Policy
            </button>
          </div>
          
          <div className="space-y-3">
            {documents.map(doc => {
              const signedCount = signatures.filter(s => s.document_id === doc.id).length;
              const totalStaff = profiles.filter(p => p.role !== 'manager').length;
              return (
                <div key={doc.id} className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 shadow-sm space-y-3 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-500">
                  <div>
                    <span className="text-[8px] font-bold font-display uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 leading-none">Broadcast Policy</span>
                    <h3 className="text-slate-800 dark:text-slate-200 font-bold font-display text-sm mt-2">{doc.title}</h3>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">Signed by {signedCount} of {totalStaff} employees</p>
                  </div>
                  
                  <div className="flex gap-1.5 select-none border-t border-[#e2e8f0] dark:border-[#1f212e] pt-3">
                    <button 
                      onClick={() => { setSelectedAuditDoc(doc); setShowAuditModal(true); }}
                      className="flex-grow py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] uppercase font-bold font-display text-center cursor-pointer active:scale-95 transition-all shadow-sm"
                    >
                      Audit PDF Log
                    </button>
                    <button 
                      onClick={() => { setEditingDoc({ ...doc }); setShowEditDocModal(true); }}
                      className="p-2 bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-indigo-50 border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl text-slate-400 dark:text-slate-500 hover:text-indigo-600 transition-all cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (managerTab === 'staff') {
      return (
        <div className="space-y-4 animate-fade-in text-left font-sans text-slate-700 dark:text-slate-300">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-xs font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Team Directory</h4>
            <button 
              onClick={() => {
                setNewEmployee({
                  full_name: '',
                  email: '',
                  phone: '',
                  dob: '',
                  type: 'Casual',
                  hourly_rate: 29.23,
                  contracted_hours: 15,
                  color: '#4F46E5'
                });
                setShowAddEmployeeModal(true);
              }}
              className="text-[8px] font-bold font-display uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              Add Staff
            </button>
          </div>
          
          <div className="space-y-3">
            {profiles.filter(p => p.role !== 'manager').map(emp => {
              const initialLetter = emp.full_name ? emp.full_name.charAt(0).toUpperCase() : '';
              return (
                <div key={emp.id} className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 shadow-sm flex items-center justify-between text-xs font-bold text-slate-655 hover:border-[#e2e8f0] dark:border-[#1f212e] transition-all">
                  <div className="flex items-center gap-3">
                    <div 
                      style={{ backgroundColor: emp.color || '#4F46E5' }}
                      className="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold font-display text-xs uppercase shrink-0 shadow-sm"
                    >
                      {initialLetter}
                    </div>
                    <div>
                      <p className="text-slate-800 dark:text-slate-200 font-bold font-display leading-none">{emp.full_name}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">{emp.type} • Pin: {emp.kiosk_pin} • Pass: {emp.temp_password}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => { setEditingEmployee(emp); setShowEditEmployeeModal(true); }}
                      className="p-2 bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-indigo-50 border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl text-slate-400 dark:text-slate-500 hover:text-indigo-650 transition-all cursor-pointer"
                      title="Edit Profile"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteEmployee(emp.id, emp.full_name)}
                      className="p-2 bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-rose-50 border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl text-slate-400 dark:text-slate-500 hover:text-rose-600 transition-all cursor-pointer"
                      title="Delete Employee"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (managerTab === 'payroll') {
      return (
        <div className="space-y-4 animate-fade-in text-left font-sans text-slate-700 dark:text-slate-300">
          <h4 className="text-xs font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 leading-none">Xero Payroll Sync</h4>
          
          <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-inner">
                <CloudLightning className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold font-display text-slate-850 text-sm">Xero Timesheets Connected</h4>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Xero API integration active</p>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-500 dark:text-slate-450 font-medium leading-relaxed">
              Export and synchronize approved timesheet logs directly to Xero Timesheets for secure payroll processing.
            </p>
            
            <button 
              onClick={handleSyncXero}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold font-display text-[10px] uppercase tracking-widest shadow-md transition-all text-center cursor-pointer active:scale-95 border border-blue-500/20"
            >
              Sync to Xero Payroll
            </button>
          </div>
        </div>
      );
    }

    if (managerTab === 'settings') {
      return (
        <div className="space-y-4 animate-fade-in text-left font-sans text-slate-700 dark:text-slate-300">
          <h4 className="text-xs font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 leading-none">Store Settings</h4>
          
          <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 shadow-sm space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
            <div className="space-y-1">
              <label className="text-[8px] font-bold font-display uppercase text-slate-400 dark:text-slate-500 block">Weekly Labor Budget ($)</label>
              <input 
                type="number"
                value={budgetTarget}
                onChange={(e) => setBudgetTarget(parseFloat(e.target.value))}
                className="w-full p-3 bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl outline-none font-bold text-slate-700 dark:text-slate-300"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-bold font-display uppercase text-slate-400 dark:text-slate-500 block">Corporate Logo Image URL</label>
              <input 
                type="text"
                placeholder="e.g. https://squareconnect.com.au/assets/logo.png"
                value={localStorage.getItem('custom_logo_url') || ''}
                onChange={(e) => {
                  const url = e.target.value;
                  if (url) {
                    localStorage.setItem('custom_logo_url', url);
                  } else {
                    localStorage.removeItem('custom_logo_url');
                  }
                  setCompactMode(prev => !prev);
                  setTimeout(() => setCompactMode(prev => !prev), 0);
                }}
                className="w-full p-3 bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl outline-none font-semibold text-slate-700 dark:text-slate-300"
              />
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div>
                <p className="text-slate-800 dark:text-slate-200 leading-none">Compact View Grid</p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mt-1">Slim roster lines spacing</p>
              </div>
              <input 
                type="checkbox" 
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
                className="w-4 h-4 text-indigo-650 accent-indigo-650 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div>
                <p className="text-slate-800 dark:text-slate-200 leading-none">Roster Market Lock</p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mt-1">Kill switch for shift market</p>
              </div>
              <input 
                type="checkbox" 
                checked={marketKillSwitch}
                onChange={(e) => setMarketKillSwitch(e.target.checked)}
                className="w-4 h-4 text-indigo-650 accent-indigo-655 cursor-pointer"
              />
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Render Mobile Manager Dashboard Main Wrapper
  const renderMobileManagerDashboard = () => {
    return (
      <div className="w-full h-full flex flex-col relative overflow-hidden bg-[#f8fafc] dark:bg-[#090a0f] text-slate-850 dark:text-slate-200 transition-colors duration-250">
        {/* Mobile Header */}
        <header className="w-full bg-white dark:bg-[#12131a] dark:bg-[#12131a] border-b border-[#e2e8f0] dark:border-[#1f212e] p-4 shrink-0 flex items-center justify-between z-10 shadow-sm transition-colors duration-250">
          <div className="flex items-center gap-2.5 select-none">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold font-display text-xs shadow-inner shadow-indigo-700/50">TK</div>
            <div>
              <h1 className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 dark:text-slate-100 tracking-tight leading-none">TabKey Store Manager</h1>
              <p className="text-[8px] text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-450 font-semibold tracking-widest uppercase mt-0.5">Mobile Console</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => {
                document.documentElement.classList.toggle('dark');
              }}
              className="p-2 bg-[#f8fafc] dark:bg-[#090a0f] dark:bg-white dark:bg-[#12131a]/5 hover:bg-indigo-50 dark:hover:bg-white dark:bg-[#12131a]/10 text-slate-500 dark:text-slate-450 dark:text-slate-450 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all cursor-pointer border border-[#e2e8f0] dark:border-white/5"
              title="Toggle Theme"
            >
              <CloudSun className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setManagerViewMode('desktop')}
              className="p-2 bg-[#f8fafc] dark:bg-[#090a0f] dark:bg-white dark:bg-[#12131a]/5 hover:bg-indigo-50 dark:hover:bg-white dark:bg-[#12131a]/10 text-slate-500 dark:text-slate-450 dark:text-slate-450 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all cursor-pointer border border-[#e2e8f0] dark:border-white/5"
              title="Desktop View"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button 
              onClick={onLogout}
              className="p-2 bg-[#f8fafc] dark:bg-[#090a0f] dark:bg-white dark:bg-[#12131a]/5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 dark:text-slate-450 dark:text-slate-450 hover:text-rose-500 dark:hover:text-rose-450 rounded-xl transition-all cursor-pointer border border-[#e2e8f0] dark:border-white/5"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-grow overflow-y-auto p-4 space-y-5 bg-[#f8fafc] dark:bg-[#090a0f] pb-28">
          {managerTab === 'dashboard' && renderMobileDashboardHome()}
          {managerTab === 'roster' && renderMobileRoster()}
          {managerTab === 'time' && renderMobileTimesheets()}
          {['swaps', 'leave', 'docs', 'staff', 'payroll', 'settings'].includes(managerTab) && renderMobileSecondaryTabs()}
        </main>

        {/* Bottom Navigation Capsule Bar */}
        <nav className="absolute bottom-4 left-4 right-4 h-16 rounded-xl bg-white dark:bg-[#12131a]/90 backdrop-blur-md border border-[#e2e8f0] dark:border-[#1f212e]/40 shadow-lg z-20 flex items-center justify-around px-2 select-none">
          <button 
            onClick={() => { setManagerTab('dashboard'); setShowMoreMenu(false); }}
            className={`flex flex-col items-center gap-1 font-bold text-[9px] tracking-wider transition-colors cursor-pointer ${
              managerTab === 'dashboard' ? 'text-indigo-600 font-bold font-display' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
            <span>Home</span>
          </button>

          <button 
            onClick={() => { setManagerTab('roster'); setShowMoreMenu(false); }}
            className={`flex flex-col items-center gap-1 font-bold text-[9px] tracking-wider transition-colors cursor-pointer ${
              managerTab === 'roster' ? 'text-indigo-600 font-bold font-display' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500'
            }`}
          >
            <Calendar className="w-4.5 h-4.5" />
            <span>Roster</span>
          </button>

          <button 
            onClick={() => { setManagerTab('time'); setShowMoreMenu(false); }}
            className={`flex flex-col items-center gap-1 font-bold text-[9px] tracking-wider transition-colors cursor-pointer ${
              managerTab === 'time' ? 'text-indigo-600 font-bold font-display' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500'
            }`}
          >
            <Clock className="w-4.5 h-4.5" />
            <span>Timesheets</span>
          </button>

          <button 
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center gap-1 font-bold text-[9px] tracking-wider transition-colors cursor-pointer ${
              showMoreMenu ? 'text-indigo-600 font-bold font-display' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500'
            }`}
          >
            <Sliders className="w-4.5 h-4.5" />
            <span>More</span>
          </button>
        </nav>

        {/* More Menu Drawer Overlay */}
        {showMoreMenu && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs z-30 flex flex-col justify-end animate-fade-in">
            <div className="bg-white dark:bg-[#12131a] rounded-t-[2.5rem] border-t border-[#e2e8f0] dark:border-[#1f212e] p-6 space-y-5 animate-slide-up shadow-2xl">
              <div className="flex justify-between items-center pb-2 border-b border-[#e2e8f0] dark:border-[#1f212e] select-none">
                <h4 className="font-bold font-display text-slate-800 dark:text-slate-200 text-xs uppercase tracking-widest">More Operations</h4>
                <button onClick={() => setShowMoreMenu(false)} className="p-1.5 hover:bg-[#f8fafc] dark:bg-[#090a0f] rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'swaps', label: 'Swaps', icon: <Repeat className="w-5 h-5 text-indigo-500" />, badge: pendingSwapsCount },
                  { id: 'leave', label: 'Leaves', icon: <Coffee className="w-5 h-5 text-amber-500" />, badge: pendingLeavesCount },
                  { id: 'docs', label: 'Compliance', icon: <Shield className="w-5 h-5 text-emerald-500" /> },
                  { id: 'staff', label: 'Team', icon: <Users className="w-5 h-5 text-purple-500" /> },
                  { id: 'payroll', label: 'Payroll', icon: <CloudLightning className="w-5 h-5 text-blue-500" /> },
                  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5 text-slate-500 dark:text-slate-450" /> }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setManagerTab(item.id); setShowMoreMenu(false); }}
                    className="p-3 bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-indigo-50/50 border border-[#e2e8f0] dark:border-[#1f212e] hover:border-indigo-100/50 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 active:scale-95 transition-all relative cursor-pointer"
                  >
                    {item.icon}
                    <span className="text-[9px] font-bold font-display uppercase text-slate-600 dark:text-slate-400 dark:text-slate-500 tracking-wider leading-none mt-1">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold font-display text-[8px] px-1.5 py-0.5 rounded-full leading-none">{item.badge}</span>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="pt-2 border-t border-[#e2e8f0] dark:border-[#1f212e] select-none">
                <button
                  onClick={() => { handleResetDemo(); setShowMoreMenu(false); }}
                  className="w-full py-3 hover:bg-rose-50 border border-rose-100 text-rose-500 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reset Demo Data</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`w-full h-[100dvh] overflow-hidden animate-fade-in relative ${
      managerViewMode === 'mobile' 
        ? 'bg-[#f8fafc] dark:bg-[#090a0f] md:bg-slate-950 flex flex-col items-center justify-center p-0 md:p-8 text-center pb-0 md:pb-8' 
        : 'bg-[#f8fafc] dark:bg-[#090a0f] flex flex-col md:flex-row'
    }`}>

      {managerViewMode === 'mobile' && (
        <>
          {/* Geometric Background Blobs */}
          <div className="absolute top-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-indigo-600/10 blur-3xl pointer-events-none z-10 animate-pulse hidden md:block" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-violet-600/10 blur-3xl pointer-events-none z-10 hidden md:block" />

          {/* Floating View Switcher at the top of browser window */}
          <div className="z-30 mb-5 shrink-0 hidden md:flex items-center justify-center select-none">
            <button 
              type="button"
              onClick={() => setManagerViewMode('desktop')}
              className="px-5 py-2.5 bg-white dark:bg-[#12131a]/5 hover:bg-white dark:bg-[#12131a]/10 active:scale-95 text-white rounded-full font-bold font-display text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border border-white/10 shadow-lg cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              <span>Orientation: <strong className="text-indigo-400">Desktop View</strong></span>
            </button>
          </div>

          {/* iPhone simulated device bezel - only styled on desktop viewports */}
          <div className="w-full h-full md:max-w-[390px] md:max-h-[760px] md:w-[390px] md:h-[760px] md:rounded-[3.25rem] md:border-[14px] md:border-slate-900 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] bg-[#f8fafc] dark:bg-[#090a0f] flex flex-col relative overflow-hidden md:outline md:outline-2 md:outline-white/5 shrink-0 text-left z-20">
            {/* iOS Status Bar */}
            <div className="hidden md:flex shrink-0 h-10 w-full bg-white dark:bg-[#12131a] items-center justify-between px-6 pt-4 text-[10px] font-bold text-slate-800 dark:text-slate-200 relative z-30 select-none">
              <span>9:41</span>
              <div className="w-24 h-5.5 bg-[#090a0f] dark:bg-[#090a0f] rounded-full absolute top-2.5 left-1/2 transform -translate-x-1/2 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-850 absolute right-4 animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5 opacity-80">
                <span className="text-[9px]">5G</span>
                <div className="w-5 h-2.5 border border-slate-800 rounded-sm p-[1px] flex items-center">
                  <div className="h-full w-4/5 bg-slate-800 rounded-2xs" />
                </div>
              </div>
            </div>

            {/* Simulated app screen */}
            <div className="w-full flex-grow flex flex-col overflow-hidden bg-[#f8fafc] dark:bg-[#090a0f] h-full relative">
              {renderMobileManagerDashboard()}
            </div>

            {/* iOS Home Indicator Bar */}
            <div className="hidden md:flex h-5 w-full bg-white dark:bg-[#12131a] flex items-center justify-center shrink-0 pb-1 z-35 select-none pointer-events-none">
              <div className="w-28 h-1 bg-slate-800 rounded-full" />
            </div>
          </div>
        </>
      )}

      {managerViewMode === 'desktop' && (
        <>
          {/* Sidebar navigation */}
          <aside className="w-full md:w-64 bg-white dark:bg-[#12131a] border-b md:border-b-0 md:border-r border-[#e2e8f0] dark:border-[#1f212e] flex flex-col shrink-0">
            <div className="p-6 border-b border-[#e2e8f0] dark:border-[#1f212e] flex items-center justify-between shrink-0">
              <div className="flex flex-col">
                <h1 className="text-base font-bold font-display text-indigo-600 leading-none">TabKey Workforce</h1>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Roster Solution</p>
              </div>
              <div className="flex items-center gap-1.5 md:hidden">
                <button 
                  onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-[#12131a]/5 hover:text-indigo-650 text-slate-400 dark:text-slate-500 rounded-xl transition-all cursor-pointer border border-[#e2e8f0] dark:border-[#1f212e]"
                  title="Toggle Menu"
                >
                  <Sliders className="w-4 h-4" />
                </button>
                <button 
                  onClick={onLogout}
                  className="p-2 hover:bg-rose-50 text-slate-400 dark:text-slate-500 hover:text-rose-500 rounded-xl transition-all cursor-pointer border border-[#e2e8f0] dark:border-[#1f212e]"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className={`${showMobileSidebar ? 'block' : 'hidden md:block'} flex-grow flex flex-col overflow-y-auto tabkey-smooth-scroll`}>

            {/* Premium Desktop/Mobile View Switcher in sidebar */}
            <div className="p-4 border-b border-[#e2e8f0] dark:border-[#1f212e] shrink-0">
              <div className="bg-[#f8fafc] dark:bg-[#090a0f] border border-slate-150 p-1 rounded-xl flex items-center select-none text-[9px] font-bold font-display font-sans">
                <button 
                  type="button"
                  onClick={() => setManagerViewMode('desktop')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${managerViewMode === 'desktop' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 bg-transparent'}`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>DESKTOP</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setManagerViewMode('mobile')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${managerViewMode === 'mobile' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 bg-transparent'}`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>MOBILE</span>
                </button>
              </div>
            </div>
        
        <nav className="flex-grow p-4 space-y-1 font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 overflow-y-auto tabkey-smooth-scroll select-none">
          <span className="px-3 py-1.5 block text-[10px] text-slate-300 font-bold font-display">Controls</span>
          
          <button 
            onClick={() => setManagerTab('dashboard')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
              managerTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-[#f8fafc] dark:bg-[#090a0f] hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Home</span>
            </div>
          </button>

          <button 
            onClick={() => setManagerTab('roster')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
              managerTab === 'roster' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-[#f8fafc] dark:bg-[#090a0f] hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>Roster Grid</span>
            </div>
          </button>

          <button 
            onClick={() => setManagerTab('time')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
              managerTab === 'time' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-[#f8fafc] dark:bg-[#090a0f] hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Timesheets</span>
            </div>
            {pendingTimesheetsCount > 0 && (
              <span className="bg-amber-500 text-white font-bold font-display text-[9px] px-2 py-0.5 rounded-full">
                {pendingTimesheetsCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setManagerTab('swaps')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
              managerTab === 'swaps' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-[#f8fafc] dark:bg-[#090a0f] hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              <span>Shift Swaps</span>
            </div>
            {pendingSwapsCount > 0 && (
              <span className="bg-indigo-500 text-white font-bold font-display text-[9px] px-2 py-0.5 rounded-full">
                {pendingSwapsCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setManagerTab('leave')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
              managerTab === 'leave' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-[#f8fafc] dark:bg-[#090a0f] hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4" />
              <span>Leaves</span>
            </div>
            {pendingLeavesCount > 0 && (
              <span className="bg-indigo-500 text-white font-bold font-display text-[9px] px-2 py-0.5 rounded-full">
                {pendingLeavesCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setManagerTab('docs')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
              managerTab === 'docs' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-[#f8fafc] dark:bg-[#090a0f] hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Compliance Docs</span>
            </div>
          </button>

          <button 
            onClick={() => setManagerTab('reports')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
              managerTab === 'reports' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-[#f8fafc] dark:bg-[#090a0f] hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              <span>Variance Report</span>
            </div>
          </button>

          <button 
            onClick={() => setManagerTab('staff')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
              managerTab === 'staff' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-[#f8fafc] dark:bg-[#090a0f] hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Team Directory</span>
            </div>
          </button>

          <button 
            onClick={() => setManagerTab('payroll')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
              managerTab === 'payroll' 
                ? 'bg-indigo-50 dark:bg-white dark:bg-[#12131a]/5 text-indigo-600 dark:text-indigo-400 font-semibold' 
                : 'hover:bg-[#f8fafc] dark:bg-[#090a0f] dark:hover:bg-white dark:bg-[#12131a]/5 text-slate-500 dark:text-slate-450 hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <CloudLightning className="w-4 h-4" />
              <span>Xero Payroll</span>
            </div>
          </button>

          <button 
            onClick={() => setManagerTab('settings')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
              managerTab === 'settings' 
                ? 'bg-indigo-50 dark:bg-white dark:bg-[#12131a]/5 text-indigo-600 dark:text-indigo-400 font-semibold' 
                : 'hover:bg-[#f8fafc] dark:bg-[#090a0f] dark:hover:bg-white dark:bg-[#12131a]/5 text-slate-500 dark:text-slate-450 hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              <span>Store Settings</span>
            </div>
          </button>
        </nav>
        
        {/* User Info footer */}
        <div className="p-4 border-t border-[#e2e8f0] dark:border-[#1f212e] shrink-0 flex items-center justify-between font-semibold text-xs select-none transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-650 flex items-center justify-center text-white text-[10px] uppercase font-bold">TM</div>
            <div>
              <p className="text-slate-800 dark:text-slate-200 dark:text-slate-200 leading-none">TabKey Manager</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-450 mt-0.5 uppercase tracking-wider font-semibold">Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button 
              onClick={() => {
                document.documentElement.classList.toggle('dark');
              }}
              className="p-2 hover:bg-[#f8fafc] dark:bg-[#090a0f] dark:hover:bg-white dark:bg-[#12131a]/5 rounded-xl text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-450 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
              title="Toggle Theme"
            >
              <CloudSun className="w-4 h-4" />
            </button>
            <button 
              onClick={onLogout}
              className="p-2 hover:bg-[#f8fafc] dark:bg-[#090a0f] dark:hover:bg-white dark:bg-[#12131a]/5 rounded-xl text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-450 hover:text-rose-550 dark:hover:text-rose-450 transition-all cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>

      {/* Main Administrative Portal Viewport */}
      <main className="flex-grow pt-4 pb-8 px-4 md:pt-4 md:pb-8 md:px-8 overflow-y-auto h-full min-w-0">
        
        {/* 1. DASHBOARD HOME TAB (INNOVATIVE WIDGETRY) */}
        {managerTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Beautiful Large Typographic Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/5">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest text-indigo-650 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 mb-2.5 border border-indigo-150/40 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-glow-emerald" />
                  Live Intelligence Cockpit
                </span>
                <h2 className="text-4xl font-black font-display tracking-tight text-slate-850 dark:text-slate-100 leading-none">
                  Operational <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">Overview</span>
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-2 uppercase tracking-wider">Next-Gen Labor Analytics & Roster Forecast Dashboard</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 select-none">
                {/* Live Date Pill (Enlarged) */}
                <div className="bg-white/90 dark:bg-[#12131a]/85 backdrop-blur-md border border-indigo-100 dark:border-indigo-500/20 px-3 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3.5 shadow-md hover:scale-[1.02] transition-all">
                  <Calendar className="w-4.5 h-4.5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  <div className="text-left">
                    <p className="text-[7.5px] sm:text-[9px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest leading-none">CURRENT DATE</p>
                    <p className="text-xs sm:text-base md:text-xl font-black font-display text-slate-850 dark:text-slate-100 mt-0.5 sm:mt-1 leading-none">
                      {new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                
                {/* Weather Pill with Micro-Animated Icon (Enlarged) */}
                <div className="bg-white/90 dark:bg-[#12131a]/85 backdrop-blur-md border border-blue-100 dark:border-blue-500/20 px-3 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3.5 shadow-md hover:scale-[1.02] transition-all">
                  <div className="w-4.5 h-4.5 sm:w-6 sm:h-6 flex items-center justify-center shrink-0">
                    <WeatherMiniIcon weather={weatherMock} />
                  </div>
                  <div className="text-left">
                    <p className="text-[7.5px] sm:text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest leading-none">FORECAST INTEL</p>
                    <p className="text-xs sm:text-base md:text-xl font-black font-display text-slate-850 dark:text-slate-100 mt-0.5 sm:mt-1 leading-none">
                      {weatherMock} Weather
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* A. Live Metrics Premium Glass Card Deck */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Active Team */}
              <div className="tabkey-glass-card overflow-hidden flex flex-col justify-between p-4 px-4.5 relative select-none transition-all duration-300 hover:shadow-md">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-extrabold font-display uppercase tracking-wider text-slate-500 dark:text-slate-450 leading-none">Active Team Count</p>
                  <span className="w-2 h-2 rounded-full bg-indigo-500 pulse-glow-indigo" />
                </div>
                <div className="flex items-center justify-between gap-3 mt-1.5">
                  <div className="text-left">
                    <h3 className="text-2xl font-black font-display text-slate-850 dark:text-slate-100 leading-none">{profiles.filter(p => p.role !== 'manager').length}</h3>
                    <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wider leading-none">Registered Staff</p>
                  </div>
                  {/* SVG mini-avatar-group aesthetic */}
                  <svg className="w-8 h-8 text-indigo-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
              </div>
              
              {/* Card 2: Weekly Shifts */}
              <div className="tabkey-glass-card overflow-hidden flex flex-col justify-between p-4 px-4.5 relative select-none transition-all duration-300 hover:shadow-md">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-extrabold font-display uppercase tracking-wider text-slate-500 dark:text-slate-450 leading-none">Weekly Shifts Count</p>
                  <span className="px-1.5 py-0.5 rounded text-[7px] font-extrabold uppercase bg-amber-50 text-amber-600 border border-amber-100 leading-none">Active</span>
                </div>
                <div className="flex items-center justify-between gap-3 mt-1.5">
                  <div className="text-left">
                    <h3 className="text-2xl font-black font-display text-slate-850 dark:text-slate-100 leading-none">{weekShifts.filter(s => s.user_id !== 'open').length}</h3>
                    <p className="text-[8px] text-indigo-600 dark:text-indigo-400 font-black mt-1 uppercase tracking-wider leading-none">
                      {weekShifts.filter(s => s.status === 'draft' && s.user_id !== 'open').length} drafts pending
                    </p>
                  </div>
                  <svg className="w-8 h-8 text-indigo-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              </div>
 
              {/* Card 3: Active Clock-Ins */}
              <div className="tabkey-glass-card overflow-hidden flex flex-col justify-between p-4 px-4.5 relative select-none transition-all duration-300 hover:shadow-md">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-extrabold font-display uppercase tracking-wider text-slate-500 dark:text-slate-450 leading-none">Active Clock-Ins</p>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-glow-emerald" />
                </div>
                <div className="flex items-center justify-between gap-3 mt-1.5">
                  <div className="text-left">
                    <h3 className="text-2xl font-black font-display text-emerald-600 leading-none">{activeClockIns.length}</h3>
                    <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wider leading-none">Currently Working</p>
                  </div>
                  <svg className="w-8 h-8 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>
 
              {/* Card 4: Labor Budget */}
              <div className="tabkey-glass-card overflow-hidden flex flex-col justify-between p-4 px-4.5 relative select-none transition-all duration-300 hover:shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-left">
                    <p className="text-xs font-extrabold font-display uppercase tracking-wider text-slate-500 dark:text-slate-450 leading-none">Weekly Budget spend</p>
                    <h3 className="text-2xl font-black font-display text-slate-850 dark:text-slate-100 mt-1.5 leading-none">${totalLaborSpend.toFixed(0)}</h3>
                    <p className="text-[7.5px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider leading-none">Limit: ${budgetTarget}</p>
                  </div>
                  {/* High-fidelity SVG Circular Gauge Chart (Compact!) */}
                  <div className="relative w-13 h-13 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" className="stroke-slate-100 dark:stroke-white/5 fill-transparent" strokeWidth="3.5" />
                      <circle 
                        cx="18" cy="18" r="14" 
                        className={`fill-transparent transition-all duration-500 ${totalLaborSpend > budgetTarget ? 'stroke-rose-500' : 'stroke-indigo-650 dark:stroke-indigo-400'}`}
                        strokeWidth="3.5"
                        strokeDasharray={2 * Math.PI * 14}
                        strokeDashoffset={2 * Math.PI * 14 * (1 - Math.min(totalLaborSpend / budgetTarget, 1))}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className={`absolute text-[8px] font-black font-display ${totalLaborSpend > budgetTarget ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}`}>
                      {(totalLaborSpend / budgetTarget * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Announcement Broadcaster Card */}
            <div className="tabkey-glass-card tabkey-shine-orange p-5 shadow-lg select-none text-left">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left side: Create Announcement Form */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-50 dark:bg-orange-950/40 rounded-xl text-orange-600 dark:text-orange-400">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold font-display text-base text-slate-805 dark:text-slate-100 leading-none">📢 Announcement Broadcaster</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1">Publish notices live to everyone's mobile homepage on login</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateAnnouncement} className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">Announcement Title</label>
                      <input 
                        type="text"
                        placeholder="e.g. Long Weekend Opening Hours 📅"
                        required
                        value={newFeedTitle}
                        onChange={(e) => setNewFeedTitle(e.target.value)}
                        className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">Content / Message</label>
                      <textarea 
                        placeholder="Write your broadcast message here..."
                        required
                        rows={3}
                        value={newFeedContent}
                        onChange={(e) => setNewFeedContent(e.target.value)}
                        className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold font-display text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10 active:scale-95 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Broadcast to Notice Board 🚀</span>
                    </button>
                  </form>
                </div>

                {/* Right side: Live Notice Feed Preview */}
                <div className="lg:col-span-7 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-white/5 pt-4 lg:pt-0 lg:pl-6">
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <p className="text-[10px] font-bold font-display uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">📢 Active Broadcasts Feed</p>
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/10 animate-pulse">LIVE CONNECTED</span>
                    </div>
                    
                    <div className="space-y-3 max-h-[220px] overflow-y-auto premium-scrollbar pr-1">
                      {feed.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs font-medium">
                          No active broadcasts found on the notice board.
                        </div>
                      ) : (
                        feed.slice(0, 3).map(post => (
                          <div key={post.id} className="bg-slate-50/50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 space-y-1.5 text-xs text-left relative hover:scale-[0.99] transition-all">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-805 dark:text-slate-200 text-xs">{post.title}</span>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider select-none">
                                {new Date(post.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                            <p className="text-slate-655 dark:text-slate-400 leading-normal line-clamp-2">{post.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-3.5 p-2 bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl text-[8.5px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                    💡 Broadcasts appear immediately at login and on the notice board homepage of all scheduled and causal staff.
                  </div>
                </div>
              </div>
            </div>

             {/* B. Innovative Row 1: Weather Forecaster & One-Touch Task Dispatcher */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Innovation 1: Weather demand forecaster */}
              <div className="tabkey-glass-card tabkey-shine-blue flex flex-col justify-between overflow-hidden text-left shadow-lg">
                <div>
                  {/* Header Box with Light Background */}
                  <div className="bg-indigo-50/20 dark:bg-white/5 p-3.5 border-b border-indigo-100/30 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 select-none">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/40 rounded-xl text-indigo-750 dark:text-indigo-400">
                        <CloudSun className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold font-display text-base text-indigo-950 dark:text-slate-100 leading-none">🌦️ Roster Weather Forecaster</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-display mt-1">Real-time meteorological demand models</p>
                      </div>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-[#12131a]/80 p-1 border border-indigo-100/10 rounded-xl text-[9px] font-bold font-display gap-1 shrink-0 self-stretch sm:self-auto justify-around">
                      {[
                        { label: "Sunny", icon: "☀️", color: "text-amber-500" },
                        { label: "Rainy", icon: "🌧️", color: "text-blue-500" },
                        { label: "Heatwave", icon: "🔥", color: "text-orange-500" },
                        { label: "Cold", icon: "❄️", color: "text-cyan-500" }
                      ].map(w => (
                        <button 
                          key={w.label}
                          onClick={() => setWeatherMock(w.label)}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                            weatherMock === w.label 
                              ? 'bg-white dark:bg-[#12131a] text-indigo-650 dark:text-indigo-400 shadow-sm border border-indigo-100/20' 
                              : 'bg-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                          }`}
                        >
                          <span className={w.color}>{w.icon}</span>
                          <span>{w.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Metric 1: Forecast Multiplier */}
                      <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/20 dark:from-white/5 dark:to-white/0 rounded-2xl p-3 border border-slate-100 dark:border-white/5 flex items-center gap-2.5">
                        <div className="p-2 bg-blue-100/50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-none">Sales Multiplier</p>
                          <p className="text-xl font-black font-display text-slate-800 dark:text-slate-200 mt-1">{(salesMultiplier * 100).toFixed(0)}%</p>
                        </div>
                      </div>

                      {/* Metric 2: Revenue Target */}
                      <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/20 dark:from-white/5 dark:to-white/0 rounded-2xl p-3 border border-slate-100 dark:border-white/5 flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-100/50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-none">Revenue Target</p>
                          <p className="text-xl font-black font-display text-emerald-600 mt-1">${totalWeeklySalesForecast.toFixed(0)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Immersive CSS-Animated Live Weather Canvas */}
                    <div className="mt-3">
                      <WeatherLiveCanvas weather={weatherMock} />
                    </div>

                    {/* Meteorological Advice Box */}
                    <div className="mt-3 p-3 rounded-2xl bg-indigo-50/40 dark:bg-white/5 border border-indigo-150/30 text-xs font-bold text-indigo-905 dark:text-indigo-305 flex items-start gap-3">
                      <div className="text-2xl shrink-0 mt-0.5 select-none">
                        {weatherMock === 'Sunny' && "☀️"}
                        {weatherMock === 'Rainy' && "🌧️"}
                        {weatherMock === 'Heatwave' && "🔥"}
                        {weatherMock === 'Cold' && "❄️"}
                      </div>
                      <div className="leading-relaxed">
                        {weatherMock === 'Rainy' && (
                          <p>🌦️ **Meteorological Warning:** Rain triggers convenience store rushes. Expected **+25% sales** spike for hot items. Roster backup shifts.</p>
                        )}
                        {weatherMock === 'Sunny' && (
                          <p>☀️ **Optimal Conditions:** High outdoor foot traffic. Base sales forecasts up **+15%**. Current roster slots are perfectly optimized.</p>
                        )}
                        {weatherMock === 'Heatwave' && (
                          <p>🔥 **Heat Warning:** Extreme temperatures drop overall customer visits. **Trim 2 open shifts** to secure profit margin dials.</p>
                        )}
                        {weatherMock === 'Cold' && (
                          <p>❄️ **Stable Winter Forecast:** Morning traffic expected to spike. **+10% coffee targets**. Ensure early openers are checked-in.</p>
                        )}
                      </div>
                    </div>

                    {/* Fine-Tuning Controls Row */}
                    <div className="flex gap-2 select-none border-t border-[#e2e8f0] dark:border-[#1f212e]/60 pt-2.5 mt-3">
                      <button 
                        type="button"
                        onClick={async () => {
                          const { value: val } = await Swal.fire({
                            title: '📝 Set Base Sales Target',
                            text: 'Enter base sales target before weather weighting:',
                            input: 'number',
                            inputValue: manualSalesForecast,
                            showCancelButton: true,
                            confirmButtonColor: '#4F46E5',
                            inputValidator: (value) => {
                              if (!value || isNaN(value) || parseFloat(value) <= 0) {
                                return 'Please enter a valid positive number!';
                              }
                            }
                          });
                          if (val) {
                            setManualSalesForecast(parseFloat(val));
                            Swal.fire({
                              icon: 'success',
                              title: 'Base Sales Target Set!',
                              text: `Target updated to $${parseFloat(val).toLocaleString()}`,
                              timer: 2000,
                              showConfirmButton: false
                            });
                          }
                        }}
                        className="flex-grow py-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-350 border border-slate-200/50 dark:border-white/10 rounded-xl text-[9px] font-bold font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                      >
                        <Sliders className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>Sales Forecast</span>
                      </button>

                      <button 
                        type="button"
                        onClick={async () => {
                          const { value: val } = await Swal.fire({
                            title: '💰 Set Weekly Labor Budget',
                            text: 'Enter weekly labor budget spend limit:',
                            input: 'number',
                            inputValue: budgetTarget,
                            showCancelButton: true,
                            confirmButtonColor: '#4F46E5',
                            inputValidator: (value) => {
                              if (!value || isNaN(value) || parseFloat(value) <= 0) {
                                return 'Please enter a valid positive number!';
                              }
                            }
                          });
                          if (val) {
                            setBudgetTarget(parseFloat(val));
                            Swal.fire({
                              icon: 'success',
                              title: 'Weekly Labor Budget Set!',
                              text: `Budget updated to $${parseFloat(val).toLocaleString()}`,
                              timer: 2000,
                              showConfirmButton: false
                            });
                          }
                        }}
                        className="flex-grow py-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-350 border border-slate-200/50 dark:border-white/10 rounded-xl text-[9px] font-bold font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                      >
                        <DollarSign className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>Labor Budget</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 pt-0 border-t border-slate-100 dark:border-white/5 flex justify-between gap-2 mt-1.5">
                  {weatherMock === 'Heatwave' ? (
                    <button 
                      onClick={() => { setBudgetTarget(4000); alert("Labour target trimmed to $4000 to defend profit margins."); }}
                      className="flex-grow py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold font-display text-[9px] uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 animate-pulse"
                    >
                      <Trash2 className="w-4 h-4" /> Trim Labor Target to $4,000
                    </button>
                  ) : (
                    <button 
                      onClick={triggerMagicBlanks}
                      className="flex-grow py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-[9px] uppercase tracking-wider shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <Zap className="w-4 h-4 animate-pulse" /> Auto-optimize for {weatherMock} weather
                    </button>
                  )}
                </div>
              </div>

              {/* Unified Task Command Center */}
              <div className="tabkey-glass-card tabkey-shine-orange p-3.5 shadow-lg flex flex-col justify-between text-left lg:col-span-1 select-none">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-orange-50 dark:bg-orange-950/40 rounded-xl text-orange-600 dark:text-orange-400">
                      <CheckSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold font-display text-base text-slate-855 dark:text-slate-100 leading-none">📋 Unified Task Command Center</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1">Manage manual dispatches & automatic shift templates</p>
                    </div>
                  </div>

                  {/* Tab Switcher */}
                  <div className="bg-slate-100 dark:bg-[#090a0f] p-1 border border-slate-200/50 dark:border-white/5 rounded-xl grid grid-cols-3 text-center text-[9px] font-bold font-display uppercase tracking-wider select-none mb-3.5">
                    <button 
                      type="button"
                      onClick={() => setTaskTab('dispatch')}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        taskTab === 'dispatch' ? 'bg-white dark:bg-[#12131a] text-slate-850 dark:text-slate-100 shadow-sm border border-indigo-100/10' : 'text-slate-400 dark:text-slate-500 hover:text-slate-650'
                      }`}
                    >
                      ⚡ Dispatch
                    </button>
                    <button 
                      type="button"
                      onClick={() => setTaskTab('opening')}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        taskTab === 'opening' ? 'bg-white dark:bg-[#12131a] text-slate-850 dark:text-slate-100 shadow-sm border border-indigo-100/10' : 'text-slate-400 dark:text-slate-500 hover:text-slate-650'
                      }`}
                    >
                      🌅 Opening
                    </button>
                    <button 
                      type="button"
                      onClick={() => setTaskTab('closing')}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        taskTab === 'closing' ? 'bg-white dark:bg-[#12131a] text-slate-850 dark:text-slate-100 shadow-sm border border-indigo-100/10' : 'text-slate-400 dark:text-slate-500 hover:text-slate-650'
                      }`}
                    >
                      🔐 Closing
                    </button>
                  </div>

                  {/* Tab 1: Dispatch (Manual Task Dispatcher) */}
                  {taskTab === 'dispatch' && (
                    <form onSubmit={handleDispatchQuickTask} className="space-y-3.5 text-xs">
                      {/* Selector for assignment type */}
                      <div className="bg-slate-50 dark:bg-white/5 p-1 border border-slate-200/50 dark:border-white/5 rounded-xl grid grid-cols-2 text-center text-[9px] font-bold font-display uppercase tracking-wider select-none">
                        <button 
                          type="button"
                          onClick={() => setTaskAssignType('person')}
                          className={`py-1 rounded-md transition-all cursor-pointer ${
                            taskAssignType === 'person' ? 'bg-white dark:bg-[#12131a] text-slate-850 dark:text-slate-100 shadow-sm border border-indigo-100/10' : 'text-slate-400 dark:text-slate-500 hover:text-slate-650'
                          }`}
                        >
                          👤 Staff Member
                        </button>
                        <button 
                          type="button"
                          onClick={() => setTaskAssignType('shift')}
                          className={`py-1 rounded-md transition-all cursor-pointer ${
                            taskAssignType === 'shift' ? 'bg-white dark:bg-[#12131a] text-slate-850 dark:text-slate-100 shadow-sm border border-indigo-100/10' : 'text-slate-400 dark:text-slate-500 hover:text-slate-650'
                          }`}
                        >
                          ⏱️ Active Shift
                        </button>
                      </div>

                      {/* Task Title Input */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">Task Description</label>
                        <input 
                          type="text"
                          placeholder="e.g. wipe ovens, verify tills..."
                          required
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Assignee select box based on mode */}
                      {taskAssignType === 'person' ? (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">Choose Employee</label>
                          <select 
                            value={taskAssignee}
                            onChange={(e) => setTaskAssignee(e.target.value)}
                            required
                            className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none"
                          >
                            <option value="">Select staff...</option>
                            {profiles.filter(p => p.role !== 'manager').map(p => (
                              <option key={p.id} value={p.id}>{p.full_name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">Choose Today's Shift</label>
                          <select 
                            value={taskShiftId}
                            onChange={(e) => setTaskShiftId(e.target.value)}
                            required
                            className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none"
                          >
                            <option value="">Select shift...</option>
                            {weekShifts.filter(s => s.user_id !== 'open').map(s => {
                              const empName = profiles.find(p => p.id === s.user_id)?.full_name || "Employee";
                              return (
                                <option key={s.id} value={s.id}>
                                  {s.shift_date} ({s.start_time} - {s.end_time}) • {empName}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      <button 
                        type="submit"
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Dispatch Custom Task</span>
                      </button>
                    </form>
                  )}

                  {/* Tab 2: Opening Shift Automatic Templates */}
                  {taskTab === 'opening' && (
                    <div className="space-y-3 text-xs text-left">
                      <p className="text-[10px] font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 leading-none">🌅 Opening Shift Templates</p>
                      
                      {/* List of items */}
                      <div className="space-y-2 max-h-[140px] overflow-y-auto premium-scrollbar pr-1">
                        {openingTemplates.map((t, idx) => (
                          <div key={idx} className="bg-slate-50 dark:bg-white/5 p-2 px-2.5 rounded-xl border border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-755 dark:text-slate-300">
                            <span className="line-clamp-2 leading-tight">{t}</span>
                            <button 
                              onClick={() => handleRemoveTemplateItem('opening', idx)}
                              className="text-rose-500 hover:text-rose-700 transition-all shrink-0 cursor-pointer p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add new input */}
                      <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                        <input 
                          type="text"
                          placeholder="e.g. prep bakery showcase..."
                          value={newTemplateItem}
                          onChange={(e) => setNewTemplateItem(e.target.value)}
                          className="flex-grow bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-350 focus:outline-none"
                        />
                        <button 
                          onClick={() => handleAddTemplateItem('opening')}
                          className="px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold font-display text-[9px] uppercase tracking-wider cursor-pointer select-none active:scale-95 transition-all"
                        >
                          + Add
                        </button>
                      </div>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                        ℹ️ Seeding active: Any shift scheduled starting before 10:00 AM automatically receives these tasks at homepage load.
                      </p>
                    </div>
                  )}

                  {/* Tab 3: Closing Shift Automatic Templates */}
                  {taskTab === 'closing' && (
                    <div className="space-y-3 text-xs text-left">
                      <p className="text-[10px] font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 leading-none">🔐 Closing Shift Templates</p>
                      
                      {/* List of items */}
                      <div className="space-y-2 max-h-[140px] overflow-y-auto premium-scrollbar pr-1">
                        {closingTemplates.map((t, idx) => (
                          <div key={idx} className="bg-slate-50 dark:bg-white/5 p-2 px-2.5 rounded-xl border border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-755 dark:text-slate-300">
                            <span className="line-clamp-2 leading-tight">{t}</span>
                            <button 
                              onClick={() => handleRemoveTemplateItem('closing', idx)}
                              className="text-rose-500 hover:text-rose-700 transition-all shrink-0 cursor-pointer p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add new input */}
                      <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                        <input 
                          type="text"
                          placeholder="e.g. secure main entrance..."
                          value={newTemplateItem}
                          onChange={(e) => setNewTemplateItem(e.target.value)}
                          className="flex-grow bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-350 focus:outline-none"
                        />
                        <button 
                          onClick={() => handleAddTemplateItem('closing')}
                          className="px-3 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl font-bold font-display text-[9px] uppercase tracking-wider cursor-pointer select-none active:scale-95 transition-all"
                        >
                          + Add
                        </button>
                      </div>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                        ℹ️ Seeding active: Any shift scheduled ending at or after 6:00 PM (18:00) automatically receives these tasks at homepage load.
                      </p>
                    </div>
                  )}

                  {/* TabKey Time-wise Preset Shortcuts */}
                  {taskTab === 'dispatch' && (
                    <div className="mt-3.5 pt-3 border-t border-[#e2e8f0] dark:border-[#1f212e] space-y-2">
                      <p className="text-[9px] font-bold font-display uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none ml-1">⚡ 1-Click Time-wise Presets</p>
                      
                      <div className="grid grid-cols-3 gap-1.5 select-none pt-1">
                        <button 
                          type="button"
                          onClick={() => handleDispatchTimePreset('morning')}
                          className="p-2 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-100/40 rounded-xl text-[8px] font-bold font-display text-amber-700 dark:text-amber-450 flex flex-col items-center justify-center text-center gap-1 cursor-pointer transition-all active:scale-[0.96]"
                          title="Assign Morning Opening Bake tasks"
                        >
                          <span>🌅</span>
                          <span>Morning</span>
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => handleDispatchTimePreset('midday')}
                          className="p-2 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-indigo-100/40 rounded-xl text-[8px] font-bold font-display text-indigo-700 dark:text-indigo-450 flex flex-col items-center justify-center text-center gap-1 cursor-pointer transition-all active:scale-[0.96]"
                          title="Assign Mid-day Clean & Coffee tasks"
                        >
                          <span>☕</span>
                          <span>Midday</span>
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => handleDispatchTimePreset('evening')}
                          className="p-2 bg-[#090a0f] dark:bg-white/5 hover:bg-black dark:hover:bg-white/10 border border-slate-800 dark:border-white/10 rounded-xl text-[8px] font-bold font-display text-white dark:text-slate-300 flex flex-col items-center justify-center text-center gap-1 cursor-pointer transition-all active:scale-[0.96]"
                          title="Assign Evening Closeout Security tasks"
                        >
                          <span>🔐</span>
                          <span>Evening</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3.5 p-2 bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl text-[8px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                  🚀 Dispatched tasks sync instantly to the employees' active checklists.
                </div>
              </div>

            </div>

            {/* C. Innovative Row 2: Late Alerts (with WhatsApp pre-fills), Burnout Radar & Upcoming Birthdays */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Innovation 3: Sentiment & Fatigue Burnout Radar */}
              <div className="tabkey-glass-card flex flex-col justify-between overflow-hidden text-left shadow-lg">
                <div>
                  {/* Header Box with Light Background */}
                  <div className="bg-indigo-50/20 dark:bg-white/5 p-5 border-b border-indigo-100/30 dark:border-white/5 flex items-center gap-3 select-none">
                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/40 rounded-xl text-indigo-750 dark:text-indigo-400">
                      <Brain className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold font-display text-base text-indigo-950 dark:text-slate-100 leading-none">🧠 Employee Fatigue Radar</h4>
                      <p className="text-[10px] text-indigo-650 font-bold font-display mt-1">AI monitors employee rest periods & stress risks</p>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1.5 premium-scrollbar">
                      {profiles.filter(p => p.role !== 'manager').map(p => {
                        // Compute fatigue scores dynamically based on scheduled hours and gaps
                        const userShifts = weekShifts.filter(s => s.user_id === p.id);
                        const consecutiveDays = userShifts.length;
                        let fatigue = 20 + (consecutiveDays * 12);
                        
                        // Bella has contracted hours warning, David works 38h, Charlie trainees
                        if (p.id === 'p-bella') fatigue += 28; // Overpart time contracted stress
                        if (p.id === 'p-david') fatigue += 15;
                        
                        const riskColor = fatigue > 80 ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30' : fatigue > 50 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30';

                        return (
                          <div 
                            key={p.id}
                            onClick={() => setSelectedFatigueEmp(p)}
                            className="flex justify-between items-center bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-indigo-50/30 dark:hover:bg-white/5 border border-slate-150/70 dark:border-white/5 rounded-2xl p-3 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all select-none active:scale-[0.98] shadow-2xs"
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                style={{ backgroundColor: p.color || '#4F46E5' }}
                                className="w-8 h-8 rounded-full text-white font-bold font-display text-xs uppercase flex items-center justify-center shadow-sm shrink-0"
                              >
                                {p.full_name[0]}
                              </div>
                              <div>
                                <p className="text-xs font-bold font-display text-slate-800 dark:text-slate-200 leading-none">{p.full_name}</p>
                                <p className="text-[9px] font-bold text-slate-400 mt-1.5">{consecutiveDays} shifts scheduled</p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className={`px-2.5 py-1 rounded-xl text-[9px] font-bold font-display border uppercase tracking-wider ${riskColor}`}>
                                {fatigue}% Stress
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {selectedFatigueEmp && (
                  <div className="mx-6 mb-6 p-3 bg-[#090a0f] dark:bg-[#090a0f] text-white rounded-xl text-[10px] font-bold relative overflow-hidden animate-fade-in shrink-0">
                    <button 
                      onClick={() => setSelectedFatigueEmp(null)}
                      className="absolute right-2 top-2 p-1 hover:bg-slate-800 rounded-md text-slate-400 dark:text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-indigo-400 font-bold font-display uppercase tracking-wider">Radar Recommendation:</p>
                    <p className="mt-1">
                      {selectedFatigueEmp.full_name} is showing high stress thresholds. 
                      {selectedFatigueEmp.id === 'p-bella' ? ' She exceeds her Part-time contracted limit of 25 hours.' : ' Back-to-back shifts scheduled.'}
                      We recommend using "Shift Swaps" to redistribute a shift.
                    </p>
                  </div>
                )}
              </div>

              {/* Late Alerts with working prefilled WhatsApp links */}
              <div className="tabkey-glass-card p-6 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 select-none">
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-455">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold font-display text-sm text-slate-805 dark:text-slate-205 leading-none">⚠️ Late Alerts Panel</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1">Real-time tardiness detection (WhatsApp link active)</p>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1.5 premium-scrollbar">
                    {/* Simulated late staff seed if list is empty to show how it functions */}
                    {lateStaffList.length === 0 ? (
                      <div className="p-8 border border-dashed border-[#e2e8f0] dark:border-[#1f212e] rounded-xl text-center text-slate-400 dark:text-slate-500 text-xs font-bold leading-relaxed">
                        🟢 All active staff are currently on schedule! No late alerts detected today.
                      </div>
                    ) : (
                      lateStaffList.map(item => {
                        const phone = item.employee?.phone || "0400000000";
                        const name = item.employee?.full_name || "Staff";
                        const whatsappUrl = `https://wa.me/${phone.replace(/\s+/g, '')}?text=Hey%20${encodeURIComponent(name)},%20just%20checking%20in%20on%20your%2520scheduled%20TabKey%20shift%20today!%20Hope%20everything%20is%20alright.`;

                        return (
                          <div key={item.shift.id} className="flex justify-between items-center bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl p-3 hover:scale-[1.01] transition-all shadow-2xs">
                            <div className="flex items-center gap-3">
                              <div 
                                style={{ backgroundColor: item.employee?.color || '#EF4444' }}
                                className="w-8 h-8 rounded-full text-white font-bold font-display text-xs uppercase flex items-center justify-center shadow-sm shrink-0"
                              >
                                {name[0]}
                              </div>
                              <div>
                                <p className="text-xs font-bold font-display text-slate-800 dark:text-slate-200 leading-none">{name}</p>
                                <p className="text-[9px] font-black text-rose-600 mt-1.5">{item.minsLate} mins late today</p>
                              </div>
                            </div>
                            
                            <a 
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-[9px] font-bold font-display uppercase tracking-wider transition-all select-none active:scale-95 text-center flex items-center gap-1.5 shrink-0 shadow-sm shadow-emerald-600/10"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                            </a>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                  📲 Pre-filled templates launch active WhatsApp web interfaces directly with employee numbers.
                </div>
              </div>

              {/* Birthday Alerts Card */}
              <div className="tabkey-glass-card p-6 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 select-none">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-655 dark:text-indigo-400">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold font-display text-sm text-slate-805 dark:text-slate-205 leading-none">🎂 Birthday Alerts</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1">Upcoming staff birthdays in the next 7 days</p>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1.5 premium-scrollbar">
                    {upcomingBirthdays.length === 0 ? (
                      <div className="space-y-3">
                        {/* Seeded example for Alex Mercer */}
                        <div className="flex justify-between items-center bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-indigo-50/30 dark:hover:bg-white/5 border border-slate-150/70 dark:border-white/5 rounded-2xl p-3 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all shadow-2xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500 text-white font-bold font-display text-xs uppercase flex items-center justify-center shadow-sm shrink-0">A</div>
                            <div>
                              <p className="text-xs font-bold font-display text-slate-800 dark:text-slate-200 leading-none">Alex Mercer</p>
                              <p className="text-[9px] font-black text-indigo-650 dark:text-indigo-400 mt-1.5">Birthday in 5 days (May 28)</p>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => { setBirthdayEmployee(profiles[1]); setShowBirthdayModal(true); }}
                            className="bg-indigo-650 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-[9px] font-bold font-display uppercase tracking-wider transition-all select-none active:scale-95 shrink-0 shadow-sm"
                          >
                            Send Greeting
                          </button>
                        </div>
                        <div className="p-4 border border-dashed border-[#e2e8f0] dark:border-[#1f212e] rounded-xl text-center text-slate-400 dark:text-slate-500 text-[10px] font-bold">
                          Automatic date matching active on database profiles
                        </div>
                      </div>
                    ) : (
                      upcomingBirthdays.map(item => (
                        <div key={item.employee.id} className="flex justify-between items-center bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-indigo-50/30 dark:hover:bg-white/5 border border-slate-150/70 dark:border-white/5 rounded-2xl p-3 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all shadow-2xs">
                          <div className="flex items-center gap-3">
                            <div 
                              style={{ backgroundColor: item.employee.color || '#4F46E5' }}
                              className="w-8 h-8 rounded-full text-white font-bold font-display text-xs uppercase flex items-center justify-center shadow-sm shrink-0"
                            >
                              {item.employee.full_name[0]}
                            </div>
                            <div>
                              <p className="text-xs font-bold font-display text-slate-800 dark:text-slate-200 leading-none">{item.employee.full_name}</p>
                              <p className="text-[9px] font-black text-indigo-655 mt-1.5">Birthday in {item.daysRemaining} days ({item.employee.dob.split('-').slice(1).reverse().join('/')})</p>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => { setBirthdayEmployee(item.employee); setShowBirthdayModal(true); }}
                            className="bg-indigo-650 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-[9px] font-bold font-display uppercase tracking-wider transition-all select-none active:scale-95 shrink-0 shadow-sm"
                          >
                            Send Greeting
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="mt-4 p-3 bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                  🌀 Birthday triggers render branded HTML cards with special TabKey discounts and greetings.
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 2. ROSTER GRID TAB (COMPLIANCE ENHANCED) */}
        {managerTab === 'roster' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] p-5 rounded-xl shadow-sm select-none shrink-0">
              <div className="flex items-center gap-4">
                {/* nav arrows */}
                <div className="flex items-center bg-[#f8fafc] dark:bg-[#090a0f] border border-slate-200/50 dark:border-white/10 rounded-xl p-1 shadow-inner">
                  <button 
                    onClick={() => setWeekOffset(prev => prev - 1)}
                    className="p-2 hover:bg-white dark:hover:bg-[#12131a] hover:shadow-sm text-slate-500 dark:text-slate-400 rounded-lg active:scale-95 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="px-4 text-xs font-bold font-display text-slate-700 dark:text-slate-300 min-w-[140px] text-center select-none">
                    {weekDisplay}
                  </div>
                  <button 
                    onClick={() => setWeekOffset(prev => prev + 1)}
                    className="p-2 hover:bg-white dark:hover:bg-[#12131a] hover:shadow-sm text-slate-500 dark:text-slate-400 rounded-lg active:scale-95 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {/* Stats highlights */}
                <div className="hidden lg:flex gap-2.5 border-l border-slate-100 dark:border-white/5 pl-4 select-none">
                  {/* Card 1: Labor Spend */}
                  <div className="bg-slate-50/50 dark:bg-white/5 border border-slate-100/70 dark:border-white/5 rounded-xl px-3 py-1.5 flex flex-col justify-center min-w-[95px] shadow-sm transition-all duration-300 hover:shadow-md">
                    <span className="text-[7px] block font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest leading-none">Labor Spend</span>
                    <span className="text-xs font-black font-display text-slate-885 dark:text-slate-200 mt-1 leading-none">${totalLaborSpend.toFixed(2)}</span>
                  </div>
                  
                  {/* Card 2: Remaining Balance */}
                  <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/30 dark:border-emerald-900/10 rounded-xl px-3 py-1.5 flex flex-col justify-center min-w-[95px] shadow-sm transition-all duration-300 hover:shadow-md">
                    <span className="text-[7px] block font-extrabold text-emerald-650 dark:text-emerald-500 uppercase tracking-widest leading-none">Remaining</span>
                    <span className={`text-xs font-black font-display mt-1 leading-none ${(budgetTarget - totalLaborSpend) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {(budgetTarget - totalLaborSpend) >= 0 
                        ? `$${(budgetTarget - totalLaborSpend).toFixed(2)}` 
                        : `-$${Math.abs(budgetTarget - totalLaborSpend).toFixed(2)}`}
                    </span>
                  </div>
                  
                  {/* Card 3: Rostered Hours */}
                  <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-900/10 rounded-xl px-3 py-1.5 flex flex-col justify-center min-w-[95px] shadow-sm transition-all duration-300 hover:shadow-md">
                    <span className="text-[7px] block font-extrabold text-indigo-650 dark:text-indigo-500 uppercase tracking-widest leading-none">Rostered Hrs</span>
                    <span className="text-xs font-black font-display text-indigo-600 dark:text-indigo-400 mt-1 leading-none">{totalScheduledHours.toFixed(1)}h</span>
                  </div>
                  
                  {/* Card 4: Award Breaches */}
                  <div className={`border rounded-xl px-3 py-1.5 flex flex-col justify-center min-w-[95px] shadow-sm transition-all duration-300 hover:shadow-md ${
                    criticalCount > 0 
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/20' 
                      : 'bg-slate-50/50 dark:bg-white/5 border-slate-100 dark:border-white/5'
                  }`}>
                    <span className={`text-[7px] block font-extrabold uppercase tracking-widest leading-none ${
                      criticalCount > 0 ? 'text-rose-650 dark:text-rose-455' : 'text-slate-400 dark:text-slate-500'
                    }`}>Breaches</span>
                    <span className={`text-xs font-black font-display mt-1 leading-none ${
                      criticalCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                    }`}>{criticalCount}</span>
                  </div>
                </div>
              </div>

              {/* actions */}
              <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                <button 
                  onClick={triggerMagicBlanks}
                  className="flex-grow xl:flex-grow-0 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl text-xs font-bold font-display uppercase tracking-wider shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Auto-fill 4 shifts per day utilizing cost-optimization algorithms"
                >
                  <Zap className="w-3.5 h-3.5 animate-pulse" />
                  <span>Magic Blanks</span>
                </button>

                <button 
                  onClick={triggerCopyWeek}
                  className="flex-grow xl:flex-grow-0 bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-slate-100 dark:bg-[#090a0f] text-slate-600 dark:text-slate-400 dark:text-slate-500 px-4 py-3 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Week</span>
                </button>

                <button 
                  onClick={triggerClearWeek}
                  className="flex-grow xl:flex-grow-0 bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-3 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Week</span>
                </button>

                <button 
                  onClick={triggerPublish}
                  className="flex-grow xl:flex-grow-0 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl text-xs font-bold font-display uppercase tracking-wider shadow-md shadow-emerald-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Roster</span>
                </button>

                <button 
                  onClick={() => window.print()}
                  className="flex-grow xl:flex-grow-0 bg-slate-100 dark:bg-[#090a0f] hover:bg-slate-200 text-slate-700 dark:text-slate-300 p-3 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                  title="Print Roster (violations hidden)"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mon-Sun Grid Grid Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 min-h-[500px]">
              {weekDates.map((dateStr, i) => {
                const dayName = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i];
                const displayDate = dateStr.split('-').slice(1).reverse().join('/');
                const isHoliday = dateStr === weekDates[3]; // Thursday holiday highlighting
                
                const dayShifts = weekShifts.filter(s => s.shift_date === dateStr).sort((a, b) => a.start_time.localeCompare(b.start_time));

                return (
                  <div key={dateStr} className="flex flex-col bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e]/60 rounded-xl overflow-hidden h-full shadow-sm">
                    <div className={`p-4 text-center border-b border-[#e2e8f0] dark:border-[#1f212e]/60 shrink-0 ${
                      isHoliday ? 'bg-purple-100/50' : 
                      i === 5 ? 'bg-blue-50' : 
                      i === 6 ? 'bg-amber-50/70' : 'bg-white dark:bg-[#12131a]'
                    }`}>
                      <h4 className="font-bold font-display text-slate-800 dark:text-slate-200 text-sm flex items-center justify-center gap-1.5 leading-none">
                        <span>{dayName}</span>
                        {isHoliday && (
                          <span className="text-[8px] font-bold font-display uppercase tracking-widest bg-purple-200 text-purple-800 px-2 py-0.5 rounded shadow-sm">Holiday</span>
                        )}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{displayDate}</p>
                    </div>

                    <div className="flex-grow p-3 space-y-3 overflow-y-auto tabkey-smooth-scroll min-h-0">
                      {dayShifts.map(shift => {
                        const isAssigned = shift.user_id !== 'open';
                        const emp = isAssigned ? profiles.find(p => p.id === shift.user_id) : null;
                        const metrics = calculateShiftMetrics(shift, weekShifts, true, emp);
                        const isPublished = shift.status === 'published';
                        const isOnLeave = isAssigned && checkLeaveConflict(shift.user_id, dateStr, leaveRequests);
                        const isOverridden = !!complianceOverrides[shift.id];

                        let badgeColor = 'bg-slate-100 dark:bg-[#090a0f] text-slate-600 dark:text-slate-400 dark:text-slate-500';
                        if (isAssigned) {
                          const hour = shift.start_time ? parseInt(shift.start_time.split(':')[0]) : 0;
                          if (hour < 11) badgeColor = 'bg-amber-100 text-amber-800'; 
                          else if (hour < 15) badgeColor = 'bg-indigo-100 text-indigo-800'; 
                          else badgeColor = 'bg-pink-100 text-pink-800';
                        }

                        return (
                          <div 
                            key={shift.id} 
                            onClick={() => { setEditingShift(shift); setShowEditModal(true); }}
                            className={`bg-white dark:bg-[#12131a] border rounded-xl p-3.5 transition-all cursor-pointer select-none active:scale-[0.98] ${
                              isAssigned ? (isOnLeave ? 'border-rose-400 shadow-md ring-2 ring-rose-100' : 'border-[#e2e8f0] dark:border-[#1f212e] shadow-sm hover:shadow-md hover:border-indigo-400') : 'border-dashed border-slate-300 hover:border-indigo-400 bg-[#f8fafc] dark:bg-[#090a0f]/50'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-1">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold font-display tracking-wider leading-none ${badgeColor}`}>
                                  {shift.start_time} - {shift.end_time}
                                </span>
                                {isPublished ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Published" />
                                ) : (
                                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold italic">Draft</span>
                                )}
                              </div>
                              {metrics.violations.length > 0 && !isOverridden && (
                                <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                              )}
                            </div>

                            {isAssigned && emp ? (
                              <div className="flex items-start gap-2.5 mt-2">
                                <div 
                                  style={{ backgroundColor: emp.color || '#4F46E5' }}
                                  className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs uppercase shadow-inner shrink-0"
                                >
                                  {emp.full_name[0]}
                                </div>
                                <div className="overflow-hidden flex-1">
                                  <p className="text-xs font-bold font-display text-slate-800 dark:text-slate-200 truncate leading-tight">{emp.full_name}</p>
                                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-450 mt-0.5">{metrics.paidDuration.toFixed(1)}h Paid</p>
                                  {metrics.unpaidBreakMins > 0 && (
                                    <span className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold font-display uppercase tracking-widest text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                      Break
                                    </span>
                                  )}
                                  {isOnLeave && (
                                    <span className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold font-display uppercase tracking-widest text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                      On Leave
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-2 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100 text-indigo-600">
                                <UserPlus className="w-4 h-4" />
                                <p className="text-[9px] font-bold font-display uppercase tracking-widest">Assign Staff</p>
                              </div>
                            )}

                            {metrics.violations.length > 0 && !isOverridden && (
                              <div className="mt-2 space-y-1">
                                {metrics.violations.map((v, index) => (
                                  <p key={index} className="text-[8px] font-bold text-rose-600 bg-rose-50 p-1.5 rounded-lg border border-rose-100 leading-tight">
                                    ⚠️ {v.replace('❌ ', '').replace('⚠️ ', '')}
                                  </p>
                                ))}
                              </div>
                            )}
                            
                            {isOverridden && (
                              <span className="mt-2 block text-[8px] font-bold font-display uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                Override Authorized
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Add shift trigger card */}
                      <button 
                        onClick={() => { setNewShift(prev => ({ ...prev, shift_date: dateStr })); setShowAddModal(true); }}
                        className="w-full py-4 border border-dashed border-[#e2e8f0] dark:border-[#1f212e] hover:border-indigo-400 hover:bg-[#f8fafc] dark:bg-[#090a0f] text-slate-400 dark:text-slate-500 hover:text-indigo-600 rounded-xl text-[10px] font-bold font-display uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Shift</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. TIMESHEET APPROVALS TAB */}
        {managerTab === 'time' && (
          <div className="space-y-6 animate-fade-in select-none">
            {/* Header controls redesigned */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] p-6 rounded-xl shadow-sm select-none shrink-0">
              <div className="border-l-4 border-indigo-600 pl-4 py-0.5">
                <h2 className="text-lg font-black font-display text-slate-900 dark:text-slate-100 tracking-tight leading-none">Timesheet Approvals</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">Review and authorize completed shifts before exporting payroll.</p>
              </div>
              <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                {/* Date range box navigator */}
                <div className="flex items-center gap-1.5 bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e]/50 rounded-xl p-1">
                  <button 
                    onClick={() => setWeekOffset(prev => prev - 1)}
                    className="p-2 hover:bg-white dark:bg-[#12131a] hover:shadow-sm text-slate-500 dark:text-slate-450 rounded-xl active:scale-95 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="px-4 py-1.5 text-xs font-bold font-display text-slate-700 dark:text-slate-300 min-w-[130px] text-center">
                    {weekDisplay}
                  </div>
                  <button 
                    onClick={() => setWeekOffset(prev => prev + 1)}
                    className="p-2 hover:bg-white dark:bg-[#12131a] hover:shadow-sm text-slate-500 dark:text-slate-450 rounded-xl active:scale-95 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button 
                  onClick={() => { setManualClockUser(profiles.filter(p => p.role !== 'manager')[0]?.id || ''); setManualClockDate(weekDates[0]); setShowManualClockModal(true); }}
                  className="bg-[#0052cc] hover:bg-[#004bb8] text-white px-4 py-2.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 font-bold font-display" />
                  <span>Add Missing</span>
                </button>
              </div>
            </div>

            {/* List of employee expandable timesheets */}
            <div className="space-y-4">
              {profiles.filter(p => p.role !== 'manager').map(emp => {
                const logs = timeLogs.filter(log => log.user_id === emp.id).sort((a, b) => b.clock_in.localeCompare(a.clock_in));
                // filter logs that fall in weekDates
                const weekLogsForEmp = logs.filter(log => {
                  const dStr = log.clock_in.split('T')[0];
                  return weekDates.includes(dStr);
                });

                let totalHrs = 0;
                weekLogsForEmp.forEach(log => {
                  const inTime = new Date(log.clock_in);
                  const outTime = log.clock_out ? new Date(log.clock_out) : null;
                  let rawDur = outTime ? (outTime - inTime) / (1000 * 60 * 60) : 0;
                  let breakMins = rawDur > autoBreakThreshold ? 30 : 0;
                  totalHrs += outTime ? rawDur - (breakMins / 60) : 0;
                });

                const pendingLogs = weekLogsForEmp.filter(l => !l.is_approved);
                const isExpanded = expandedEmps[emp.id];
                const initial = emp.full_name ? emp.full_name.charAt(0).toUpperCase() : '';

                return (
                  <div key={emp.id} className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 shadow-sm transition-all">
                    {/* Header of Employee timesheet card */}
                    <div className="flex justify-between items-center select-none">
                      <div className="flex items-center gap-3">
                        <div 
                          style={{ backgroundColor: emp.color || '#4F46E5' }}
                          className="w-11 h-11 rounded-full text-white flex items-center justify-center font-bold font-display text-sm uppercase shadow-sm shrink-0"
                        >
                          {initial}
                        </div>
                        <div>
                          <h4 className="font-bold font-display text-slate-800 dark:text-slate-200 text-sm leading-none text-left">{emp.full_name}</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1 text-left">
                            {weekLogsForEmp.length} SHIFT{weekLogsForEmp.length !== 1 ? 'S' : ''} THIS WEEK
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Right aligned metrics */}
                        <div className="text-right pr-2">
                          <p className="text-sm font-bold font-display text-slate-800 dark:text-slate-200 leading-none">
                            {totalHrs.toFixed(2)} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">hrs</span>
                          </p>
                          {pendingLogs.length > 0 ? (
                            <span className="inline-block text-[9px] font-bold font-display tracking-wider uppercase text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded-full mt-1">
                              {pendingLogs.length} PENDING
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] font-bold font-display tracking-wider uppercase text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded-full mt-1">
                              0 PENDING
                            </span>
                          )}
                        </div>

                        {/* Approve all button in header */}
                        {pendingLogs.length > 0 && (
                          <button 
                            onClick={() => handleApproveAllUserLogs(emp.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[10px] font-bold font-display uppercase tracking-widest cursor-pointer flex items-center gap-1 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve All
                          </button>
                        )}

                        {/* Expand chevron button */}
                        <button 
                          onClick={() => toggleEmpExpand(emp.id)}
                          className="p-2 border border-[#e2e8f0] dark:border-[#1f212e] text-slate-500 dark:text-slate-450 rounded-full hover:bg-[#f8fafc] dark:bg-[#090a0f] active:scale-90 transition-all cursor-pointer shrink-0"
                        >
                          {isExpanded ? <ChevronRight className="w-3.5 h-3.5 rotate-90 transition-all duration-300" /> : <ChevronRight className="w-3.5 h-3.5 rotate-0 transition-all duration-300" />}
                        </button>
                      </div>
                    </div>

                    {/* Detailed shift entries view (when expanded) */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[#e2e8f0] dark:border-[#1f212e] space-y-3">
                        {weekLogsForEmp.length === 0 ? (
                          <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-bold py-4">No clock entries recorded for this employee this week.</p>
                        ) : (
                          <div className="space-y-2.5">
                            {weekLogsForEmp.map(log => {
                              const inTime = new Date(log.clock_in);
                              const outTime = log.clock_out ? new Date(log.clock_out) : null;
                              
                              let rawDur = outTime ? (outTime - inTime) / (1000 * 60 * 60) : 0;
                              let breakMins = rawDur > autoBreakThreshold ? 30 : 0;
                              let paidHrs = outTime ? rawDur - (breakMins / 60) : 0;

                              const dayShort = inTime.toLocaleDateString('en-AU', { weekday: 'short' });
                              const dateShort = inTime.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });

                              // Format in 12-hour AM/PM with lowercase labels
                              const formatTimeAmPm = (date) => {
                                if (!date) return '';
                                let hours = date.getHours();
                                let minutes = date.getMinutes();
                                const ampm = hours >= 12 ? 'pm' : 'am';
                                hours = hours % 12;
                                hours = hours ? hours : 12;
                                const minStr = String(minutes).padStart(2, '0');
                                return `${hours}:${minStr} ${ampm}`;
                              };

                              return (
                                <div 
                                  key={log.id} 
                                  className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-[#f8fafc] dark:bg-[#090a0f] border rounded-xl transition-all ${
                                    log.is_approved ? 'border-[#e2e8f0] dark:border-[#1f212e] opacity-80' : 'border-amber-200 bg-amber-50/10'
                                  }`}
                                >
                                  {/* Left block - Date */}
                                  <div className="flex flex-col text-left min-w-[90px] mb-2 md:mb-0">
                                    <p className="text-xs font-bold font-display text-slate-800 dark:text-slate-200 leading-none">{dayShort}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1">{dateShort}</p>
                                  </div>

                                  {/* Clock details indicator column */}
                                  <div className="flex items-center gap-8 mb-2 md:mb-0">
                                    <div className="flex flex-col text-left">
                                      <span className="text-[8px] font-bold font-display uppercase tracking-widest text-emerald-600">In</span>
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{formatTimeAmPm(inTime)}</span>
                                    </div>
                                    <div className="flex flex-col text-left">
                                      <span className="text-[8px] font-bold font-display uppercase tracking-widest text-indigo-600">Out</span>
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                                        {outTime ? formatTimeAmPm(outTime) : 'Clocked In Now'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Duration display column */}
                                  <div className="flex flex-col text-left md:text-right min-w-[80px] mb-3 md:mb-0">
                                    <p className="text-xs font-bold font-display text-slate-800 dark:text-slate-200 leading-none">
                                      {paidHrs.toFixed(2)} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">hrs</span>
                                    </p>
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">
                                      {breakMins > 0 ? "Break deducted" : "(No break)"}
                                    </p>
                                  </div>

                                  {/* Action buttons matching screenshot */}
                                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                    {log.is_approved ? (
                                      <button 
                                        onClick={() => handleApproveLog(log.id, false)}
                                        className="border border-[#e2e8f0] dark:border-[#1f212e] hover:bg-[#f8fafc] dark:bg-[#090a0f] text-slate-500 dark:text-slate-450 hover:text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-wider cursor-pointer"
                                        title="Mark Pending"
                                      >
                                        Pending
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => handleApproveLog(log.id, true)}
                                        className="bg-[#0052cc] hover:bg-[#004bb8] text-white px-4 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-wider cursor-pointer"
                                      >
                                        Approve
                                      </button>
                                    )}

                                    <button 
                                      onClick={() => {
                                        setEditingTimesheet(log);
                                        setEditingTimesheetDate(log.clock_in.split('T')[0]);
                                        
                                        const dateObjIn = new Date(log.clock_in);
                                        const hhIn = String(dateObjIn.getHours()).padStart(2, '0');
                                        const mmIn = String(dateObjIn.getMinutes()).padStart(2, '0');
                                        setEditingTimesheetIn(`${hhIn}:${mmIn}`);

                                        if (log.clock_out) {
                                          const dateObjOut = new Date(log.clock_out);
                                          const hhOut = String(dateObjOut.getHours()).padStart(2, '0');
                                          const mmOut = String(dateObjOut.getMinutes()).padStart(2, '0');
                                          setEditingTimesheetOut(`${hhOut}:${mmOut}`);
                                        } else {
                                          setEditingTimesheetOut('');
                                        }
                                        setShowEditTimesheetModal(true);
                                      }}
                                      className="border border-[#e2e8f0] dark:border-[#1f212e] hover:bg-[#f8fafc] dark:bg-[#090a0f] text-slate-600 dark:text-slate-400 dark:text-slate-500 px-4 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-wider cursor-pointer"
                                    >
                                      Edit
                                    </button>

                                    <button 
                                      onClick={() => handleDeleteTimesheet(log.id)}
                                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2.5 rounded-xl transition-all cursor-pointer"
                                      title="Delete Entry"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. COMPLIANCE POLICY DOCUMENTS TAB */}
        {managerTab === 'docs' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] p-5 rounded-xl shadow-sm select-none shrink-0">
              <div className="border-l-4 border-emerald-500 pl-4 py-0.5">
                <h2 className="text-lg font-black font-display text-slate-900 dark:text-slate-100 tracking-tight leading-none">Compliance & Policies</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">Manage mandatory employee policy documents, track signature completion, and download audits</p>
              </div>
              <button 
                onClick={triggerDownloadCsvReport}
                className="bg-slate-800 hover:bg-[#090a0f] dark:bg-[#090a0f] text-white px-4 py-2.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Export CSV Audit</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Broadcast Policy Form */}
              <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-sm h-fit">
                <h3 className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight mb-4 flex items-center gap-2 border-l-4 border-indigo-600 pl-3 py-0.5">
                  <PlusCircle className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>Broadcast New Policy Document</span>
                </h3>
                
                <form onSubmit={handleCreateDoc} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Document Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. sanitiser guidelines..."
                      required
                      value={newDoc.title}
                      onChange={(e) => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Policy Content / Terms</label>
                    <textarea 
                      rows={5}
                      placeholder="Type details that staff must read and sign..."
                      required
                      value={newDoc.content}
                      onChange={(e) => setNewDoc(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-[#f8fafc] dark:bg-[#090a0f] p-4 rounded-xl border border-[#e2e8f0] dark:border-[#1f212e]">
                    <div>
                      <p className="text-[11px] font-bold font-display text-slate-800 dark:text-slate-200 leading-none">Mandatory Lockout</p>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Blocks employee portal until signed</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={newDoc.is_mandatory}
                      onChange={(e) => setNewDoc(prev => ({ ...prev, is_mandatory: e.target.checked }))}
                      className="accent-indigo-600 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-[10px] uppercase tracking-wider shadow-sm transition-all"
                  >
                    Broadcast & Lock Portals
                  </button>
                </form>
              </div>

              {/* Active Documents Listing */}
              <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-sm lg:col-span-2 space-y-6">
                <h3 className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight leading-none border-l-4 border-indigo-600 pl-3 py-0.5">Active Broadcasted Policies</h3>
                
                {documents.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-bold py-12">No active compliance policy documents broadcasted.</p>
                ) : (
                  <div className="space-y-4">
                    {documents.map(doc => {
                      const totalStaff = profiles.filter(p => p.role !== 'manager').length;
                      const signedStaffCount = signatures.filter(s => s.document_id === doc.id).length;
                      const progress = totalStaff > 0 ? (signedStaffCount / totalStaff) * 100 : 0;
                      const pendingStaff = profiles.filter(p => p.role !== 'manager' && !signatures.some(s => s.document_id === doc.id && s.user_id === p.id));

                      return (
                        <div key={doc.id} className="border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 bg-[#f8fafc] dark:bg-[#090a0f]/50 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <h4 className="font-bold font-display text-slate-800 dark:text-slate-200 text-sm leading-none flex items-center gap-1.5">
                                  <span>{doc.title}</span>
                                  {doc.is_mandatory && (
                                    <span className="text-[8px] font-bold font-display uppercase tracking-widest bg-rose-100 text-rose-700 px-2 py-0.5 rounded border border-rose-200">Mandatory</span>
                                  )}
                                </h4>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">Created: {new Date(doc.created_at).toLocaleDateString()}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button 
                                  onClick={() => { setEditingDoc({ ...doc }); setShowEditDocModal(true); }}
                                  className="p-1.5 hover:bg-indigo-50 text-slate-400 dark:text-slate-500 hover:text-indigo-600 rounded-lg transition-all cursor-pointer"
                                  title="Edit Document"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteDoc(doc.id)}
                                  className="p-1.5 hover:bg-rose-50 text-slate-400 dark:text-slate-500 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                                  title="Remove Document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-450 font-medium mt-3 bg-white dark:bg-[#12131a] p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1f212e] leading-relaxed max-h-[80px] overflow-y-auto pr-1">
                              {doc.content}
                            </p>
                          </div>

                          {/* Sign progress trackers */}
                          <div className="mt-4 pt-4 border-t border-[#e2e8f0] dark:border-[#1f212e]/60 select-none">
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="text-[10px] font-bold font-display uppercase text-indigo-600">Signature Completion</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-450 font-bold font-display">{signedStaffCount} of {totalStaff} signed ({progress.toFixed(0)}%)</span>
                            </div>
                            
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div style={{ width: `${progress}%` }} className="h-full bg-indigo-600" />
                            </div>

                            {pendingStaff.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                                <span className="text-[8px] font-bold font-display uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">Pending review:</span>
                                {pendingStaff.map(p => (
                                  <span key={p.id} className="text-[8px] font-bold font-display uppercase tracking-widest text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 animate-pulse">
                                    {p.full_name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* View printable Compliance Audit PDF log button */}
                            <button 
                              onClick={() => { setSelectedAuditDoc(doc); setShowAuditModal(true); }}
                              className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-100"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Generate Compliance Audit Log</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. SHIFT SWAP REQUESTS TAB */}
        {managerTab === 'swaps' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] p-5 rounded-xl shadow-sm select-none shrink-0 border-l-4 border-amber-500">
              <h2 className="text-lg font-black font-display text-slate-800 dark:text-slate-200 tracking-tight leading-none">Shift Swap Approvals</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">Review drop postings in the shift market and trade requests submitted by team members</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Drop shift listings (Roster Market) */}
              <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-200 tracking-tight leading-none mb-2">Pending Market Postings</h3>
                
                {swapRequests.filter(s => s.status === 'pending' && s.target_user_id === 'open').length === 0 ? (
                  <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-bold py-12">No active shifts listed in the employee market.</p>
                ) : (
                  <div className="space-y-3">
                    {swapRequests.filter(s => s.status === 'pending' && s.target_user_id === 'open').map(swap => {
                      const req = profiles.find(p => p.id === swap.requester_id);
                      const shift = shifts.find(s => s.id === swap.shift_id);
                      if (!shift) return null;

                      return (
                        <div key={swap.id} className="border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 bg-[#f8fafc] dark:bg-[#090a0f]/50 flex flex-col justify-between select-none">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-2">
                              <div 
                                style={{ backgroundColor: req?.color || '#4F46E5' }}
                                className="w-8 h-8 rounded-full text-white font-bold font-display text-xs uppercase flex items-center justify-center shrink-0"
                              >
                                {req?.full_name ? req.full_name[0] : '?'}
                              </div>
                              <div>
                                <h4 className="font-bold font-display text-slate-800 dark:text-slate-200 text-xs leading-none">{req?.full_name || 'Unknown Staff'} wants to Drop</h4>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">Role: {req?.type || 'N/A'}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] font-bold font-display uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
                                {shift.start_time} - {shift.end_time}
                              </span>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">{shift.shift_date.split('-').slice(1).reverse().join('/')}</p>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-[#e2e8f0] dark:border-[#1f212e]/50 flex justify-end gap-2">
                            <button 
                              onClick={() => handleSwapApproval(swap.id, false)}
                              className="px-3.5 py-1.5 hover:bg-slate-100 dark:bg-[#090a0f] text-slate-600 dark:text-slate-400 dark:text-slate-500 rounded-xl text-[10px] font-bold font-display uppercase tracking-wider cursor-pointer"
                            >
                              Reject
                            </button>
                            <button 
                              onClick={() => handleSwapApproval(swap.id, true)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold font-display uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-sm"
                            >
                              Approve Drop
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Staff Trade final approvals */}
              <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-200 tracking-tight leading-none mb-2">Final Swap Approvals</h3>
                
                {swapRequests.filter(s => s.status === 'pending' && s.target_user_id !== 'open').length === 0 ? (
                  <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-bold py-12">No employee trades waiting for manager validation.</p>
                ) : (
                  <div className="space-y-3">
                    {swapRequests.filter(s => s.status === 'pending' && s.target_user_id !== 'open').map(swap => {
                      const req = profiles.find(p => p.id === swap.requester_id);
                      const target = profiles.find(p => p.id === swap.target_user_id);
                      const shift = shifts.find(s => s.id === swap.shift_id);
                      if (!shift) return null;

                      return (
                        <div key={swap.id} className="border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 bg-[#f8fafc] dark:bg-[#090a0f]/50 flex flex-col justify-between select-none animate-pulse">
                          <div className="flex justify-between items-center gap-3 bg-white dark:bg-[#12131a] p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1f212e]">
                            <div>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold font-display uppercase">Requester</p>
                              <p className="text-xs font-bold font-display text-slate-800 dark:text-slate-200">{req?.full_name}</p>
                            </div>
                            <span className="text-slate-400 dark:text-slate-500 text-xs font-bold font-mono">➡</span>
                            <div>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold font-display uppercase text-right">Recipient Coverage</p>
                              <p className="text-xs font-bold font-display text-slate-800 dark:text-slate-200 text-right">{target?.full_name}</p>
                            </div>
                          </div>

                          <div className="flex justify-between items-baseline mt-3 text-xs">
                            <span className="font-bold text-slate-400 dark:text-slate-500">Date: {shift.shift_date.split('-').slice(1).reverse().join('/')}</span>
                            <span className="font-bold font-display text-indigo-600">{shift.start_time} - {shift.end_time}</span>
                          </div>

                          <div className="mt-4 pt-4 border-t border-[#e2e8f0] dark:border-[#1f212e]/50 flex justify-end gap-2">
                            <button 
                              onClick={() => handleSwapApproval(swap.id, false)}
                              className="px-3.5 py-1.5 hover:bg-slate-100 dark:bg-[#090a0f] text-slate-600 dark:text-slate-400 dark:text-slate-500 rounded-xl text-[10px] font-bold font-display uppercase tracking-wider cursor-pointer"
                            >
                              Decline Swap
                            </button>
                            <button 
                              onClick={() => handleSwapApproval(swap.id, true)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold font-display uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-sm"
                            >
                              Approve Trade
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 6. LEAVE REQUESTS TAB */}
        {managerTab === 'leave' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] p-5 rounded-xl shadow-sm select-none shrink-0 border-l-4 border-rose-500">
              <h2 className="text-lg font-black font-display text-slate-800 dark:text-slate-200 tracking-tight leading-none">Leave Requests</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">Review staff annual, sick, or personal leave requests. Approving will automatically clear scheduled grid shifts</p>
            </div>

            <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-200 tracking-tight leading-none mb-4">Pending Leave Applications</h3>
              
              {leaveRequests.filter(l => l.status === 'pending').length === 0 ? (
                <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-bold py-12">No pending leave requests found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
                  {leaveRequests.filter(l => l.status === 'pending').map(leave => {
                    const emp = profiles.find(p => p.id === leave.user_id);
                    
                    return (
                      <div key={leave.id} className="border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 bg-[#f8fafc] dark:bg-[#090a0f]/50 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-2">
                              <div 
                                style={{ backgroundColor: emp?.color || '#4F46E5' }}
                                className="w-8 h-8 rounded-full text-white font-bold font-display text-xs uppercase flex items-center justify-center shrink-0"
                              >
                                {emp?.full_name ? emp.full_name[0] : '?'}
                              </div>
                              <div>
                                <h4 className="font-bold font-display text-slate-800 dark:text-slate-200 text-xs leading-none">{emp?.full_name || 'Unknown Staff'}</h4>
                                <span className="mt-1 inline-block text-[8px] font-bold font-display uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{leave.leave_type}</span>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-xs font-bold font-display text-slate-800 dark:text-slate-200">
                                {leave.start_date.split('-').slice(1).reverse().join('/')} 
                                {leave.start_date !== leave.end_date ? ` - ${leave.end_date.split('-').slice(1).reverse().join('/')}` : ''}
                              </p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Date Range</p>
                            </div>
                          </div>

                          {leave.employee_notes && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-450 font-bold bg-white dark:bg-[#12131a] p-3 rounded-xl border border-[#e2e8f0] dark:border-[#1f212e] mt-3 leading-relaxed">
                              📝 Notes: "{leave.employee_notes}"
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-[#e2e8f0] dark:border-[#1f212e]/50 flex justify-end gap-2">
                          <button 
                            onClick={() => handleLeaveApproval(leave.id, false)}
                            className="px-3.5 py-1.5 hover:bg-slate-100 dark:bg-[#090a0f] text-slate-600 dark:text-slate-400 dark:text-slate-500 rounded-xl text-[10px] font-bold font-display uppercase tracking-wider cursor-pointer"
                          >
                            Decline
                          </button>
                          <button 
                            onClick={() => handleLeaveApproval(leave.id, true)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold font-display uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-sm"
                          >
                            Approve & Clear Shifts
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. VARIANCE ANALYTICS TAB */}
        {managerTab === 'reports' && (
          <div className="space-y-6 animate-fade-in select-none">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] p-6 rounded-xl shadow-sm select-none shrink-0 border-l-4 border-blue-500">
              <div className="pl-4 py-0.5">
                <h2 className="text-lg font-black font-display text-slate-900 dark:text-slate-100 tracking-tight leading-none">Variance Analytics</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">Compare scheduled labor hours against actual time clock attendance</p>
              </div>
              <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                {/* Date range box navigator */}
                <div className="flex items-center gap-1.5 bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e]/50 rounded-full p-1 shadow-sm">
                  <button 
                    onClick={() => setWeekOffset(prev => prev - 1)}
                    className="p-2 hover:bg-white dark:bg-[#12131a] hover:shadow-sm text-slate-500 dark:text-slate-450 rounded-full active:scale-95 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="px-4 py-1.5 text-xs font-bold font-display text-slate-700 dark:text-slate-300 min-w-[130px] text-center">
                    {weekDisplay}
                  </div>
                  <button 
                    onClick={() => setWeekOffset(prev => prev + 1)}
                    className="p-2 hover:bg-white dark:bg-[#12131a] hover:shadow-sm text-slate-500 dark:text-slate-450 rounded-full active:scale-95 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button 
                  onClick={() => window.print()}
                  className="bg-slate-100 dark:bg-[#090a0f] hover:bg-slate-200 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Analytics Report</span>
                </button>
              </div>
            </div>

            {/* Aggregates block */}
            {(() => {
              let totalSchedHours = 0;
              let totalActualWorked = 0;
              const empStats = [];

              profiles.filter(p => p.role !== 'manager').forEach(emp => {
                let sched = 0;
                let actual = 0;

                const empShifts = weekShifts.filter(s => s.user_id === emp.id);
                empShifts.forEach(s => { sched += calculateShiftMetrics(s, empShifts, true, emp).paidDuration; });

                const empLogs = weekLogs.filter(log => log.user_id === emp.id);
                empLogs.forEach(log => {
                  const inTime = new Date(log.clock_in);
                  const outTime = log.clock_out ? new Date(log.clock_out) : null;
                  if (outTime) {
                    let rawDur = (outTime - inTime) / (1000 * 60 * 60);
                    let breakMins = rawDur > autoBreakThreshold ? 30 : 0;
                    actual += (rawDur - (breakMins / 60));
                  }
                });

                if (sched > 0 || actual > 0) {
                  totalSchedHours += sched;
                  totalActualWorked += actual;
                  empStats.push({ emp, sched, actual, diff: actual - sched });
                }
              });

              const netVariance = totalActualWorked - totalSchedHours;

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 shadow-sm">
                      <p className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Scheduled Hours</p>
                      <h3 className="text-3xl font-bold font-display text-slate-800 dark:text-slate-200 mt-1">{totalSchedHours.toFixed(1)} hrs</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5">Based on Roster Grid allocations</p>
                    </div>

                    <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 shadow-sm">
                      <p className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Clocked Hours</p>
                      <h3 className="text-3xl font-bold font-display text-indigo-600 mt-1">{totalActualWorked.toFixed(1)} hrs</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5">Based on timecard logs</p>
                    </div>

                    <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 shadow-sm">
                      <p className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Payroll Variance</p>
                      <h3 className={`text-3xl font-bold font-display mt-1 ${netVariance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {netVariance > 0 ? `+${netVariance.toFixed(1)}` : netVariance.toFixed(1)} hrs
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5">Clocked worked vs Roster scheduled</p>
                    </div>
                  </div>

                  {/* Employee breakdowns comparison grid table */}
                  <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight leading-none mb-4 border-l-4 border-indigo-600 pl-3 py-0.5">Detailed Variance Breakdown per Employee</h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-bold text-slate-500 dark:text-slate-450 border-collapse">
                        <thead>
                          <tr className="border-b border-[#e2e8f0] dark:border-[#1f212e] text-[10px] text-slate-400 dark:border-[#1f212e] text-slate-500 font-bold font-display uppercase tracking-wider select-none">
                            <th className="pb-3">Employee</th>
                            <th className="pb-3 text-center">Scheduled (Hrs)</th>
                            <th className="pb-3 text-center">Clocked (Hrs)</th>
                            <th className="pb-3 text-center">Variance</th>
                            <th className="pb-3 text-right">Cost Variance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {empStats.map(item => {
                            const hourly = parseFloat(item.emp.hourly_rate || 29.23);
                            const costVar = item.diff * hourly;

                            return (
                              <tr key={item.emp.id} className="border-b border-slate-50 hover:bg-[#f8fafc] dark:bg-[#090a0f]/50">
                                <td className="py-4 flex items-center gap-2">
                                  <div 
                                    style={{ backgroundColor: item.emp.color || '#4F46E5' }}
                                    className="w-6 h-6 rounded-full text-white font-bold font-display text-[10px] uppercase flex items-center justify-center"
                                  >
                                    {item.emp.full_name[0]}
                                  </div>
                                  <span className="font-bold font-display text-slate-800 dark:text-slate-200">{item.emp.full_name}</span>
                                </td>
                                <td className="py-4 text-center text-slate-600 dark:text-slate-400 dark:text-slate-500">{item.sched.toFixed(1)}h</td>
                                <td className="py-4 text-center text-slate-800 dark:text-slate-200">{item.actual.toFixed(1)}h</td>
                                <td className={`py-4 text-center font-bold font-display ${item.diff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {item.diff > 0 ? `+${item.diff.toFixed(1)}` : item.diff.toFixed(1)}h
                                </td>
                                <td className={`py-4 text-right font-bold font-display ${costVar > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {costVar > 0 ? `+$${costVar.toFixed(2)}` : `-$${Math.abs(costVar).toFixed(2)}`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* 8. STAFF / TEAM DIRECTORY TAB */}
        {managerTab === 'staff' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] p-5 rounded-xl shadow-sm select-none shrink-0 border-l-4 border-indigo-500">
              <div className="pl-4 py-0.5">
                <h2 className="text-lg font-black font-display text-slate-900 dark:text-slate-100 tracking-tight leading-none">Team Directory</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">Review active employee credentials, check iPad Kiosk PIN codes, or batch import staff rosters</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setNewEmployee({
                      full_name: '',
                      email: '',
                      phone: '',
                      dob: '',
                      type: 'casual',
                      hourly_rate: 29.23,
                      contracted_hours: 15,
                      color: '#4F46E5'
                    });
                    setShowAddEmployeeModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4.5 h-4.5" />
                  <span>Add Employee</span>
                </button>

                <button 
                  onClick={() => setShowCsvModal(true)}
                  className="bg-slate-800 hover:bg-[#090a0f] dark:bg-[#090a0f] text-white px-4 py-2.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <PlusCircle className="w-4.5 h-4.5" />
                  <span>Bulk CSV Import</span>
                </button>
              </div>
            </div>

            {/* Team Directory Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 select-none">
              {profiles.map(p => {
                const isMgr = p.role === 'manager';
                const birthdayDisplay = p.dob ? p.dob.split('-').slice(1).reverse().join('/') : 'N/A';

                return (
                  <div key={p.id} className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 shadow-sm relative group hover:border-indigo-400 transition-all">
                    
                    {/* Hover edit and delete action buttons */}
                    {!isMgr && (
                      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-all flex gap-1 bg-white dark:bg-[#12131a]/90 backdrop-blur-sm rounded-xl p-0.5 border border-[#e2e8f0] dark:border-[#1f212e] shadow-sm">
                        <button 
                          onClick={() => {
                            setEditingEmployee(p);
                            setShowEditEmployeeModal(true);
                          }}
                          className="p-1.5 hover:bg-[#f8fafc] dark:bg-[#090a0f] rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 transition-all cursor-pointer"
                          title="Edit Profile"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => {
                            handleDeleteEmployee(p.id, p.full_name);
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 transition-all cursor-pointer"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div 
                        style={{ backgroundColor: p.color || '#4F46E5' }}
                        className="w-11 h-11 rounded-full text-white font-bold font-display text-sm uppercase flex items-center justify-center shadow-inner"
                      >
                        {p.full_name[0]}
                      </div>
                      <div>
                        <h4 className="font-bold font-display text-slate-800 dark:text-slate-200 text-sm leading-none flex items-center gap-1.5">
                          <span>{p.full_name}</span>
                          {isMgr && (
                            <span className="text-[7px] font-bold font-display uppercase tracking-widest bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded shadow-sm">Manager</span>
                          )}
                        </h4>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">{p.type} • rate: ${p.hourly_rate ? p.hourly_rate.toFixed(2) : '0'}/hr</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#e2e8f0] dark:border-[#1f212e] space-y-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-450">
                      <p>📧 Email: <strong className="text-slate-700 dark:text-slate-300">{p.email}</strong></p>
                      <p>📞 Phone: <strong className="text-slate-700 dark:text-slate-300">{p.phone || 'N/A'}</strong></p>
                      <p>🎂 Birthday: <strong className="text-slate-700 dark:text-slate-300">{birthdayDisplay}</strong></p>
                      <p>🔗 Xero Unique ID: <strong className="text-sky-600 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded font-mono">{p.payroll_id || `XERO-${p.id.toUpperCase().split('-')[1] || p.id.toUpperCase()}`}</strong></p>
                      {!isMgr && (
                        <>
                          <p>🔑 Login Password: <strong className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono">{p.temp_password}</strong></p>
                          <p>📌 iPad Kiosk PIN: <strong className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{p.kiosk_pin}</strong></p>
                          <p>⏰ Contracted target: <strong className="text-slate-700 dark:text-slate-300">{p.contracted_hours || 0} hrs/week</strong></p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 9. PAYROLL EXPORT (XERO SYNC) */}
        {managerTab === 'payroll' && (
          <div className="space-y-6 animate-fade-in select-none">
            <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] p-5 rounded-xl shadow-sm select-none shrink-0 border-l-4 border-sky-500">
              <h2 className="text-lg font-black font-display text-slate-800 dark:text-slate-200 tracking-tight leading-none">Xero Payroll Integration</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">Authenticate OAuth connections and synchronize approved weekly timesheets directly into Xero draft payruns</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Synchronize payload panel */}
              <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-sm lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight leading-none border-l-4 border-indigo-600 pl-3 py-0.5">Synchronize Approved Timesheets</h3>
                
                <div className="bg-[#f8fafc] dark:bg-[#090a0f] p-5 border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Payrun Period Start</label>
                      <input 
                        type="date"
                        id="payroll-start"
                        defaultValue={weekDates[0]}
                        className="w-full bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Payrun Period End</label>
                      <input 
                        type="date"
                        id="payroll-end"
                        defaultValue={weekDates[6]}
                        className="w-full bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                      onClick={async () => {
                        const weekLogs = timeLogs.filter(log => {
                          if (!log || !log.clock_in) return false;
                          const logDateStr = log.clock_in.split('T')[0];
                          return weekDates.includes(logDateStr);
                        });
                        const pendingLogs = weekLogs.filter(l => !l.is_approved);

                        if (pendingLogs.length > 0) {
                          const result = await Swal.fire({
                            title: '⚠️ Pending Timesheets Exist',
                            text: `You have ${pendingLogs.length} unapproved timesheet entries this week. Only fully approved timesheet hours will be sent to Xero Payroll. Unapproved entries will be skipped.`,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Override & Sync Approved Only',
                            cancelButtonText: 'Check Timesheets Again',
                            confirmButtonColor: '#4F46E5',
                            cancelButtonColor: '#64748b'
                          });
                          
                          if (!result.isConfirmed) {
                            setManagerTab('time'); // switch back to timesheets tab!
                            return;
                          }
                        }
                        
                        await exportPayrollCSV();
                      }}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
                    >
                      <CloudLightning className="w-4 h-4 animate-pulse" />
                      <span>Sync to Xero</span>
                    </button>

                    <button 
                      onClick={testXeroConnection}
                      className="w-full py-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-bold font-display text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[#e2e8f0] dark:border-[#1f212e]"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Test Connection</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl text-[10px] text-slate-400 dark:text-slate-500 font-bold space-y-1.5">
                  <p>🔗 **Secure Connection details:** Uses Supabase Edge functions deploying cryptographic OAuth headers directly into Xero APIs.</p>
                  <p>🤖 **Wage calculation rules:** Weekend penalty schedules and break deductions are audited, interpreted, and locked before transmission.</p>
                </div>
              </div>

              {/* Xero Connection status card */}
              <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-sm flex flex-col justify-between items-center text-center">
                <div className="p-4 bg-indigo-50 rounded-full text-indigo-600 animate-pulse">
                  <CloudLightning className="w-8 h-8" />
                </div>
                
                <h4 className="font-bold font-display text-slate-800 dark:text-slate-200 text-sm mt-4 leading-none">Xero Connection: Active</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1">Tenant ID: tabkey-aus-1002</p>

                <div className="w-full bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-[10px] text-emerald-800 font-bold mt-4 select-none">
                  OAuth token authenticated successfully. Pushes will arrive in Draft Payroll instantly.
                </div>

                <button 
                  onClick={() => alert("Xero OAuth Connection Connection test passed! 💯")}
                  className="w-full py-3 bg-slate-100 dark:bg-[#090a0f] hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold font-display text-[10px] uppercase tracking-wider mt-4 transition-all cursor-pointer"
                >
                  Verify Connection Test
                </button>
              </div>

            </div>
          </div>
        )}

        {/* 10. STORE SETTINGS TAB */}
        {managerTab === 'settings' && (
          <div className="space-y-6 animate-fade-in select-none">
            <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] p-5 rounded-xl shadow-sm select-none shrink-0 border-l-4 border-slate-500">
              <h2 className="text-lg font-black font-display text-slate-800 dark:text-slate-200 tracking-tight leading-none">Store Settings</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">Configure global roster parameters, Award penalty multipliers, and backup local storage databases</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Settings sliders */}
              <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-sm lg:col-span-2 space-y-5">
                <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-200 tracking-tight leading-none mb-2">Award Penalty Settings & Multipliers</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Saturday Rate Multiplier</label>
                    <input 
                      type="number" 
                      step="0.05"
                      value={penaltySat}
                      onChange={(e) => setPenaltySat(parseFloat(e.target.value))}
                      className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Sunday Rate Multiplier</label>
                    <input 
                      type="number" 
                      step="0.05"
                      value={penaltySun}
                      onChange={(e) => setPenaltySun(parseFloat(e.target.value))}
                      className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Public Holiday Multiplier</label>
                    <input 
                      type="number" 
                      step="0.05"
                      value={penaltyPH}
                      onChange={(e) => setPenaltyPH(parseFloat(e.target.value))}
                      className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Auto-Break Threshold (Hrs)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={autoBreakThreshold}
                      onChange={(e) => setAutoBreakThreshold(parseFloat(e.target.value))}
                      className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>

                <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-200 tracking-tight leading-none pt-4 border-t border-[#e2e8f0] dark:border-[#1f212e]">Operational Switches</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between bg-[#f8fafc] dark:bg-[#090a0f] p-4 rounded-xl border border-[#e2e8f0] dark:border-[#1f212e]">
                    <div>
                      <p className="text-[11px] font-bold font-display text-slate-800 dark:text-slate-200 leading-none">Compact UI Mode</p>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Denser text grids</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={compactMode}
                      onChange={(e) => setCompactMode(e.target.checked)}
                      className="accent-indigo-600 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-[#f8fafc] dark:bg-[#090a0f] p-4 rounded-xl border border-[#e2e8f0] dark:border-[#1f212e]">
                    <div>
                      <p className="text-[11px] font-bold font-display text-slate-800 dark:text-slate-200 leading-none">Market Kill Switch</p>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Disable staff swap trading</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={marketKillSwitch}
                      onChange={(e) => setMarketKillSwitch(e.target.checked)}
                      className="accent-indigo-600 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-[#f8fafc] dark:bg-[#090a0f] p-4 rounded-xl border border-[#e2e8f0] dark:border-[#1f212e]">
                    <div>
                      <p className="text-[11px] font-bold font-display text-slate-800 dark:text-slate-200 leading-none">Mobile Clock-In</p>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Allow mobile GPS geofenced clocking</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={mobileClockInAllowed}
                      onChange={(e) => setMobileClockInAllowed(e.target.checked)}
                      className="accent-indigo-600 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-[#f8fafc] dark:bg-[#090a0f] p-4 rounded-xl border border-[#e2e8f0] dark:border-[#1f212e]">
                    <div>
                      <p className="text-[11px] font-bold font-display text-slate-800 dark:text-slate-200 leading-none">Kiosk Break Tracking</p>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Enable breaks on Store iPad terminal</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={kioskBreaksAllowed}
                      onChange={(e) => setKioskBreaksAllowed(e.target.checked)}
                      className="accent-indigo-600 w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={async () => {
                      const payload = {
                        labor_budget: budgetTarget,
                        compact_mode: compactMode,
                        market_kill_switch: marketKillSwitch,
                        mobile_clock_in_allowed: mobileClockInAllowed,
                        kiosk_breaks_allowed: kioskBreaksAllowed,
                        penalty_sat: penaltySat,
                        penalty_sun: penaltySun,
                        penalty_ph: penaltyPH,
                        auto_break_threshold: autoBreakThreshold,
                        weather_mock: weatherMock
                      };
                      await supabase.from('store_settings').update(payload).eq('id', 'settings-main');
                      alert("Global store configurations updated successfully!");
                    }}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-xs uppercase tracking-wider shadow-sm transition-all"
                  >
                    Save Operational Configurations
                  </button>
                </div>
              </div>

              {/* backup and restore JSON panels */}
              <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-200 tracking-tight leading-none mb-4">System Backup & Recovery</h3>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        const backup = {};
                        Object.keys(localStorage).forEach(k => {
                          if (k.startsWith(STORAGE_KEY_PREFIX)) {
                            backup[k] = localStorage.getItem(k);
                          }
                        });
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
                        const link = document.createElement("a");
                        link.setAttribute("href", dataStr);
                        link.setAttribute("download", `tabkey_roster_backup_${new Date().toISOString().split('T')[0]}.json`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        alert("Database configuration JSON successfully exported! Save this backup locally.");
                      }}
                      className="w-full py-3 bg-slate-800 hover:bg-[#090a0f] dark:bg-[#090a0f] text-white rounded-xl font-bold font-display text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Download JSON Backup
                    </button>

                    <div className="border border-dashed border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 text-center">
                      <p className="text-[10px] font-bold font-display uppercase text-indigo-600">Restore System</p>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-1">Upload a previous JSON backup file to overwrite local databases</p>
                      <input 
                        type="file" 
                        accept=".json"
                        onChange={(e) => {
                          const reader = new FileReader();
                          reader.onload = function(event) {
                            try {
                              const data = JSON.parse(event.target.result);
                              Object.keys(data).forEach(k => {
                                localStorage.setItem(k, data[k]);
                              });
                              alert("System successfully restored! Overwrote local database tables. Reloading page...");
                              window.location.reload();
                            } catch (err) {
                              alert("Invalid backup JSON file format!");
                            }
                          };
                          if (e.target.files[0]) {
                            reader.readAsText(e.target.files[0]);
                          }
                        }}
                        className="mt-3 text-[9px] text-slate-500 dark:text-slate-450 max-w-full"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-3 bg-slate-100 dark:bg-[#090a0f] hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold font-display text-[10px] uppercase tracking-wider cursor-pointer"
                >
                  Clear App Cache & Force Reload
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </>
  )}



      {/* CORE FORM MODALS & DIALOG VIEWS */}
      
      {/* Edit Broadcasted Policy Modal */}
      {showEditDocModal && editingDoc && (
        <div className="fixed inset-0 bg-[#090a0f] dark:bg-[#090a0f]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-2xl w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-[#e2e8f0] dark:border-[#1f212e] pb-3">
              <h3 className="font-bold font-display text-slate-800 dark:text-slate-200 text-sm">Edit Compliance Policy</h3>
              <button 
                onClick={() => { setShowEditDocModal(false); setEditingDoc(null); }} 
                className="p-1 hover:bg-[#f8fafc] dark:bg-[#090a0f] rounded-lg text-slate-400 dark:text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDoc} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Document Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. sanitiser guidelines..."
                  required
                  value={editingDoc.title}
                  onChange={(e) => setEditingDoc(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Policy Content / Terms</label>
                <textarea 
                  rows={5}
                  placeholder="Type details that staff must read and sign..."
                  required
                  value={editingDoc.content}
                  onChange={(e) => setEditingDoc(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between bg-[#f8fafc] dark:bg-[#090a0f] p-4 rounded-xl border border-[#e2e8f0] dark:border-[#1f212e]">
                <div>
                  <p className="text-[11px] font-bold font-display text-slate-800 dark:text-slate-200 leading-none">Mandatory Lockout</p>
                  <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Blocks employee portal until signed</p>
                </div>
                <input 
                  type="checkbox"
                  checked={editingDoc.is_mandatory}
                  onChange={(e) => setEditingDoc(prev => ({ ...prev, is_mandatory: e.target.checked }))}
                  className="accent-indigo-600 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex gap-2">
                <button 
                  type="submit"
                  className="flex-grow py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-[10px] uppercase tracking-wider shadow-sm transition-all"
                >
                  Save Policy
                </button>
                <button 
                  type="button"
                  onClick={() => { setShowEditDocModal(false); setEditingDoc(null); }}
                  className="px-5 py-3 bg-slate-100 dark:bg-[#090a0f] hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold font-display text-[10px] uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Add Shift Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#090a0f] dark:bg-[#090a0f]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-2xl w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-[#e2e8f0] dark:border-[#1f212e] pb-3">
              <h3 className="font-bold font-display text-slate-800 dark:text-slate-200 text-sm">Add Shift Allocation</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-[#f8fafc] dark:bg-[#090a0f] rounded-lg text-slate-400 dark:text-slate-500"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleAddShift} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Choose Employee From Cards</label>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-2 bg-[#f8fafc] dark:bg-[#090a0f]/50">
                  {/* Leave Open / Unassigned Card */}
                  <div 
                    onClick={() => setNewShift(prev => ({ ...prev, user_id: 'open' }))}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      newShift.user_id === 'open' 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                        : 'border-[#e2e8f0] dark:border-[#1f212e] hover:border-[#e2e8f0] dark:border-[#1f212e] bg-white dark:bg-[#12131a]'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#090a0f] flex items-center justify-center font-bold font-display text-slate-500 dark:text-slate-450 text-xs shrink-0">
                      ?
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold font-display text-slate-700 dark:text-slate-300 leading-tight">Leave Open / Unassigned</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Unassigned</p>
                    </div>
                  </div>

                  {/* Employee Cards */}
                  {profiles.filter(p => p.role !== 'manager').map(p => {
                    const isSelected = newShift.user_id === p.id;
                    const hours = getEmployeeWeekHours(p.id);
                    const initial = p.full_name ? p.full_name.charAt(0).toUpperCase() : '';
                    return (
                      <div 
                        key={p.id}
                        onClick={() => setNewShift(prev => ({ ...prev, user_id: p.id }))}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                            : 'border-[#e2e8f0] dark:border-[#1f212e] hover:border-[#e2e8f0] dark:border-[#1f212e] bg-white dark:bg-[#12131a]'
                        }`}
                      >
                        <div 
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold font-display text-white text-xs shrink-0 shadow-inner"
                          style={{ backgroundColor: p.color || '#4F46E5' }}
                        >
                          {initial}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold font-display text-slate-700 dark:text-slate-300 leading-tight">{p.full_name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">{hours.toFixed(1)} hrs this week</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Start Time</label>
                  <input 
                    type="time" 
                    value={newShift.start_time}
                    onChange={(e) => setNewShift(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">End Time</label>
                  <input 
                    type="time" 
                    value={newShift.end_time}
                    onChange={(e) => setNewShift(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-xs uppercase tracking-wider shadow-sm transition-all"
              >
                Allocate Shift
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit/Assign Shift Modal */}
      {showEditModal && editingShift && (
        <div className="fixed inset-0 bg-[#090a0f] dark:bg-[#090a0f]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-2xl w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-[#e2e8f0] dark:border-[#1f212e] pb-3">
              <h3 className="font-bold font-display text-slate-800 dark:text-slate-200 text-sm font-sans">Modify Shift details</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-[#f8fafc] dark:bg-[#090a0f] rounded-lg text-slate-400 dark:text-slate-500"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleEditShift} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Choose Employee From Cards</label>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-2 bg-[#f8fafc] dark:bg-[#090a0f]/50">
                  {/* Leave Open / Unassigned Card */}
                  <div 
                    onClick={() => setEditingShift(prev => ({ ...prev, user_id: 'open' }))}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      editingShift.user_id === 'open' 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                        : 'border-[#e2e8f0] dark:border-[#1f212e] hover:border-[#e2e8f0] dark:border-[#1f212e] bg-white dark:bg-[#12131a]'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#090a0f] flex items-center justify-center font-bold font-display text-slate-500 dark:text-slate-450 text-xs shrink-0">
                      ?
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold font-display text-slate-700 dark:text-slate-300 leading-tight">Leave Open / Unassigned</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Unassigned</p>
                    </div>
                  </div>

                  {/* Employee Cards */}
                  {profiles.filter(p => p.role !== 'manager').map(p => {
                    const isSelected = editingShift.user_id === p.id;
                    const hours = getEmployeeWeekHours(p.id);
                    const initial = p.full_name ? p.full_name.charAt(0).toUpperCase() : '';
                    return (
                      <div 
                        key={p.id}
                        onClick={() => setEditingShift(prev => ({ ...prev, user_id: p.id }))}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                            : 'border-[#e2e8f0] dark:border-[#1f212e] hover:border-[#e2e8f0] dark:border-[#1f212e] bg-white dark:bg-[#12131a]'
                        }`}
                      >
                        <div 
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold font-display text-white text-xs shrink-0 shadow-inner"
                          style={{ backgroundColor: p.color || '#4F46E5' }}
                        >
                          {initial}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold font-display text-slate-700 dark:text-slate-300 leading-tight">{p.full_name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">{hours.toFixed(1)} hrs this week</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Start Time</label>
                  <input 
                    type="time" 
                    value={editingShift.start_time}
                    onChange={(e) => setEditingShift(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">End Time</label>
                  <input 
                    type="time" 
                    value={editingShift.end_time}
                    onChange={(e) => setEditingShift(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => handleDeleteShift(editingShift.id)}
                  className="flex-grow py-3 hover:bg-rose-50 border border-rose-200 text-rose-600 rounded-xl font-bold font-display text-[10px] uppercase tracking-wider transition-all"
                >
                  Delete Shift
                </button>
                <button 
                  type="submit"
                  className="flex-grow py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-[10px] uppercase tracking-wider transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Manual/Missing Clock Timesheet Modal */}
      {showManualClockModal && (
        <div className="fixed inset-0 bg-[#090a0f] dark:bg-[#090a0f]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-2xl w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-[#e2e8f0] dark:border-[#1f212e] pb-3">
              <h3 className="font-bold font-display text-slate-800 dark:text-slate-200 text-sm">Add Missing Clock Timesheet</h3>
              <button onClick={() => setShowManualClockModal(false)} className="p-1 hover:bg-[#f8fafc] dark:bg-[#090a0f] rounded-lg text-slate-400 dark:text-slate-500"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleAddManualClock} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Employee</label>
                <select 
                  value={manualClockUser}
                  onChange={(e) => setManualClockUser(e.target.value)}
                  className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  {profiles.filter(p => p.role !== 'manager').map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Shift Date</label>
                <select 
                  value={manualClockDate}
                  onChange={(e) => setManualClockDate(e.target.value)}
                  className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  {weekDates.map(dStr => (
                    <option key={dStr} value={dStr}>{dStr.split('-').slice(1).reverse().join('/')}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Clock In</label>
                  <input 
                    type="time" 
                    value={manualClockIn}
                    onChange={(e) => setManualClockIn(e.target.value)}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Clock Out</label>
                  <input 
                    type="time" 
                    value={manualClockOut}
                    onChange={(e) => setManualClockOut(e.target.value)}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-xs uppercase tracking-wider shadow-sm transition-all"
              >
                Log Manual Timesheet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Timesheet Modal */}
      {showEditTimesheetModal && editingTimesheet && (
        <div className="fixed inset-0 bg-[#090a0f] dark:bg-[#090a0f]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-2xl w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-[#e2e8f0] dark:border-[#1f212e] pb-3">
              <h3 className="font-bold font-display text-slate-800 dark:text-slate-200 text-sm">Edit Timesheet Clocking</h3>
              <button onClick={() => setShowEditTimesheetModal(false)} className="p-1 hover:bg-[#f8fafc] dark:bg-[#090a0f] rounded-lg text-slate-400 dark:text-slate-500"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveEditTimesheet} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Employee</label>
                <input 
                  type="text" 
                  value={profiles.find(p => p.id === editingTimesheet.user_id)?.full_name || 'Staff member'}
                  disabled
                  className="w-full bg-slate-100 dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-450 focus:outline-none cursor-not-allowed text-left"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Shift Date</label>
                <input 
                  type="date" 
                  value={editingTimesheetDate}
                  onChange={(e) => setEditingTimesheetDate(e.target.value)}
                  className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Clock In</label>
                  <input 
                    type="time" 
                    value={editingTimesheetIn}
                    onChange={(e) => setEditingTimesheetIn(e.target.value)}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Clock Out</label>
                  <input 
                    type="time" 
                    value={editingTimesheetOut}
                    onChange={(e) => setEditingTimesheetOut(e.target.value)}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Manager Adjustment Notes</label>
                <input 
                  type="text" 
                  placeholder="Reason for timesheet adjustment..."
                  value={editingTimesheet.notes || ''}
                  onChange={(e) => setEditingTimesheet(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none text-left"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-xs uppercase tracking-wider shadow-sm transition-all"
              >
                Save Timesheet Changes
              </button>
            </form>
          </div>
        </div>
      )}


      {/* 4. Bulk CSV Importer Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-[#090a0f] dark:bg-[#090a0f]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-2xl w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center border-b border-[#e2e8f0] dark:border-[#1f212e] pb-3">
              <h3 className="font-bold font-display text-slate-800 dark:text-slate-200 text-sm">Bulk Staff CSV Importer</h3>
              <button onClick={() => setShowCsvModal(false)} className="p-1 hover:bg-[#f8fafc] dark:bg-[#090a0f] rounded-lg text-slate-400 dark:text-slate-500"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                Paste comma-separated employee details below. One line per staff member.
                Format: **Name, Email, Phone, Birthday (YYYY-MM-DD), Role Type, Hourly Rate, Contracted Hours**
              </p>
              <textarea 
                rows={6}
                placeholder="Name,Email,Phone,DOB,Type,HourlyRate,ContractedHours&#10;Gigi Hadid,gigi@tabkey.com.au,0499 999 999,2001-04-23,Casual,29.23,0&#10;Zayn Malik,zayn@tabkey.com.au,0488 888 888,1998-01-12,Part-Time,32.50,25"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <button 
                onClick={() => {
                  setCsvText("Name,Email,Phone,DOB,Type,HourlyRate,ContractedHours\nJulian Alvarez,julian@tabkey.com.au,0412 999 888,2000-01-31,Casual,29.23,0\nKylie Jenner,kylie@tabkey.com.au,0423 777 666,1999-08-10,Part-Time,33.50,20");
                }}
                className="text-[10px] font-bold font-display text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Load Sample Template
              </button>

              <div className="flex gap-2">
                <button 
                  onClick={() => setShowCsvModal(false)}
                  className="px-4 py-2 hover:bg-slate-100 dark:bg-[#090a0f] text-slate-600 dark:text-slate-400 dark:text-slate-500 rounded-xl text-[10px] font-bold font-display uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCsvImport}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold font-display uppercase tracking-wider shadow-sm"
                >
                  Import Staff
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Birthday greetings Card sweetalert simulation Modal */}
      {showBirthdayModal && birthdayEmployee && (
        <div className="fixed inset-0 bg-[#090a0f] dark:bg-[#090a0f]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-[#FFFDF9] border border-[#EADCC6] rounded-xl p-8 shadow-2xl w-full max-w-md text-slate-800 dark:text-slate-200 text-center space-y-6 relative overflow-hidden">
            {/* background circle aesthetics */}
            <div className="absolute right-[-10%] top-[-10%] w-40 h-40 bg-amber-100/30 rounded-full mix-blend-multiply filter blur-xl opacity-60" />
            <div className="absolute left-[-15%] bottom-[-15%] w-40 h-40 bg-indigo-50/40 rounded-full mix-blend-multiply filter blur-xl opacity-60" />
 
            <div className="w-16 h-16 bg-amber-50 border border-amber-100 text-amber-700 rounded-full flex items-center justify-center text-2xl font-bold font-display mx-auto shadow-md animate-bounce">
              🎂
            </div>
 
            <div>
              <h3 className="font-bold font-display text-2xl text-slate-800 dark:text-slate-200 tracking-tight leading-none">TabKey Birthday Wish</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">Branded HTML template ready for broadcast</p>
            </div>
 
            <div className="bg-white dark:bg-[#12131a] border border-[#EADCC6]/60 rounded-xl p-5 text-left text-slate-800 dark:text-slate-200 space-y-2 relative shadow-md">
              <span className="text-[7px] font-bold font-display uppercase tracking-widest text-amber-800 bg-amber-50 px-2 py-0.5 rounded">TabKey Birthday Card template</span>
              <p className="text-xs font-bold font-display text-slate-850">To: {birthdayEmployee.full_name} ({birthdayEmployee.email})</p>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 dark:text-slate-500 leading-relaxed pt-2 border-t border-[#e2e8f0] dark:border-[#1f212e] font-medium">
                "Happy Birthday {birthdayEmployee.full_name}! 🌀✨ <br />
                We are so incredibly grateful for your great work at our store! <br />
                As a birthday token, here is a voucher for a **Free Coffee & Meal** on your next shift. <br />
                Have an amazing day! <br />
                - TabKey Management."
              </p>
            </div>
 
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={() => setShowBirthdayModal(false)}
                className="flex-grow py-3.5 hover:bg-slate-100 dark:bg-[#090a0f] text-slate-500 dark:text-slate-455 rounded-xl font-bold font-display text-[10px] uppercase tracking-wider"
              >
                Close Preview
              </button>
              <button 
                onClick={() => {
                  setShowBirthdayModal(false);
                  alert(`Branded TabKey email greeting and voucher successfully dispatched to ${birthdayEmployee.full_name}!`);
                }}
                className="flex-grow py-3.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-[10px] uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
              >
                Send Greeting Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Compliance PDF Audit Modal */}
      {showAuditModal && selectedAuditDoc && (
        <div className="fixed inset-0 bg-[#090a0f] dark:bg-[#090a0f]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto print-hide select-none">
          <style>{`
            @media print {
              body > * {
                display: none !important;
              }
              .print-container-modal {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .print-hide {
                display: none !important;
              }
            }
          `}</style>
          <div className="w-full max-w-3xl space-y-4 my-8">
            {/* Header bar controls */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-lg flex justify-between items-center select-none print-hide">
              <div>
                <h2 className="text-sm font-bold font-display text-blue-800 tracking-tight leading-none uppercase">Compliance Audit PDF Report</h2>
                <p className="text-[10px] text-blue-500 font-bold mt-1">Vector-perfect Save as PDF is optimized for A4 Portrait.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save as PDF</span>
                </button>
                <button 
                  onClick={() => { setShowAuditModal(false); setSelectedAuditDoc(null); }}
                  className="bg-slate-100 dark:bg-[#090a0f] hover:bg-slate-200 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable A4 Report Container Sheet */}
            {(() => {
              const totalStaff = profiles.filter(p => p.role !== 'manager').length;
              const signedSigs = signatures.filter(s => s.document_id === selectedAuditDoc.id);
              const progressVal = totalStaff > 0 ? (signedSigs.length / totalStaff) * 100 : 0;
              const pStaff = profiles.filter(p => p.role !== 'manager' && !signatures.some(s => s.document_id === selectedAuditDoc.id && s.user_id === p.id));
              
              const formatTimestamp = (isoStr) => {
                if (!isoStr) return '';
                const d = new Date(isoStr);
                const day = d.getDate();
                const monthNamesLong = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const year = d.getFullYear();
                
                let hours = d.getHours();
                let minutes = d.getMinutes();
                const ampm = hours >= 12 ? 'pm' : 'am';
                hours = hours % 12;
                hours = hours ? hours : 12;
                const minStr = String(minutes).padStart(2, '0');
                
                return `${day} ${monthNamesLong[d.getMonth()]} ${year} ${hours}:${minStr} ${ampm}`;
              };

              return (
                <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-10 shadow-2xl space-y-6 text-left font-sans print-container-modal">
                  
                  {/* Branding Header Block */}
                  <div className="flex justify-between items-center pb-5 border-b border-[#e2e8f0] dark:border-[#1f212e] select-none">
                    <div className="flex items-center gap-3">
                      <div className="px-4 py-2 bg-indigo-950 text-white font-serif tracking-widest text-lg font-bold font-display uppercase rounded shadow-inner flex items-center justify-center">
                        TABKEY
                      </div>
                      <div className="text-left">
                        <h1 className="text-sm font-bold font-display text-slate-800 dark:text-slate-200 tracking-tight leading-none">Westfield Store Roster</h1>
                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-1">Compliance Audit Log</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-bold font-display uppercase tracking-widest text-slate-400 dark:text-slate-500">Generated On</p>
                      <p className="text-[10px] font-bold font-display text-slate-700 dark:text-slate-300 mt-0.5">{formatTimestamp(new Date().toISOString())}</p>
                    </div>
                  </div>

                  {/* Dark Blue Broadcast Card */}
                  <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-[1.8rem] p-6 text-white space-y-3 shadow-lg shadow-indigo-950/20 relative overflow-hidden">
                    <p className="text-[8px] font-bold font-display uppercase tracking-widest text-indigo-400">
                      Broadcasted: {formatTimestamp(selectedAuditDoc.created_at)}
                    </p>
                    <h2 className="text-base font-bold font-display tracking-wider uppercase">Mandatory Compliance Document</h2>
                    <p className="text-xs text-indigo-50 font-semibold leading-relaxed pt-2 border-t border-white/10 font-sans whitespace-pre-line">
                      "{selectedAuditDoc.content}"
                    </p>
                  </div>

                  {/* Signature Completion Metrics */}
                  <div className="bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 space-y-2 select-none">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] font-bold font-display uppercase text-indigo-600">Total Signatures: {signedSigs.length} of {totalStaff} Staff</span>
                      <span className="text-[10px] text-indigo-600 font-bold font-display">{progressVal.toFixed(0)}% Complete</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div style={{ width: `${progressVal}%` }} className="h-full bg-indigo-600 rounded-full" />
                    </div>
                  </div>

                  {/* Signed Signatures Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold font-display uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5 leading-none">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                      <span>Signed Signatures</span>
                    </h3>

                    {signedSigs.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-bold py-6">No signatures recorded yet.</p>
                    ) : (
                      <div className="border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl overflow-hidden bg-white dark:bg-[#12131a]">
                        <table className="w-full text-left text-xs font-semibold text-slate-500 dark:text-slate-450 border-collapse">
                          <thead>
                            <tr className="border-b border-[#e2e8f0] dark:border-[#1f212e] bg-[#f8fafc] dark:bg-[#090a0f]/50 text-[9px] text-slate-400 dark:text-slate-500 font-bold font-display uppercase tracking-wider select-none">
                              <th className="py-3 px-5">Employee</th>
                              <th className="py-3 px-3 text-center">Status</th>
                              <th className="py-3 px-5 text-right">Signature Date & Comment</th>
                            </tr>
                          </thead>
                          <tbody>
                            {signedSigs.map(sig => {
                              const emp = profiles.find(p => p.id === sig.user_id);
                              if (!emp) return null;
                              const initialLetter = emp.full_name ? emp.full_name.charAt(0).toUpperCase() : '';
                              return (
                                <tr key={sig.id} className="border-b border-slate-50 hover:bg-[#f8fafc] dark:bg-[#090a0f]/30 transition-all">
                                  <td className="py-3 px-5 flex items-center gap-2.5">
                                    <div 
                                      style={{ backgroundColor: emp.color || '#4F46E5' }}
                                      className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold font-display text-[10px] uppercase shrink-0 shadow-sm"
                                    >
                                      {initialLetter}
                                    </div>
                                    <div className="text-left">
                                      <p className="font-bold font-display text-slate-800 dark:text-slate-200 leading-none">{emp.full_name}</p>
                                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">{emp.type}</p>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span className="inline-block text-[8px] font-bold font-display uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                      • Signed
                                    </span>
                                  </td>
                                  <td className="py-3 px-5 text-right font-bold font-display text-slate-700 dark:text-slate-300">
                                    {formatTimestamp(sig.signed_at)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Pending Reviews Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold font-display uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5 leading-none">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
                      <span>Pending Staff Review</span>
                    </h3>

                    {pStaff.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-bold py-3">All scheduled employees have reviewed and signed this document.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {pStaff.map(p => {
                          const initialLetter = p.full_name ? p.full_name.charAt(0).toUpperCase() : '';
                          return (
                            <div key={p.id} className="flex justify-between items-center border border-[#e2e8f0] dark:border-[#1f212e] bg-[#f8fafc] dark:bg-[#090a0f]/30 p-3 rounded-xl">
                              <div className="flex items-center gap-2.5">
                                <div 
                                  style={{ backgroundColor: p.color || '#4F46E5' }}
                                  className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold font-display text-[10px] uppercase shrink-0 shadow-sm"
                                >
                                  {initialLetter}
                                </div>
                                <p className="font-bold font-display text-slate-800 dark:text-slate-200 text-xs leading-none text-left">{p.full_name}</p>
                              </div>
                              <span className="text-[8px] font-bold font-display uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                • Pending Review
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-[#090a0f] dark:bg-[#090a0f]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-2xl w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-[#e2e8f0] dark:border-[#1f212e] pb-3">
              <h3 className="font-bold font-display text-slate-800 dark:text-slate-200 text-sm">Add New Employee Profile</h3>
              <button onClick={() => setShowAddEmployeeModal(false)} className="p-1 hover:bg-[#f8fafc] dark:bg-[#090a0f] rounded-lg text-slate-400 dark:text-slate-500"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Bhavinkumar Patel"
                  value={newEmployee.full_name}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. patel@tabkey.com.au"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Phone</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 0499 888 777"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Birthday</label>
                  <input 
                    type="date" 
                    value={newEmployee.dob}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Type</label>
                  <select 
                    value={newEmployee.type}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="Casual">Casual</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Full-Time">Full-Time</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Rate ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={newEmployee.hourly_rate}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, hourly_rate: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Target (hrs)</label>
                  <input 
                    type="number" 
                    value={newEmployee.contracted_hours}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, contracted_hours: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Xero Employee Code (Unique Payroll ID)</label>
                <input 
                  type="text" 
                  placeholder="e.g. XERO-ALEX123 or PAY-101"
                  value={newEmployee.payroll_id || ''}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, payroll_id: e.target.value }))}
                  className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-xs uppercase tracking-wider shadow-sm transition-all"
              >
                Create Employee Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditEmployeeModal && editingEmployee && (
        <div className="fixed inset-0 bg-[#090a0f] dark:bg-[#090a0f]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-2xl w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-[#e2e8f0] dark:border-[#1f212e] pb-3">
              <h3 className="font-bold font-display text-slate-800 dark:text-slate-200 text-sm">Modify Employee Profile</h3>
              <button onClick={() => setShowEditEmployeeModal(false)} className="p-1 hover:bg-[#f8fafc] dark:bg-[#090a0f] rounded-lg text-slate-400 dark:text-slate-500"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Bhavinkumar Patel"
                  value={editingEmployee.full_name}
                  onChange={(e) => setEditingEmployee(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. patel@tabkey.com.au"
                  value={editingEmployee.email}
                  onChange={(e) => setEditingEmployee(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Phone</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 0499 888 777"
                    value={editingEmployee.phone || ''}
                    onChange={(e) => setEditingEmployee(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Birthday</label>
                  <input 
                    type="date" 
                    value={editingEmployee.dob || ''}
                    onChange={(e) => setEditingEmployee(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">iPad Kiosk PIN</label>
                  <input 
                    type="text" 
                    maxLength={4}
                    placeholder="e.g. 1234"
                    value={editingEmployee.kiosk_pin || ''}
                    onChange={(e) => setEditingEmployee(prev => ({ ...prev, kiosk_pin: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Login Password</label>
                  <input 
                    type="text" 
                    placeholder="e.g. pass1234"
                    value={editingEmployee.temp_password || ''}
                    onChange={(e) => setEditingEmployee(prev => ({ ...prev, temp_password: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Type</label>
                  <select 
                    value={editingEmployee.type}
                    onChange={(e) => setEditingEmployee(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="Casual">Casual</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Full-Time">Full-Time</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Rate ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editingEmployee.hourly_rate}
                    onChange={(e) => setEditingEmployee(prev => ({ ...prev, hourly_rate: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Target (hrs)</label>
                  <input 
                    type="number" 
                    value={editingEmployee.contracted_hours}
                    onChange={(e) => setEditingEmployee(prev => ({ ...prev, contracted_hours: e.target.value }))}
                    className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold font-display uppercase text-slate-400 dark:text-slate-500">Xero Employee Code (Unique Payroll ID)</label>
                <input 
                  type="text" 
                  placeholder="e.g. XERO-ALEX123 or PAY-101"
                  value={editingEmployee.payroll_id || ''}
                  onChange={(e) => setEditingEmployee(prev => ({ ...prev, payroll_id: e.target.value }))}
                  className="w-full bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-xs uppercase tracking-wider shadow-sm transition-all"
              >
                Update Employee Profile
              </button>

              <button 
                type="button"
                onClick={() => {
                  setShowEditEmployeeModal(false);
                  handleDeleteEmployee(editingEmployee.id, editingEmployee.full_name);
                }}
                className="w-full mt-2 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-xl font-bold font-display text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Profile Completely</span>
              </button>
            </form>
          </div>
        </div>
      )}
      {showHandoverModal && selectedHandover && (
        <div className="fixed inset-0 bg-[#090a0f] dark:bg-[#090a0f]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-2xl w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-[#e2e8f0] dark:border-[#1f212e] pb-3">
              <div>
                <span className="text-[8px] font-bold font-display uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{selectedHandover.type}</span>
                <h3 className="font-bold font-display text-slate-800 dark:text-slate-200 text-sm mt-1">Audit Crossover logs</h3>
              </div>
              <button onClick={() => setShowHandoverModal(false)} className="p-1 hover:bg-[#f8fafc] dark:bg-[#090a0f] rounded-lg text-slate-400 dark:text-slate-500"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center font-bold text-xs bg-[#f8fafc] dark:bg-[#090a0f] p-4 rounded-xl border border-[#e2e8f0] dark:border-[#1f212e]">
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">Supervisor</p>
                  <p className="text-slate-800 dark:text-slate-200 font-bold font-display">{selectedHandover.lead_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">Shift Score</p>
                  <div className="flex text-amber-500 justify-end">
                    {Array.from({ length: selectedHandover.rating }).map((_, idx) => (
                      <span key={idx} className="text-xs">★</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Supervisor Handover Diary notes</p>
                <div className="bg-[#f8fafc] dark:bg-[#090a0f] p-4 rounded-xl border border-[#e2e8f0] dark:border-[#1f212e] text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  "{selectedHandover.notes}"
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-400 dark:text-slate-500">Completed Checklist Items</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedHandover.completed_tasks.map((task, idx) => (
                    <span key={idx} className="text-[9px] font-bold font-display uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" strokeWidth={3} /> {task}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowHandoverModal(false)}
              className="w-full py-3.5 bg-slate-800 hover:bg-[#090a0f] dark:bg-[#090a0f] text-white rounded-xl font-bold font-display text-xs uppercase tracking-wider transition-all"
            >
              Approve Audit Log
            </button>
          </div>
        </div>
      )}

      {/* DYNAMIC PRESENTATION LOADING OVERLAYS */}
      {loadingOverlay && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-[9999] select-none text-white text-center">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <div>
            <h3 className="font-bold font-display text-base tracking-wider text-indigo-400">TABKEY ROSTER PORTAL</h3>
            <p className="text-xs text-slate-500 dark:text-slate-450 font-bold mt-1">Simulating portal transition and data syncing...</p>
          </div>
        </div>
      )}

    </div>
  );
}
