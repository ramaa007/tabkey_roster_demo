import React, { useState, useEffect } from 'react';
import { 
  Home, Calendar, Clock, CheckSquare, LogOut, 
  ThumbsUp, MessageSquare, Play, Coffee, Check, 
  Smartphone, Monitor, Tablet, RefreshCw, Send,
  Lock, Gift, MapPin, Award, CheckCircle, ShieldAlert, 
  AlertCircle, FileText, Bell, Sparkles, ChevronRight, X, UserCheck,
  TrendingUp, ShieldCheck, Zap, DollarSign, Sun, Moon
} from 'lucide-react';
import { supabase } from '../core/mock-db';
import { calculateShiftMetrics, checkShiftOverlap, checkLeaveConflict } from '../core/calculator';
import Swal from 'sweetalert2';

export default function EmployeePortal({ user, onLogout, onPortalSwitch }) {
  const [activeTab, setActiveTab] = useState('home'); // home, roster, clock, tasks, leaves
  const [rosterSubTab, setRosterSubTab] = useState('my-roster'); // my-roster, shift-market
  const [shifts, setShifts] = useState([]);
  const [allShifts, setAllShifts] = useState([]); // to check overlap and market
  const [profiles, setProfiles] = useState([]);
  const [feed, setFeed] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [signatures, setSignatures] = useState([]);
  
  // Compliance Signing Lockout state
  const [unsignedMandatoryDocs, setUnsignedMandatoryDocs] = useState([]);
  const [selectedDocToSign, setSelectedDocToSign] = useState(null);
  const [signatureNameInput, setSignatureNameInput] = useState('');
  
  // Geofence simulation state
  const [isInsideGeofence, setIsInsideGeofence] = useState(true); // default inside
  const [geofenceOverrideReason, setGeofenceOverrideReason] = useState('');
  
  // Clock state
  const [activeClockState, setActiveClockState] = useState('out'); // out, in, break
  const [currentClockLog, setCurrentClockLog] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  
  // Profile points and stats
  const [employeeProfile, setEmployeeProfile] = useState(null);
  
  // Comments and Notification panel
  const [commentText, setCommentText] = useState({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "🎉 Roster Published: Next week's schedule is now live!", time: "2h ago", unread: true },
    { id: 2, text: "⚡ Shift Claim Approved: Your shift bidding was successful!", time: "1d ago", unread: false },
    { id: 3, text: "⚠️ Award compliance check: Your profile is verified.", time: "2d ago", unread: false }
  ]);
  
  // Achievements modal panel
  const [showAchievements, setShowAchievements] = useState(false);
  
  // Leave Request Form
  const [leaveType, setLeaveType] = useState('Annual');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  
  // Portal switches
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [targetPortal, setTargetPortal] = useState('');

  // Clock timer ticks
  useEffect(() => {
    let interval;
    if (activeClockState === 'in' && currentClockLog) {
      interval = setInterval(() => {
        const start = new Date(currentClockLog.clock_in);
        const diff = Math.floor((new Date() - start) / 1000);
        const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const secs = String(diff % 60).padStart(2, '0');
        setElapsedTime(`${hrs}:${mins}:${secs}`);
      }, 1000);
    } else if (activeClockState === 'break' && currentClockLog && currentClockLog.break_start) {
      interval = setInterval(() => {
        const start = new Date(currentClockLog.break_start);
        const diffSeconds = Math.floor((new Date() - start) / 1000);
        const totalBreakSeconds = 30 * 60; // 30 minutes
        const remainingSeconds = Math.max(0, totalBreakSeconds - diffSeconds);
        const hrs = String(Math.floor(remainingSeconds / 3600)).padStart(2, '0');
        const mins = String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, '0');
        const secs = String(remainingSeconds % 60).padStart(2, '0');
        setElapsedTime(`${hrs}:${mins}:${secs}`);
      }, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => clearInterval(interval);
  }, [activeClockState, currentClockLog]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    // 1. Fetch employee profile for real point updates
    try {
      const { data: profData, error: profErr } = await supabase.from('profiles').select('*');
      if (profErr) console.error("Error fetching profiles:", profErr);
      setProfiles(profData || []);
      const myProf = (profData || []).find(p => p.id === user.id);
      if (myProf) {
        setEmployeeProfile(myProf);
      }
    } catch (err) {
      console.error("Profiles fetch caught exception:", err);
    }

    // 2. Fetch all shifts (including open shifts)
    try {
      const { data: shiftData, error: shiftErr } = await supabase.from('shifts').select('*').order('shift_date', { ascending: true });
      if (shiftErr) console.error("Error fetching shifts:", shiftErr);
      setAllShifts(shiftData || []);
      
      // Filter shifts belonging to current user
      const myShifts = (shiftData || []).filter(s => s.user_id === user.id);
      setShifts(myShifts);
    } catch (err) {
      console.error("Shifts fetch caught exception:", err);
    }

    // 3. Fetch notice feed
    try {
      const { data: feedData, error: feedErr } = await supabase.from('feed').select('*').order('created_at', { ascending: false });
      if (feedErr) console.error("Error fetching feed:", feedErr);
      setFeed(feedData || []);
    } catch (err) {
      console.error("Feed fetch caught exception:", err);
    }

    // 4. Fetch checklists
    try {
      const { data: taskData, error: taskErr } = await supabase.from('tasks').select('*').eq('assigned_to', user.id);
      if (taskErr) console.error("Error fetching tasks:", taskErr);
      setTasks(taskData || []);
    } catch (err) {
      console.error("Tasks fetch caught exception:", err);
    }

    // 5. Fetch clock logs
    try {
      const { data: logsData, error: logsErr } = await supabase.from('time_logs').select('*').eq('user_id', user.id).order('clock_in', { ascending: false });
      if (logsErr) console.error("Error fetching time logs:", logsErr);
      setTimeLogs(logsData || []);

      // Check if currently clocked in
      const activeLog = (logsData || []).find(l => !l.clock_out);
      if (activeLog) {
        setCurrentClockLog(activeLog);
        if (activeLog.break_start && !activeLog.break_end) {
          setActiveClockState('break');
        } else {
          setActiveClockState('in');
        }
      } else {
        setActiveClockState('out');
        setCurrentClockLog(null);
      }
    } catch (err) {
      console.error("Time logs fetch caught exception:", err);
    }

    // 6. Fetch leave requests
    try {
      const { data: leaves, error: leavesErr } = await supabase.from('leave_requests').select('*').eq('user_id', user.id).order('start_date', { ascending: true });
      if (leavesErr) console.error("Error fetching leave requests:", leavesErr);
      setLeaveRequests(leaves || []);
    } catch (err) {
      console.error("Leave requests fetch caught exception:", err);
    }

    // 7. Fetch documents & signatures
    try {
      const { data: docs, error: docsErr } = await supabase.from('documents').select('*');
      if (docsErr) console.error("Error fetching documents:", docsErr);
      setDocuments(docs || []);
      
      const { data: sigs, error: sigsErr } = await supabase.from('document_signatures').select('*').eq('user_id', user.id);
      if (sigsErr) console.error("Error fetching signatures:", sigsErr);
      setSignatures(sigs || []);

      // 8. Calculate unsigned mandatory documents
      if (docs) {
        const mandatoryDocs = docs.filter(d => d.is_mandatory);
        const signedDocIds = (sigs || []).map(s => s.document_id);
        const unsigned = mandatoryDocs.filter(d => !signedDocIds.includes(d.id));
        setUnsignedMandatoryDocs(unsigned);
        if (unsigned.length > 0) {
          setSelectedDocToSign(unsigned[0]);
        } else {
          setSelectedDocToSign(null);
        }
      }
    } catch (err) {
      console.error("Documents or signatures fetch caught exception:", err);
    }
  };

  // Sign document compliance lockout handler
  const handleSignDocument = async () => {
    if (!signatureNameInput || signatureNameInput.trim().toLowerCase() !== user.full_name.toLowerCase()) {
      Swal.fire({
        icon: 'error',
        title: 'Signature Verification Failed',
        text: `Please type your full name exactly as it appears: "${user.full_name}"`,
        confirmButtonColor: '#ea580c'
      });
      return;
    }

    const newSig = {
      id: "ds-" + Math.random().toString(36).substr(2, 9),
      document_id: selectedDocToSign.id,
      user_id: user.id,
      signed_at: new Date().toISOString()
    };

    await supabase.from('document_signatures').insert(newSig);
    
    Swal.fire({
      icon: 'success',
      title: 'Policy Signed Successfully!',
      text: `You have verified and authorized: ${selectedDocToSign.title}`,
      timer: 2000,
      showConfirmButton: false
    });

    setSignatureNameInput('');
    setSelectedDocToSign(null);
    fetchData();
  };

  // Likes & Comments Noticeboard
  const handleLike = async (postId) => {
    const updatedFeed = feed.map(post => {
      if (post.id === postId) {
        return { ...post, likes: post.likes + 1 };
      }
      return post;
    });
    setFeed(updatedFeed);
    await supabase.from('feed').update({ likes: feed.find(p => p.id === postId).likes + 1 }).eq('id', postId);
  };

  const handleAddComment = async (postId) => {
    const text = commentText[postId];
    if (!text || !text.trim()) return;

    const currentPost = feed.find(p => p.id === postId);
    const newComments = [...(currentPost.comments || []), { author_name: user.full_name, text }];

    const updatedFeed = feed.map(post => {
      if (post.id === postId) {
        return { ...post, comments: newComments };
      }
      return post;
    });

    setFeed(updatedFeed);
    setCommentText({ ...commentText, [postId]: '' });

    await supabase.from('feed').update({ comments: newComments }).eq('id', postId);
  };

  // Toggle Task Completion
  const handleToggleTask = async (taskId, currentStatus) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, is_completed: !currentStatus };
      }
      return t;
    });
    setTasks(updatedTasks);
    await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', taskId);
  };

  // Clock Actions (GPS Check & Lockout)
  const handleClockIn = async () => {
    // Geofence check
    if (!isInsideGeofence && !geofenceOverrideReason) {
      // Prompt for geofence override explanation
      const { value: reasonText } = await Swal.fire({
        title: '📍 GPS Geofence Locked',
        text: 'You are currently logged outside the 100m geofence. To request an override clock-in, please provide a justification:',
        input: 'text',
        inputPlaceholder: 'e.g., Working field-event, Manager Sarah approved override...',
        showCancelButton: true,
        confirmButtonText: 'Submit Override Request',
        confirmButtonColor: '#4F46E5',
        inputValidator: (value) => {
          if (!value) {
            return 'You need to write an override justification!';
          }
        }
      });

      if (reasonText) {
        setGeofenceOverrideReason(reasonText);
        proceedClockIn(`Geofence Override Request: ${reasonText}`);
      }
      return;
    }

    proceedClockIn(isInsideGeofence ? "GPS Verified: Inside boundary" : `Geofence Override: ${geofenceOverrideReason}`);
  };

  const proceedClockIn = async (notesText) => {
    const newLog = {
      id: "tl-" + Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      clock_in: new Date().toISOString(),
      clock_out: null,
      break_start: null,
      break_end: null,
      notes: notesText,
      is_approved: isInsideGeofence // Auto-approve if inside, else pending
    };

    await supabase.from('time_logs').insert(newLog);
    setActiveClockState('in');
    setCurrentClockLog(newLog);
    
    Swal.fire({
      icon: 'success',
      title: 'Clocked In Successfully!',
      text: 'Have a productive shift. Fresh cinnamon scrolls await! 🌀',
      timer: 2000,
      showConfirmButton: false
    });
    
    fetchData();
  };

  const handleToggleBreak = async () => {
    if (activeClockState === 'in') {
      const updatedFields = { break_start: new Date().toISOString() };
      await supabase.from('time_logs').update(updatedFields).eq('id', currentClockLog.id);
      setActiveClockState('break');
      Swal.fire({
        icon: 'info',
        title: 'Break Started',
        text: 'Take a 30 min break. Enjoy a large hot latte! ☕',
        timer: 2000,
        showConfirmButton: false
      });
    } else if (activeClockState === 'break') {
      const updatedFields = { break_end: new Date().toISOString() };
      await supabase.from('time_logs').update(updatedFields).eq('id', currentClockLog.id);
      setActiveClockState('in');
      Swal.fire({
        icon: 'success',
        title: 'Break Ended',
        text: 'Back to the shift. Let\'s bake! 💪',
        timer: 2000,
        showConfirmButton: false
      });
    }
    fetchData();
  };

  const handleClockOut = async () => {
    // Task check lockout!
    const incompleteTasksCount = tasks.filter(t => !t.is_completed).length;
    if (incompleteTasksCount > 0) {
      Swal.fire({
        icon: 'warning',
        title: '📋 Checklist Lockout Active',
        html: `You have <strong>${incompleteTasksCount} incomplete task(s)</strong> assigned to you.<br/>Please tick off all daily tasks in the <strong>Tasks</strong> tab before clocking out.`,
        confirmButtonColor: '#e11d48'
      });
      return;
    }

    const updatedFields = { 
      clock_out: new Date().toISOString(),
      notes: currentClockLog.notes ? `${currentClockLog.notes}. Out at store.` : "Completed shift via Mobile App."
    };
    await supabase.from('time_logs').update(updatedFields).eq('id', currentClockLog.id);
    setActiveClockState('out');
    setCurrentClockLog(null);
    setGeofenceOverrideReason('');
    
    Swal.fire({
      icon: 'success',
      title: 'Clocked Out Successfully!',
      text: 'Great work! Your hours are captured for payroll processing. 🌟',
      timer: 2500,
      showConfirmButton: false
    });

    fetchData();
  };

  // Submit Leave Request
  const handleRequestLeave = async (e) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd) {
      Swal.fire({ icon: 'error', title: 'Invalid Dates', text: 'Please pick start and end dates.' });
      return;
    }

    if (new Date(leaveStart) < new Date()) {
      Swal.fire({ icon: 'error', title: 'Invalid Dates', text: 'Leave start date must be in the future!' });
      return;
    }

    const newLeave = {
      id: "l-req-" + Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      leave_type: leaveType,
      start_date: leaveStart,
      end_date: leaveEnd,
      employee_notes: leaveReason,
      status: "pending",
      created_at: new Date().toISOString()
    };

    await supabase.from('leave_requests').insert(newLeave);

    Swal.fire({
      icon: 'success',
      title: 'Leave Request Filed!',
      text: 'Sent to manager Sarah Jenkins for review.',
      confirmButtonColor: '#4F46E5'
    });

    setLeaveStart('');
    setLeaveEnd('');
    setLeaveReason('');
    fetchData();
  };

  // Drop Shift to Market
  const handleDropShift = async (shift) => {
    const result = await Swal.fire({
      title: 'Drop Shift to Market?',
      text: "Other qualified employees will be able to claim this shift. You remain responsible until claimed.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, post it!',
      confirmButtonColor: '#e11d48',
      cancelButtonText: 'Keep shift'
    });

    if (result.isConfirmed) {
      const newSwap = {
        id: "sw-req-" + Math.random().toString(36).substr(2, 9),
        shift_id: shift.id,
        requester_id: user.id,
        target_user_id: "open",
        status: "pending",
        created_at: new Date().toISOString()
      };

      await supabase.from('swap_requests').insert(newSwap);
      
      Swal.fire({
        icon: 'success',
        title: 'Posted to Shift Market!',
        text: 'Your shift is now active in the claim network.',
        timer: 2000,
        showConfirmButton: false
      });
      fetchData();
    }
  };

  // Claim Shift from Market (with Compliance Overlap & Leave Checking!)
  const handleClaimShift = async (marketShift) => {
    // 1. Double schedule overlap check
    const hasOverlap = checkShiftOverlap(user.id, marketShift.shift_date, marketShift.start_time, marketShift.end_time, allShifts);
    if (hasOverlap) {
      Swal.fire({
        icon: 'error',
        title: 'Compliance Overlap Error',
        text: 'You are already scheduled for a conflicting shift on this day.',
        confirmButtonColor: '#e11d48'
      });
      return;
    }

    // 2. Approved leave conflict check
    const hasLeave = checkLeaveConflict(user.id, marketShift.shift_date, leaveRequests);
    if (hasLeave) {
      Swal.fire({
        icon: 'error',
        title: 'Leave Conflict Active',
        text: 'You have approved leave scheduled on this date.',
        confirmButtonColor: '#e11d48'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Claim Open Shift?',
      html: `Do you want to cover this shift?<br/><strong>${marketShift.shift_date}</strong><br/>🕒 ${marketShift.start_time} - ${marketShift.end_time}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Claim Shift ⚡',
      confirmButtonColor: '#10b981'
    });

    if (result.isConfirmed) {
      // Find swap request if it was listed
      const { data: swaps } = await supabase.from('swap_requests').select('*');
      const activeSwap = (swaps || []).find(sw => sw.shift_id === marketShift.id && sw.status === 'pending');

      if (activeSwap) {
        // Update swap request: set claimant and keep pending for manager approval (2-stage)
        await supabase.from('swap_requests').update({
          target_user_id: user.id,
          status: 'pending'
        }).eq('id', activeSwap.id);

        Swal.fire({
          icon: 'success',
          title: 'Claim Submitted!',
          text: 'Your coverage request has been submitted to Manager Sarah Jenkins for approval. ⚡🎉',
          confirmButtonColor: '#10b981'
        });
      } else {
        // It's a standard open shift, assign immediately
        await supabase.from('shifts').update({
          user_id: user.id,
          status: 'published'
        }).eq('id', marketShift.id);

        Swal.fire({
          icon: 'success',
          title: 'Shift Claimed!',
          text: 'Roster updated! The open shift has been successfully assigned to you! ⚡🎉',
          confirmButtonColor: '#10b981'
        });
      }

      fetchData();
    }
  };

  // Switch Portal via Dock
  const triggerPortalSwitch = (portal) => {
    setTargetPortal(portal);
    setLoadingOverlay(true);
    setTimeout(() => {
      setLoadingOverlay(false);
      onPortalSwitch(portal);
    }, 1200);
  };

  // Helpers
  const getProfileColor = (userId) => {
    const prof = profiles.find(p => p.id === userId);
    return prof ? prof.color : '#4F46E5';
  };

  const getAuthorName = (userId) => {
    const prof = profiles.find(p => p.id === userId);
    return prof ? prof.full_name : 'Sarah Jenkins (Manager)';
  };

  // Get scheduled co-workers for a shift date
  const getCoWorkers = (dateStr, excludeUserId) => {
    return allShifts.filter(s => s.shift_date === dateStr && s.user_id !== excludeUserId && s.user_id !== 'open');
  };

  // Get shifts available on market (posted for swaps or user_id === 'open')
  const getMarketShifts = () => {
    // Find shifts from other employees that have pending swap request where target is open
    const pendingSwapShifts = allShifts.filter(s => {
      if (s.user_id === user.id) return false;
      
      // Is there a pending swap request for this shift where target_user_id is open?
      const storageKey = "tabkey_roster_solution_db_swap_requests";
      const swaps = JSON.parse(localStorage.getItem(storageKey)) || [];
      const hasSwap = swaps.some(sw => sw.shift_id === s.id && sw.status === 'pending' && sw.target_user_id === 'open');
      
      return hasSwap || s.user_id === 'open';
    });

    return pendingSwapShifts;
  };

  // Check if a shift is active right now
  const isShiftActive = (shift) => {
    if (!shift || !shift.shift_date || !shift.start_time || !shift.end_time) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    if (shift.shift_date !== todayStr) return false;
    
    const now = new Date();
    const currMins = now.getHours() * 60 + now.getMinutes();
    
    const sh = parseInt(shift.start_time.split(':')[0]), sm = parseInt(shift.start_time.split(':')[1]);
    const eh = parseInt(shift.end_time.split(':')[0]), em = parseInt(shift.end_time.split(':')[1]);
    
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    
    return currMins >= startMins && currMins <= endMins;
  };

  // Dynamic Weekly Paycheck Calculation
  const calculateEstWeeklyPay = () => {
    let totalHours = 0;
    let estimatedPay = 0;
    let satHours = 0;
    let sunHours = 0;
    let ordHours = 0;

    shifts.forEach(s => {
      if (!s || !s.start_time || !s.end_time || !s.shift_date) return;
      const sh = parseInt(s.start_time.split(':')[0]), sm = parseInt(s.start_time.split(':')[1]);
      const eh = parseInt(s.end_time.split(':')[0]), em = parseInt(s.end_time.split(':')[1]);
      let dur = (eh + em/60) - (sh + sm/60);
      if (dur < 0) dur += 24;
      let breakTime = dur > 5 ? 0.5 : 0;
      let netHours = dur - breakTime;
      totalHours += netHours;

      // Check day multiplier
      let multiplier = 1.0;
      const dateObj = new Date(s.shift_date);
      const day = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
      
      if (day === 6) {
        multiplier = 1.25;
        satHours += netHours;
      } else if (day === 0) {
        multiplier = 1.50;
        sunHours += netHours;
      } else {
        ordHours += netHours;
      }
      
      estimatedPay += netHours * (employeeProfile?.hourly_rate || 29.23) * multiplier;
    });

    return { totalHours, estimatedPay, ordHours, satHours, sunHours };
  };

  // Badge list definitions
  const getBadgesList = () => {
    const isBaker = tasks.some(t => t.is_completed);
    const isPunctual = timeLogs.length > 0;
    const isRosterHero = shifts.length > 2;
    const isCompliant = unsignedMandatoryDocs.length === 0;

    return [
      {
        id: 'b-baker',
        title: "Baking Maestro 🥖",
        desc: "Complete at least one daily store checkout compliance task.",
        unlocked: isBaker,
        color: "from-amber-400 to-orange-500"
      },
      {
        id: 'b-clock',
        title: "Punctual Master ⏱️",
        desc: "Log an attendance clock successfully at the storefront iPad.",
        unlocked: isPunctual,
        color: "from-emerald-400 to-teal-500"
      },
      {
        id: 'b-roster',
        title: "Roster Champion 🤝",
        desc: "Cover shifts, claim swaps, and complete weekly schedules.",
        unlocked: isRosterHero,
        color: "from-indigo-400 to-purple-500"
      },
      {
        id: 'b-compliant',
        title: "Compliance Star 🌟",
        desc: "Agree to all Modern Fast Food Award policies.",
        unlocked: isCompliant,
        color: "from-rose-400 to-pink-500"
      }
    ];
  };

  const badges = getBadgesList();
  const unlockedBadgesCount = badges.filter(b => b.unlocked).length;
  const payInfo = calculateEstWeeklyPay();

  return (
    <div className="h-[100dvh] w-full bg-[#050508] dark:bg-[#050508] md:bg-[#090a0f] dark:bg-[#090a0f] flex items-center justify-center overflow-hidden animate-fade-in relative">
      
      {/* Premium Desktop Mock Workspace Background */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute top-[-25%] left-[-20%] w-[55rem] h-[55rem] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-25%] right-[-20%] w-[55rem] h-[55rem] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-[12%] left-[8%] text-white/20 text-[10px] font-bold font-display tracking-widest uppercase flex items-center gap-2">
          <span>TabKey Roster System</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Employee Portal Active</span>
        </div>
      </div>

      {/* iOS iPhone Mockup Container */}
      <div className="w-full h-full md:w-[390px] md:h-[820px] md:max-h-[92vh] md:rounded-xl md:border-[14px] border-[#e2e8f0] dark:border-[#1f212e] dark:border-slate-950 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] dark:md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] bg-[#f8fafc] dark:bg-[#090a0f] flex flex-col relative overflow-hidden md:outline md:outline-2 md:outline-slate-200/50 dark:md:outline-white/5 animate-fade-in shrink-0 transition-colors duration-250">
        
        {/* Glossy reflection sheen overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/0 via-white/4 to-white/0 z-25 rounded-xl" />

        {/* Mock iPhone Status Bar */}
        <div className="hidden md:flex shrink-0 h-10 w-full bg-white dark:bg-[#12131a] dark:bg-[#12131a] items-center justify-between px-6 pt-4 text-[10px] font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 relative z-30 select-none transition-colors duration-250">
          <span>9:41</span>
          <div className="w-24 h-5.5 bg-[#090a0f] dark:bg-[#090a0f] rounded-full absolute top-2.5 left-1/2 transform -translate-x-1/2 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-850 absolute right-4 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5 opacity-80">
            <span className="text-[9px]">5G</span>
            <div className="w-5 h-2.5 border border-slate-800 dark:border-[#e2e8f0] dark:border-[#1f212e] rounded-sm p-[1px] flex items-center">
              <div className="h-full w-4/5 bg-slate-800 dark:bg-slate-200 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* Real App Screen Inside Wrapper */}
        <div className="w-full flex-grow flex flex-col overflow-hidden bg-[#f8fafc] dark:bg-[#090a0f] h-full relative transition-colors duration-250">
          
          {/* Visual Header */}
          <header className="w-full bg-white dark:bg-[#12131a] dark:bg-[#12131a] border-b border-[#e2e8f0] dark:border-[#1f212e] p-5 shrink-0 flex items-center justify-between z-10 shadow-sm transition-colors duration-250">
            <div className="flex items-center gap-3">
              <div 
                style={{ backgroundColor: user.color || '#4F46E5' }} 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md text-sm uppercase relative"
              >
                {user.full_name.split(' ').map(n=>n[0]).join('')}
              </div>
              <div>
                <h1 className="text-base font-bold font-display text-slate-900 dark:text-slate-100 dark:text-slate-100 tracking-tight leading-none">{user.full_name}</h1>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-450 font-bold tracking-widest uppercase mt-1">TabKey Mobile Portal</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Theme toggle icon */}
              <button 
                onClick={() => {
                  document.documentElement.classList.toggle('dark');
                }}
                className="p-2 bg-[#f8fafc] dark:bg-[#090a0f] dark:bg-white dark:bg-[#12131a]/5 hover:bg-indigo-50 dark:hover:bg-white dark:bg-[#12131a]/10 text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-450 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all duration-200 cursor-pointer border border-[#e2e8f0] dark:border-[#1f212e] dark:border-white/5"
                title="Toggle Theme"
              >
                <Sun className="w-4 h-4 dark:hidden" />
                <Moon className="w-4 h-4 hidden dark:block" />
              </button>

              {/* Notification icon */}
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 bg-[#f8fafc] dark:bg-[#090a0f] dark:bg-white dark:bg-[#12131a]/5 hover:bg-indigo-50 dark:hover:bg-white dark:bg-[#12131a]/10 text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-450 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all duration-200 relative cursor-pointer border border-[#e2e8f0] dark:border-[#1f212e] dark:border-white/5"
              >
                <Bell className="w-4 h-4" />
                {notifications.some(n => n.unread) && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>

              <button 
                onClick={onLogout}
                className="p-2 bg-[#f8fafc] dark:bg-[#090a0f] dark:bg-white dark:bg-[#12131a]/5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-450 hover:text-rose-500 dark:hover:text-rose-450 rounded-xl transition-all duration-200 cursor-pointer border border-[#e2e8f0] dark:border-[#1f212e] dark:border-white/5"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* COMPLIANCE LOCKOUT FULL-SCREEN OVERLAY */}
          {unsignedMandatoryDocs.length > 0 && (
            <div className="absolute inset-0 bg-[#090a0f]/98 backdrop-blur-lg z-40 flex flex-col p-6 overflow-y-auto animate-fade-in text-white">
              <div className="flex flex-col items-center text-center space-y-4 my-auto py-6">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center shadow-lg border border-rose-500/40">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold font-display tracking-tight text-white">Compliance Lockout Active</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs font-semibold leading-relaxed">
                  TabKey Store policies require mandatory document sign-offs before accessing rosters, tasks, notice boards, or the daily clock terminal.
                </p>
              </div>

              {selectedDocToSign && (
                <div className="bg-white dark:bg-[#12131a]/5 border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-2xl space-y-4 flex-grow flex flex-col justify-between max-w-md w-full mx-auto">
                  <div className="space-y-2">
                    <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/35 rounded-lg text-[9px] uppercase tracking-widest font-bold font-display inline-block">
                      MANDATORY POLICY SIGN-OFF
                    </span>
                    <h3 className="text-lg font-bold font-display text-white">{selectedDocToSign.title}</h3>
                    <div className="h-44 overflow-y-auto bg-[#050508] dark:bg-[#050508]/60 p-4 border border-white/5 rounded-xl text-xs text-slate-300 font-medium leading-relaxed scrollbar-thin">
                      {selectedDocToSign.content}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block mb-1">
                        E-Signature (Type your full name to authorize)
                      </label>
                      <input 
                        type="text"
                        value={signatureNameInput}
                        onChange={(e) => setSignatureNameInput(e.target.value)}
                        placeholder={user.full_name}
                        className="w-full p-4 bg-[#050508] dark:bg-[#050508] border border-white/15 focus:border-indigo-500 rounded-xl text-sm font-bold text-white placeholder-white/20 outline-none transition-all"
                      />
                    </div>

                    <button 
                      onClick={handleSignDocument}
                      className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold font-display text-base shadow-xl shadow-rose-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserCheck className="w-5 h-5" />
                      <span>Authorize & Lift Lockout</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Progress Tracker */}
              <div className="pt-6 text-center text-[10px] text-slate-500 dark:text-slate-450 font-bold tracking-widest uppercase">
                Pending Documents: {unsignedMandatoryDocs.length} remaining
              </div>
            </div>
          )}

          {/* Simulated top dropdown notification feed */}
          {showNotifications && (
            <div className="absolute top-22 left-4 right-4 bg-white dark:bg-[#12131a]/95 backdrop-blur-md border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 shadow-2xl z-30 space-y-3 animate-slide-in">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold font-display uppercase tracking-widest">In-App Notifications</span>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:text-slate-400 dark:text-slate-500 p-0.5 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2.5">
                {notifications.map(n => (
                  <div key={n.id} className="flex gap-3 text-xs leading-tight">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.unread ? 'bg-indigo-600' : 'bg-transparent'}`} />
                    <div className="flex-grow">
                      <p className="font-bold text-slate-700">{n.text}</p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Achievements & Badges Modal */}
          {showAchievements && employeeProfile && (
            <div className="absolute inset-0 bg-[#090a0f] dark:bg-[#090a0f]/80 backdrop-blur-md z-30 flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-2xl space-y-6 max-w-sm w-full animate-scale-up relative">
                <button 
                  onClick={() => setShowAchievements(false)}
                  className="absolute top-4 right-4 p-2 bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-rose-50 text-slate-400 dark:text-slate-500 hover:text-rose-500 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-indigo-500/10 text-indigo-600 rounded-full flex items-center justify-center mx-auto border border-indigo-500/25">
                    <Award className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-slate-800 dark:text-slate-200 tracking-tight leading-none">Career Achievements</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                    Unlocked: <span className="text-indigo-600 font-bold font-display">{unlockedBadgesCount} / {badges.length} Badges</span>
                  </p>
                </div>

                <div className="space-y-3.5 max-h-68 overflow-y-auto pr-1">
                  {badges.map(badge => (
                    <div 
                      key={badge.id} 
                      className={`p-4 border rounded-xl flex items-center gap-4 transition-all ${
                        badge.unlocked 
                          ? 'bg-[#f8fafc] dark:bg-[#090a0f] border-indigo-100/80 shadow-sm' 
                          : 'bg-slate-100/40 border-[#e2e8f0] dark:border-[#1f212e] opacity-60'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white bg-gradient-to-br ${
                        badge.unlocked ? badge.color : 'from-slate-300 to-slate-400'
                      } shadow-md`}>
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div className="space-y-0.5 text-left">
                        <h4 className="text-xs font-bold font-display text-slate-800 dark:text-slate-200 leading-tight">{badge.title}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-450 leading-snug">{badge.desc}</p>
                        <span className={`text-[8px] font-bold font-display uppercase tracking-wider block mt-1 ${
                          badge.unlocked ? 'text-indigo-600' : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          {badge.unlocked ? '✓ Unlocked' : '🔒 Locked'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area (Scrolls) */}
          <main className="w-full flex-grow overflow-y-auto p-5 space-y-5 relative pb-28">
            
            {/* Tab 1: Notices (Home Feed) */}
            {activeTab === 'home' && (
              <div className="space-y-4 animate-fade-in">
                
                {/* Greeting & Achievements Card */}
                {employeeProfile && (
                  <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-500/20 rounded-xl p-6 shadow-xl text-white space-y-5">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold font-display tracking-tight leading-none">
                        Howdy, {employeeProfile.full_name.split(' ')[0]}! 🌀
                      </h2>
                      <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">
                        Ready to bake some premium scrolls today?
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center select-none pt-2 border-t border-white/5">
                      <div className="bg-white dark:bg-[#12131a]/5 p-3 rounded-xl border border-white/5">
                        <p className="text-[9px] text-indigo-200 font-bold font-display uppercase tracking-widest">Weekly Shifts</p>
                        <p className="text-lg font-bold font-display text-indigo-300 mt-0.5">
                          {shifts.length} shifts
                        </p>
                      </div>

                      <div className="bg-white dark:bg-[#12131a]/5 p-3 rounded-xl border border-white/5">
                        <p className="text-[9px] text-indigo-200 font-bold font-display uppercase tracking-widest">Scheduled Hours</p>
                        <p className="text-lg font-bold font-display text-indigo-300 mt-0.5">
                          {payInfo.totalHours.toFixed(1)} hrs
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dynamic Weekly Roster Summary Card */}
                {employeeProfile && shifts.length > 0 && (
                  <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Calendar className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold font-display text-slate-800 dark:text-slate-200 leading-none">Weekly Roster Summary</h3>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">Active Roster Week</p>
                        </div>
                      </div>
                      <span className="text-[9px] text-emerald-600 font-bold font-display bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-widest">Active</span>
                    </div>

                    <div className="flex items-baseline justify-between select-none">
                      <p className="text-2xl font-bold font-display text-slate-800 dark:text-slate-200 tracking-tight">
                        {payInfo.totalHours.toFixed(1)} hrs
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-450 font-bold">
                        {shifts.length} Shifts Scheduled
                      </p>
                    </div>

                    {/* Breakdown details */}
                    <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold font-display uppercase tracking-wider">
                      <span>Ordinary: {payInfo.ordHours.toFixed(1)}h</span>
                      {payInfo.satHours > 0 && <span className="text-indigo-600 font-bold font-display">Saturday: {payInfo.satHours.toFixed(1)}h</span>}
                      {payInfo.sunHours > 0 && <span className="text-amber-600 font-bold font-display">Sunday: {payInfo.sunHours.toFixed(1)}h</span>}
                    </div>
                  </div>
                )}

                <h2 className="text-sm font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-2">Notice Board Feed</h2>
                
                {feed.map(post => (
                  <div key={post.id} className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div 
                        style={{ backgroundColor: getProfileColor(post.author_id) }}
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs uppercase"
                      >
                        {getAuthorName(post.author_id).split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-none">{getAuthorName(post.author_id)}</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Published announcement</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base font-bold font-display text-slate-800 dark:text-slate-200">{post.title}</h4>
                      <p className="text-sm text-slate-650 dark:text-slate-400 dark:text-slate-500 leading-relaxed font-medium">{post.content}</p>
                    </div>

                    <div className="flex items-center gap-4 pt-2 border-t border-slate-50 text-slate-400 dark:text-slate-500 font-bold text-xs select-none">
                      <button 
                        onClick={() => handleLike(post.id)}
                        className="flex items-center gap-1.5 hover:text-indigo-600 active:scale-90 transition-all cursor-pointer"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>{post.likes} Likes</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.comments ? post.comments.length : 0} Comments</span>
                      </div>
                    </div>

                    {/* Post Comments List */}
                    {post.comments && post.comments.length > 0 && (
                      <div className="bg-[#f8fafc] dark:bg-[#090a0f]/50 p-4 rounded-xl space-y-3">
                        {post.comments.map((c, i) => (
                          <div key={i} className="text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200 mr-1.5">{c.author_name}:</span>
                            <span className="text-slate-650 dark:text-slate-400 dark:text-slate-500 font-medium">{c.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Write Comment */}
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={commentText[post.id] || ''}
                        onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                        placeholder="Write a comment..." 
                        className="flex-grow p-3 bg-[#f8fafc] dark:bg-[#090a0f] focus:bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl text-xs font-bold outline-none focus:border-indigo-200 transition-all duration-200"
                      />
                      <button 
                        onClick={() => handleAddComment(post.id)}
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl active:scale-95 transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Roster & Market */}
            {activeTab === 'roster' && (
              <div className="space-y-4 animate-fade-in">
                
                {/* Sub Tab Segmented Control */}
                <div className="bg-slate-100 p-1.5 rounded-xl grid grid-cols-2 text-center text-xs font-bold select-none">
                  <button 
                    onClick={() => setRosterSubTab('my-roster')}
                    className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                      rosterSubTab === 'my-roster' ? 'bg-white dark:bg-[#12131a] text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    My Shifts
                  </button>
                  <button 
                    onClick={() => setRosterSubTab('shift-market')}
                    className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                      rosterSubTab === 'shift-market' ? 'bg-white dark:bg-[#12131a] text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    Shift Market
                  </button>
                </div>

                {/* Sub-tab 1: My Shifts */}
                {rosterSubTab === 'my-roster' && (
                  <div className="space-y-4">
                    {shifts.length === 0 ? (
                      <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-8 text-center text-slate-400 dark:text-slate-500 font-bold">
                        You have no scheduled shifts assigned for this roster period.
                      </div>
                    ) : (
                      shifts.map(shift => {
                        const metrics = calculateShiftMetrics(shift, allShifts, true, user);
                        const isActive = isShiftActive(shift);
                        const coWorkers = getCoWorkers(shift.shift_date, user.id);

                        return (
                          <div key={shift.id} className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                            {isActive && (
                              <div className="absolute top-0 right-0 bg-emerald-500 text-white font-bold font-display uppercase text-[8px] tracking-widest px-3 py-1.5 rounded-bl-xl flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#12131a] animate-pulse" />
                                <span>Active Shift</span>
                              </div>
                            )}

                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <p className="text-[10px] text-indigo-600 font-bold font-display uppercase tracking-widest">
                                  {new Date(shift.shift_date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
                                </p>
                                <h3 className="text-lg font-bold font-display text-slate-800 dark:text-slate-200 tracking-tight leading-none">
                                  {shift.start_time} - {shift.end_time}
                                </h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">
                                  {metrics.paidDuration.toFixed(1)}h Paid • {metrics.unpaidBreakMins > 0 ? `${metrics.unpaidBreakMins}m unpaid break` : 'No break'}
                                </p>
                              </div>

                              <div className="text-right">
                                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-bold font-display uppercase tracking-widest inline-block ${
                                  shift.status === 'published' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                  {shift.status}
                                </span>
                              </div>
                            </div>

                            {/* Co-workers Section */}
                            {coWorkers.length > 0 && (
                              <div className="pt-3 border-t border-slate-50">
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-1.5">Scheduled with me:</p>
                                <div className="flex items-center gap-1.5">
                                  {coWorkers.map(cw => (
                                    <div 
                                      key={cw.id}
                                      style={{ backgroundColor: getProfileColor(cw.user_id) }}
                                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-[9px] uppercase shadow-sm relative group cursor-pointer"
                                      title={getAuthorName(cw.user_id)}
                                    >
                                      {getAuthorName(cw.user_id).split(' ').map(n=>n[0]).join('')}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            {shift.status === 'published' && (
                              <div className="pt-3 border-t border-slate-50 flex items-center justify-end">
                                <button 
                                  onClick={() => handleDropShift(shift)}
                                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-xl text-[10px] font-bold font-display uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Drop Shift</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Sub-tab 2: Shift Market Place */}
                {rosterSubTab === 'shift-market' && (
                  <div className="space-y-4">
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3 text-xs leading-relaxed font-semibold text-indigo-700">
                      <Sparkles className="w-5 h-5 shrink-0 text-indigo-600" />
                      <div>
                        <p className="font-bold">Franchise Shift Market</p>
                        <p className="text-[10px] text-indigo-500 font-medium">Coordinate shifts and request dynamic coverage within your team. All claims are automatically queued for store manager verification.</p>
                      </div>
                    </div>

                    {getMarketShifts().length === 0 ? (
                      <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-8 text-center text-slate-400 dark:text-slate-500 font-bold">
                        No open shifts available in the market. Check back later!
                      </div>
                    ) : (
                      getMarketShifts().map(mShift => {
                        const metrics = calculateShiftMetrics(mShift, allShifts, false);
                        const originalOwner = getAuthorName(mShift.user_id);

                        return (
                          <div key={mShift.id} className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 shadow-sm space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <p className="text-[10px] text-amber-600 font-bold font-display uppercase tracking-widest">
                                  {new Date(mShift.shift_date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
                                </p>
                                <h3 className="text-lg font-bold font-display text-slate-800 dark:text-slate-200 tracking-tight leading-none">
                                  {mShift.start_time} - {mShift.end_time}
                                </h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">
                                  {metrics.paidDuration.toFixed(1)}h Paid • Offered by: {originalOwner}
                                </p>
                              </div>

                              <button 
                                onClick={() => handleClaimShift(mShift)}
                                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold font-display uppercase tracking-wider shadow-md shadow-emerald-500/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span>Claim</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Time Clock */}
            {activeTab === 'clock' && (
              <div className="space-y-5 animate-fade-in flex flex-col items-center">
                <h2 className="text-sm font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest w-full text-left ml-1 mb-1">Attendance Terminal</h2>
                
                {/* GPS Geofence Mock Card */}
                <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 shadow-sm w-full space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-display uppercase tracking-widest">Simulated GPS Location</span>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold font-display uppercase tracking-widest ${
                      isInsideGeofence ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                      {isInsideGeofence ? 'Inside geofence' : 'Outside geofence'}
                    </span>
                  </div>

                  <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-2 text-center text-[10px] font-bold font-display uppercase tracking-wider select-none">
                    <button 
                      onClick={() => setIsInsideGeofence(true)}
                      className={`py-2 rounded-lg transition-all cursor-pointer ${
                        isInsideGeofence ? 'bg-white dark:bg-[#12131a] text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      📍 Store Range (10m)
                    </button>
                    <button 
                      onClick={() => setIsInsideGeofence(false)}
                      className={`py-2 rounded-lg transition-all cursor-pointer ${
                        !isInsideGeofence ? 'bg-white dark:bg-[#12131a] text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      ⚠️ Out of Bounds (150m)
                    </button>
                  </div>

                  <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-650 dark:text-slate-400 dark:text-slate-500 leading-normal">
                    {isInsideGeofence ? (
                      <>
                        <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
                        <p className="text-slate-500 dark:text-slate-450">GPS Verified: Within store geofence radius. Attendance clock enabled.</p>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                        <p className="text-slate-500 dark:text-slate-450">GPS Warning: Out-of-bounds clock blocked. Supervisor override required.</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Big Action Clock Button */}
                <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-8 shadow-md w-full flex flex-col items-center justify-center space-y-6 text-center">
                  
                  {/* Circular Clock State Widget */}
                  <div className={`w-44 h-44 rounded-full flex flex-col items-center justify-center border-4 shadow-lg transition-all duration-300 relative ${
                    activeClockState === 'in' ? 'border-indigo-500 bg-indigo-50/10 shadow-indigo-100' :
                    activeClockState === 'break' ? 'border-amber-500 bg-amber-50/10 shadow-amber-100' :
                    'border-[#e2e8f0] dark:border-[#1f212e] bg-[#f8fafc] dark:bg-[#090a0f]/20'
                  }`}>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-display uppercase tracking-widest leading-none mb-1">
                      {activeClockState === 'in' ? 'Clocked In' :
                       activeClockState === 'break' ? 'On Break' : 'Clocked Out'}
                    </p>
                    <p className="text-2xl font-bold font-display text-slate-800 dark:text-slate-200 tracking-tight">{elapsedTime}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="w-full grid grid-cols-2 gap-3 shrink-0">
                    {activeClockState === 'out' ? (
                      <button 
                        onClick={handleClockIn}
                        className="col-span-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-lg shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        <span>Clock In</span>
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={handleToggleBreak}
                          className={`py-4 text-white rounded-xl font-bold font-display text-base active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            activeClockState === 'break' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'
                          }`}
                        >
                          <Coffee className="w-5 h-5" />
                          <span>{activeClockState === 'break' ? 'End Break' : 'Start Break'}</span>
                        </button>

                        <button 
                          onClick={handleClockOut}
                          className="py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold font-display text-base active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Clock className="w-5 h-5" />
                          <span>Clock Out</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Shift History Logs */}
                <div className="w-full space-y-3">
                  <h3 className="text-xs font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Clock Activity Logs</h3>
                  {timeLogs.length === 0 ? (
                    <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 text-center text-slate-400 dark:text-slate-500 text-xs font-bold">
                      No clock logs registered today.
                    </div>
                  ) : (
                    timeLogs.map(log => (
                      <div key={log.id} className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 shadow-sm text-xs font-bold flex items-center justify-between text-slate-650 dark:text-slate-400 dark:text-slate-500">
                        <div className="space-y-1">
                          <p className="text-slate-800 dark:text-slate-200">
                            {new Date(log.clock_in).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 leading-tight">
                            In: {new Date(log.clock_in).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                            {log.clock_out && ` • Out: ${new Date(log.clock_out).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`}
                          </p>
                          {log.notes && (
                            <span className="text-[9px] text-indigo-500 block font-medium mt-1 bg-indigo-50 px-2 py-0.5 rounded-lg w-max max-w-[200px] truncate" title={log.notes}>
                              {log.notes}
                            </span>
                          )}
                        </div>

                        <div>
                          {log.is_approved ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[9px] uppercase tracking-widest">
                              Approved
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-500 dark:text-slate-450 border border-[#e2e8f0] dark:border-[#1f212e] rounded-lg text-[9px] uppercase tracking-widest">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Tasks (Checklist) */}
            {activeTab === 'tasks' && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-sm font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-2">My Daily Checklist</h2>
                
                {tasks.length === 0 ? (
                  <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-8 text-center text-slate-400 dark:text-slate-500 font-bold">
                    You have no assigned tasks for today.
                  </div>
                ) : (
                  tasks.map(task => (
                    <div 
                      key={task.id} 
                      onClick={() => handleToggleTask(task.id, task.is_completed)}
                      className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 shadow-sm flex items-center gap-4 select-none cursor-pointer transition-all duration-200 active:scale-[0.99]"
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                        task.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[#e2e8f0] dark:border-[#1f212e] text-transparent bg-[#f8fafc] dark:bg-[#090a0f] hover:bg-slate-100'
                      }`}>
                        <Check className="w-4 h-4 stroke-[3px]" />
                      </div>

                      <span className={`text-sm font-bold transition-all duration-200 ${
                        task.is_completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {task.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 5: Leaves */}
            {activeTab === 'leaves' && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-sm font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1">Leave Requests</h2>

                {/* Request form */}
                <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-200 leading-none">Submit Leave Request</h3>
                  
                  <form onSubmit={handleRequestLeave} className="space-y-3.5 text-xs text-slate-700">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block mb-1">Leave Type</label>
                        <select 
                          value={leaveType}
                          onChange={(e) => setLeaveType(e.target.value)}
                          className="w-full p-3 bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl outline-none font-bold"
                        >
                          <option value="Annual">Annual Leave</option>
                          <option value="Sick Leave">Sick Leave</option>
                          <option value="Personal">Personal Leave</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block mb-1">Reason</label>
                        <input 
                          type="text"
                          value={leaveReason}
                          onChange={(e) => setLeaveReason(e.target.value)}
                          placeholder="e.g. Travel, Dental, Medical"
                          className="w-full p-3 bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl outline-none font-bold placeholder-slate-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block mb-1">Start Date</label>
                        <input 
                          type="date"
                          value={leaveStart}
                          onChange={(e) => setLeaveStart(e.target.value)}
                          className="w-full p-3 bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl outline-none font-bold text-slate-650 dark:text-slate-400 dark:text-slate-500"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block mb-1">End Date</label>
                        <input 
                          type="date"
                          value={leaveEnd}
                          onChange={(e) => setLeaveEnd(e.target.value)}
                          className="w-full p-3 bg-[#f8fafc] dark:bg-[#090a0f] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl outline-none font-bold text-slate-650 dark:text-slate-400 dark:text-slate-500"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-display text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                    >
                      File Leave Request
                    </button>
                  </form>
                </div>

                {/* Leaves list */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">My Leave History</h3>
                  
                  {leaveRequests.length === 0 ? (
                    <div className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-5 text-center text-slate-400 dark:text-slate-500 text-xs font-bold">
                      No leave requests filed yet.
                    </div>
                  ) : (
                    leaveRequests.map(leave => (
                      <div key={leave.id} className="bg-white dark:bg-[#12131a] border border-[#e2e8f0] dark:border-[#1f212e] rounded-xl p-4 shadow-sm text-xs font-bold flex items-center justify-between text-slate-650 dark:text-slate-400 dark:text-slate-500">
                        <div>
                          <p className="text-slate-800 dark:text-slate-200">{leave.leave_type} Leave</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                            {new Date(leave.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - {new Date(leave.end_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </p>
                          {leave.employee_notes && (
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-normal italic mt-0.5">"{leave.employee_notes}"</p>
                          )}
                        </div>

                        <div>
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-widest ${
                            leave.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            leave.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {leave.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </main>

          {/* Floating Bottom Navigation Menu (Connecteam-Style) locked absolutely inside the mobile viewport */}
          <nav className="absolute bottom-4 left-4 right-4 h-18 rounded-xl bg-white dark:bg-[#12131a]/85 backdrop-blur-xl border border-[#e2e8f0] dark:border-[#1f212e]/40 shadow-xl z-20 flex items-center justify-around px-2">
            <button 
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center gap-1 font-bold text-[9px] tracking-wider transition-colors duration-200 cursor-pointer ${
                activeTab === 'home' ? 'text-indigo-600 font-bold font-display' : 'text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:text-slate-400 dark:text-slate-500'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>

            <button 
              onClick={() => setActiveTab('roster')}
              className={`flex flex-col items-center gap-1 font-bold text-[9px] tracking-wider transition-colors duration-200 cursor-pointer ${
                activeTab === 'roster' ? 'text-indigo-600 font-bold font-display' : 'text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:text-slate-400 dark:text-slate-500'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span>Roster</span>
            </button>

            <button 
              onClick={() => setActiveTab('clock')}
              className={`flex flex-col items-center gap-1 font-bold text-[9px] tracking-wider transition-colors duration-200 cursor-pointer ${
                activeTab === 'clock' ? 'text-indigo-600 font-bold font-display' : 'text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:text-slate-400 dark:text-slate-500'
              }`}
            >
              <Clock className="w-5 h-5" />
              <span>Clock</span>
            </button>

            <button 
              onClick={() => setActiveTab('tasks')}
              className={`flex flex-col items-center gap-1 font-bold text-[9px] tracking-wider transition-colors duration-200 cursor-pointer ${
                activeTab === 'tasks' ? 'text-indigo-600 font-bold font-display' : 'text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:text-slate-400 dark:text-slate-500'
              }`}
            >
              <CheckSquare className="w-5 h-5" />
              <span>Tasks</span>
            </button>

            <button 
              onClick={() => setActiveTab('leaves')}
              className={`flex flex-col items-center gap-1 font-bold text-[9px] tracking-wider transition-colors duration-200 cursor-pointer ${
                activeTab === 'leaves' ? 'text-indigo-600 font-bold font-display' : 'text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:text-slate-400 dark:text-slate-500'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Leaves</span>
            </button>
          </nav>

          {/* iOS bottom home indicator line */}
          <div className="hidden md:flex h-5 w-full bg-white dark:bg-[#12131a] flex items-center justify-center shrink-0 pb-1 z-30 select-none pointer-events-none">
            <div className="w-28 h-1 bg-slate-800 rounded-full" />
          </div>

        </div>
      </div>



      {/* Elegant Switch Loading Overlay */}
      {loadingOverlay && (
        <div className="fixed inset-0 bg-[#090a0f] dark:bg-[#090a0f]/80 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center animate-fade-in">
          <div className="space-y-4">
            <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
            <h3 className="text-white text-lg font-bold font-display tracking-tight leading-none">Switching Demo Portals</h3>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">Entering {targetPortal} Mode...</p>
          </div>
        </div>
      )}

    </div>
  );
}
