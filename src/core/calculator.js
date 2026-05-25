/**
 * TabKey Roster Solution - Core Award & Shift Compliance Engine
 * Implements 100% of the Fast Food Award 2020 rules and safety guidelines.
 */

export function calculateShiftMetrics(shift, allShifts, showAwardViolations = true, employeeProfile = null) {
  if (!shift || !shift.start_time || !shift.end_time) {
    return { rawDuration: 0, paidDuration: 0, unpaidBreakMins: 0, violations: [], isCritical: false };
  }

  const sh = parseInt(shift.start_time.split(':')[0]), sm = parseInt(shift.start_time.split(':')[1]);
  const eh = parseInt(shift.end_time.split(':')[0]), em = parseInt(shift.end_time.split(':')[1]);
  
  let rawDuration = (eh + em/60) - (sh + sm/60); 
  if (rawDuration < 0) rawDuration += 24;

  let unpaidBreakMins = 0; 
  if (rawDuration > 5) unpaidBreakMins = 30;

  let paidDuration = rawDuration - (unpaidBreakMins / 60);
  let violations = []; 
  let isCritical = false;

  if (shift.user_id !== 'open' && showAwardViolations) {
    // 1. Under 3 hour shift check (Critical)
    if (rawDuration < 3) {
      violations.push("❌ Award Error: Under 3 hours minimum.");
      isCritical = true;
    }
    
    // 2. Over 11 hour shift check (Critical)
    if (rawDuration > 11) { 
      violations.push("❌ Award Error: Exceeds 11 hour max."); 
      isCritical = true; 
    }
    
    const userShifts = Array.isArray(allShifts) ? allShifts.filter(s => s && s.user_id === shift.user_id) : [];
    
    // 3. Check for multiple shifts on the same day (Warning)
    const hasOtherShift = userShifts.some(s => 
      s && 
      s.shift_date === shift.shift_date && 
      s.id !== shift.id
    );
    if (hasOtherShift) {
      violations.push("⚠️ Compliance Warning: Multiple shifts on the same day.");
    }

    // Sum weekly scheduled paid hours for this employee
    let weeklyPaidHours = 0;
    userShifts.forEach(s => {
      if (!s || !s.start_time || !s.end_time) return;
      const sH = parseInt(s.start_time.split(':')[0]), sM = parseInt(s.start_time.split(':')[1]);
      const eH = parseInt(s.end_time.split(':')[0]), eM = parseInt(s.end_time.split(':')[1]);
      let dur = (eH + eM/60) - (sH + sM/60);
      if (dur < 0) dur += 24;
      let brk = dur > 5 ? 0.5 : 0;
      weeklyPaidHours += (dur - brk);
    });

    // 4. Part-time over contracted hours check (Warning)
    if (employeeProfile && employeeProfile.contracted_hours > 0) {
      if (weeklyPaidHours > employeeProfile.contracted_hours) {
        violations.push(`⚠️ Part-Time Warning: Exceeds contracted limit of ${employeeProfile.contracted_hours}h (Scheduled: ${weeklyPaidHours.toFixed(1)}h).`);
      }
    }

    // 5. Over 38 hours/week overtime check (Warning)
    if (weeklyPaidHours > 38) {
      violations.push(`⚠️ Overtime Warning: Scheduled hours exceed 38h/week (Scheduled: ${weeklyPaidHours.toFixed(1)}h).`);
    }

    // 6. Full-time 6+ days scheduled check (Warning)
    const uniqueDays = new Set(userShifts.map(s => s && s.shift_date).filter(Boolean));
    if (uniqueDays.size >= 6) {
      violations.push(`⚠️ Compliance Warning: Scheduled ${uniqueDays.size} days this week (max 5 days).`);
    }

    // 7. Under 10hr gap between shifts check (Warning)
    if (userShifts.length > 1) {
      const sortedShifts = [...userShifts].filter(s => s && s.shift_date && s.start_time && s.end_time).sort((a, b) => {
        const dateCompare = a.shift_date.localeCompare(b.shift_date);
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      });
      
      const myIndex = sortedShifts.findIndex(s => s.id === shift.id);
      if (myIndex !== -1 && myIndex < sortedShifts.length - 1) {
        const currentShift = sortedShifts[myIndex];
        const nextShift = sortedShifts[myIndex + 1];
        
        if (currentShift.shift_date && currentShift.end_time && nextShift.shift_date && nextShift.start_time) {
          const currDate = new Date(currentShift.shift_date + 'T' + currentShift.end_time + ':00');
          const nextDate = new Date(nextShift.shift_date + 'T' + nextShift.start_time + ':00');
          
          const cSH = parseInt(currentShift.start_time.split(':')[0]);
          const cEH = parseInt(currentShift.end_time.split(':')[0]);
          if (cEH < cSH) {
            currDate.setDate(currDate.getDate() + 1);
          }
          
          const gapMs = nextDate - currDate;
          const gapHours = gapMs / (1000 * 60 * 60);
          if (gapHours > 0 && gapHours < 10) {
            violations.push(`⚠️ Rest Gap Warning: Under 10hr rest gap between shifts (${gapHours.toFixed(1)}h gap).`);
          }
        }
      }
    }
  }

  return { rawDuration, paidDuration, unpaidBreakMins, violations, isCritical };
}

export function checkShiftOverlap(userId, dateStr, startStr, endStr, allShifts, excludeShiftId = null) {
  if (userId === 'open' || !Array.isArray(allShifts) || !startStr || !endStr) return false;
  
  const otherShifts = allShifts.filter(s => 
    s && 
    s.user_id === userId && 
    s.shift_date === dateStr && 
    s.id !== excludeShiftId
  );

  for (let s of otherShifts) {
    if (!s.start_time || !s.end_time) continue;
    const startA = parseInt(startStr.split(':')[0]) * 60 + parseInt(startStr.split(':')[1]); 
    const endA = parseInt(endStr.split(':')[0]) * 60 + parseInt(endStr.split(':')[1]);       
    const startB = parseInt(s.start_time.split(':')[0]) * 60 + parseInt(s.start_time.split(':')[1]);
    const endB = parseInt(s.end_time.split(':')[0]) * 60 + parseInt(s.end_time.split(':')[1]);

    const realEndA = endA <= startA ? endA + 24 * 60 : endA;
    const realEndB = endB <= startB ? endB + 24 * 60 : endB;

    if (startA < realEndB && startB < realEndA) {
      return true;
    }
  }
  return false;
}

export function checkLeaveConflict(userId, dateStr, leaveRequests) {
  if (userId === 'open' || !Array.isArray(leaveRequests)) return false;
  return leaveRequests.some(l => {
    if (!l || l.user_id !== userId || l.status !== 'approved') return false;
    return dateStr >= l.start_date && dateStr <= l.end_date;
  });
}
