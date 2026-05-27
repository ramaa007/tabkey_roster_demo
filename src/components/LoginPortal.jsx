import React, { useState } from 'react';
import logo from '../assets/logo.svg';
import { supabase } from '../core/mock-db';

export default function LoginPortal({ onLoginSuccess }) {
  const logoUrl = localStorage.getItem('custom_logo_url') || logo;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Query the profiles collection dynamically from database (live Supabase or offline mock adapter)
      const { data: userRecord, error: dbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (dbError || !userRecord) {
        setLoading(false);
        setError('Invalid email or password.');
        return;
      }

      // Verify the password matching the db profile record
      if (userRecord.temp_password !== password.trim()) {
        setLoading(false);
        setError('Invalid email or password.');
        return;
      }

      setLoading(false);
      onLoginSuccess(userRecord);
    } catch (err) {
      console.error("Database connection exception caught:", err);
      setLoading(false);
      setError(`Database handshake error: ${err.message || 'Failed to connect'}.`);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-[#f8fafc] dark:bg-[#090a0f] text-slate-800 dark:text-slate-200 flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-y-auto transition-colors duration-250">
      {/* Absolute Background Circles for Premium Feel */}
      <div className="absolute top-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="tabkey-glass-card max-w-md w-full p-8 md:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border border-slate-200/50 dark:border-white/10 text-center relative z-10 shrink-0 my-auto animate-fade-in transition-all duration-300">
        <img src={logoUrl} alt="TabKey Logo" className="w-48 h-auto object-contain mx-auto mb-6 dark:brightness-110 select-none pointer-events-none" />
        
        <h2 className="text-xl font-black font-display text-slate-900 dark:text-slate-100 tracking-tight leading-none mb-2">Welcome to TabKey 🌀</h2>
        <p className="text-indigo-650 dark:text-indigo-400 font-extrabold uppercase tracking-widest text-[9px] mb-8">Workforce Roster & Attendance Portal</p>
 
        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold text-left animate-fade-in">
            {error}
          </div>
        )}
 
        <div className="space-y-4 text-left">
          <div>
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
              className="w-full p-3.5 bg-white/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm font-semibold outline-none transition-all duration-300 text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 shadow-sm" 
              placeholder="name@company.com" 
              disabled={loading}
            />
          </div>
 
          <div>
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
              className="w-full p-3.5 bg-white/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm font-semibold outline-none transition-all duration-300 text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 shadow-sm" 
              placeholder="••••••••" 
              disabled={loading}
            />
          </div>
 
          <button 
            onClick={handleSignIn}
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl font-extrabold text-sm shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.55)] active:scale-[0.98] disabled:opacity-50 transition-all duration-300 mt-6 flex items-center justify-center cursor-pointer border-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/35 border-t-white rounded-full animate-spin" />
            ) : (
              'Sign In 🔐'
            )}
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-slate-400 dark:text-slate-650 font-bold text-[10px] mt-6 z-0 pointer-events-none uppercase tracking-widest">
        <p>&copy; 2026 TabKey Digital (🚀 A premium digital initiative by Square Connect)</p>
      </div>
    </div>
  );
}
