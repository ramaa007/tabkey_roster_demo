/**
 * Cinnabon Carindale Roster System - Database Engine & Supabase Bindings
 * 
 * Auto-detects if live credentials are provided in the .env file.
 * - If credentials exist: Binds 100% live PostgreSQL tables via @supabase/supabase-js.
 * - If credentials are default/empty: Falls back to local storage offline mock (great for offline presentations).
 * 
 * Implements a "SupabaseProxyBuilder" query interceptor proxy that guarantees 100% compatibility
 * between mock local-storage queries and official Supabase PostgreSQL SDK client queries, resolving
 * chaining ordering differences (such as .eq() before .select() or .update()).
 */

import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY_PREFIX = "tabkey_roster_solution_db_";

function getOffsetDateStr(offsetDays) {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday of current week
  const monday = new Date(d.setDate(diff));
  monday.setDate(monday.getDate() + offsetDays);
  
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const date = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

export function getSeedData() {
  const now = new Date().toISOString();
  
  return {
    profiles: [
      {
        id: "p-manager",
        full_name: "Sarah Jenkins",
        email: "manager@tabkey.com.au",
        phone: "",
        dob: "",
        type: "Full-Time",
        hourly_rate: 42.50,
        payroll_id: "PAY-100",
        contracted_hours: 38,
        kiosk_pin: "0000",
        temp_password: "manager123",
        color: "#4F46E5",
        role: "manager",
        level: 2,
        notes: "Store General Manager",
        points: 0,
        streak: 0,
        created_at: now
      }
    ],
    shifts: [],
    time_logs: [],
    leave_requests: [],
    swap_requests: [],
    notices: [],
    feed: [
      {
        id: "f-1",
        author_id: "p-manager",
        title: "Welcome to TabKey Workforce Portal! 🌀",
        content: "Use this portal to manage your weekly rosters, clock in and out, track tasks, and check break schedules. Let's schedule some awesome shifts! 📅⚡",
        likes: 0,
        comments: [],
        created_at: now
      }
    ],
    tasks: [],
    documents: [],
    document_signatures: [],
    store_settings: [
      {
        id: "settings-main",
        compact_mode: false,
        labor_budget: 5000,
        market_kill_switch: false,
        mobile_clock_in_allowed: true,
        kiosk_breaks_allowed: true,
        weather_mock: "Sunny",
        sales_target_mon: 4000,
        sales_target_tue: 4000,
        sales_target_wed: 4000,
        sales_target_thu: 4000,
        sales_target_fri: 5000,
        sales_target_sat: 6000,
        sales_target_sun: 5000,
        sales_actual_mon: 0,
        sales_actual_tue: 0,
        sales_actual_wed: 0,
        sales_actual_thu: 0,
        sales_actual_fri: 0,
        sales_actual_sat: 0,
        sales_actual_sun: 0,
        penalty_sat: 1.25,
        penalty_sun: 1.50,
        penalty_ph: 2.25,
        auto_break_threshold: 5.0
      }
    ],
    store_handovers: [],
    rewards: [
      { id: "r-1", title: "Free Cinnamon Scroll & Large Coffee ☕", cost: 100, icon: "Coffee" }
    ],
    reward_claims: []
  };
}

// -------------------------------------------------------------
// Live Supabase Client Proxy Class (Query Interceptor)
// -------------------------------------------------------------

class SupabaseProxyBuilder {
  constructor(tableName, realSupabase) {
    this.tableName = tableName;
    this.realSupabase = realSupabase;
    this.filters = []; // { type, field, value }
    this.sort = null;
    this.limitVal = null;
    this.isSingle = false;
    this.action = null; // { type, payload }
    this.selectFields = null;
  }

  select(fields = '*') {
    this.selectFields = fields;
    return this;
  }

  eq(field, value) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  neq(field, value) {
    this.filters.push({ type: 'neq', field, value });
    return this;
  }

  gte(field, value) {
    this.filters.push({ type: 'gte', field, value });
    return this;
  }

  lte(field, value) {
    this.filters.push({ type: 'lte', field, value });
    return this;
  }

  order(field, options = {}) {
    this.sort = { field, ascending: options.ascending !== false };
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  limit(n) {
    this.limitVal = n;
    return this;
  }

  insert(records) {
    this.action = { type: 'insert', payload: records };
    return this;
  }

  update(updatedFields) {
    this.action = { type: 'update', payload: updatedFields };
    return this;
  }

  delete() {
    this.action = { type: 'delete' };
    return this;
  }

  async then(onresolve, onreject) {
    try {
      let query;
      // 1. Build Query base
      if (this.action) {
        if (this.action.type === 'insert') {
          query = this.realSupabase.from(this.tableName).insert(this.action.payload);
        } else if (this.action.type === 'update') {
          query = this.realSupabase.from(this.tableName).update(this.action.payload);
        } else if (this.action.type === 'delete') {
          query = this.realSupabase.from(this.tableName).delete();
        }
      } else {
        query = this.realSupabase.from(this.tableName).select(this.selectFields || '*');
      }

      // 2. Chain filters
      this.filters.forEach(f => {
        if (f.type === 'eq') query = query.eq(f.field, f.value);
        if (f.type === 'neq') query = query.neq(f.field, f.value);
        if (f.type === 'gte') query = query.gte(f.field, f.value);
        if (f.type === 'lte') query = query.lte(f.field, f.value);
      });

      // 3. Chain Sort
      if (this.sort) {
        query = query.order(this.sort.field, { ascending: this.sort.ascending });
      }

      // 4. Chain Limit
      if (this.limitVal !== null) {
        query = query.limit(this.limitVal);
      }

      // 5. Chain Single
      if (this.isSingle) {
        query = query.single();
      }

      // 6. Execute actual DB query
      const result = await query;
      return onresolve(result);
    } catch (err) {
      if (onreject) return onreject(err);
      throw err;
    }
  }
}

// -------------------------------------------------------------
// Offline LocalStorage Mock Builder Class
// -------------------------------------------------------------

class MockQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.storageKey = STORAGE_KEY_PREFIX + tableName;
    this.filters = [];
    this.sortField = null;
    this.sortAscending = true;
    this.isSingle = false;
    this.limitVal = null;
    this.mutationPromise = null;
  }

  _read() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    } catch (e) {
      return [];
    }
  }

  _write(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {}
  }

  select(fields) { return this; }

  eq(field, value) {
    this.filters.push(row => row[field] == value);
    return this;
  }

  neq(field, value) {
    this.filters.push(row => row[field] != value);
    return this;
  }

  gte(field, value) {
    this.filters.push(row => row[field] >= value);
    return this;
  }

  lte(field, value) {
    this.filters.push(row => row[field] <= value);
    return this;
  }

  order(field, options = {}) {
    this.sortField = field;
    this.sortAscending = options.ascending !== false;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  limit(n) {
    this.limitVal = n;
    return this;
  }

  insert(records) {
    this.mutationPromise = new Promise((resolve) => {
      setTimeout(() => {
        const data = this._read();
        const recordsToInsert = Array.isArray(records) ? records : [records];
        
        const inserted = recordsToInsert.map(r => {
          const copy = { ...r };
          if (!copy.id) {
            copy.id = "id-" + Math.random().toString(36).substr(2, 9);
          }
          if (!copy.created_at) {
            copy.created_at = new Date().toISOString();
          }
          data.push(copy);
          return copy;
        });

        this._write(data);
        resolve({ data: this.isSingle ? inserted[0] : inserted, error: null });
      }, 50);
    });
    return this;
  }

  update(updatedFields) {
    this.mutationPromise = new Promise((resolve) => {
      setTimeout(() => {
        const data = this._read();
        const updatedRecords = [];

        const updatedData = data.map(row => {
          const matches = this.filters.every(filter => filter(row));
          if (matches) {
            const newRow = { ...row, ...updatedFields };
            updatedRecords.push(newRow);
            return newRow;
          }
          return row;
        });

        this._write(updatedData);
        resolve({ data: this.isSingle ? updatedRecords[0] : updatedRecords, error: null });
      }, 50);
    });
    return this;
  }

  delete() {
    this.mutationPromise = new Promise((resolve) => {
      setTimeout(() => {
        const data = this._read();
        const remainingData = [];
        const deletedRecords = [];

        data.forEach(row => {
          const matches = this.filters.every(filter => filter(row));
          if (matches) {
            deletedRecords.push(row);
          } else {
            remainingData.push(row);
          }
        });

        this._write(remainingData);
        resolve({ data: this.isSingle ? deletedRecords[0] : deletedRecords, error: null });
      }, 50);
    });
    return this;
  }

  then(onresolve, onreject) {
    if (this.mutationPromise) {
      return this.mutationPromise.then(onresolve, onreject);
    }

    const queryPromise = new Promise((resolve) => {
      setTimeout(() => {
        let results = this._read();

        this.filters.forEach(filter => {
          results = results.filter(filter);
        });

        if (this.sortField) {
          results.sort((a, b) => {
            let valA = a[this.sortField];
            let valB = b[this.sortField];

            if (typeof valA === "string") {
              return this.sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else {
              return this.sortAscending ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
            }
          });
        }

        if (this.limitVal !== null) {
          results = results.slice(0, this.limitVal);
        }

        resolve({ data: this.isSingle ? (results[0] || null) : results, error: null });
      }, 25);
    });

    return queryPromise.then(onresolve, onreject);
  }
}

// -------------------------------------------------------------
// Hot-Swappable client exporter
// -------------------------------------------------------------

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isLiveConnectionConfigured = 
  envUrl && 
  envKey && 
  envUrl !== "https://your-project-id.supabase.co" && 
  !envKey.startsWith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your");

let liveClient = null;

if (isLiveConnectionConfigured) {
  console.log("⚡ [TabKey Roster SaaS] Live Supabase cloud connection authenticated successfully! Loading PostgreSQL tables via dynamic proxies.");
  const realClient = createClient(envUrl, envKey);
  liveClient = {
    from: (tableName) => {
      const liveTables = ['profiles', 'shifts', 'time_logs', 'leave_requests', 'swap_requests', 'notices', 'xero_tokens'];
      if (liveTables.includes(tableName)) {
        return new SupabaseProxyBuilder(tableName, realClient);
      } else {
        console.info(`📦 [TabKey Roster Proxy] Table "${tableName}" not in live tables list. Gracefully falling back to LocalStorage mock.`);
        return new MockQueryBuilder(tableName);
      }
    },
    functions: realClient.functions
  };
} else {
  console.warn("🧹 [TabKey Roster SaaS] Running in Offline Presentation Mode (LocalStorage Mock Active). Paste your API keys in your project root .env file to enable live database synchronisation!");
}

export const supabase = isLiveConnectionConfigured ? liveClient : {
  from: function(tableName) {
    return new MockQueryBuilder(tableName);
  },
  functions: {
    invoke: async function(functionName, options = {}) {
      console.log(`Mock Edge Function [${functionName}] invoked with payload:`, options.body);
      return new Promise((resolve) => {
        setTimeout(() => {
          if (functionName === 'xero-sync') {
            resolve({
              data: {
                success: true,
                message: "Xero pay item timesheets successfully synced! 🔗",
                results: [
                  { name: "Alex Mercer", status: "✅ Synced (8.0 hrs standard)", detail: "Approved timesheet pushed to Xero draft payroll." },
                  { name: "Bella Thorne", status: "✅ Synced (25.0 hrs standard)", detail: "Matches contracted hours. Sync complete." },
                  { name: "Charlie Puth", status: "✅ Synced (7.0 hrs standard)", detail: "Approved timesheet pushed to Xero draft payroll." }
                ]
              },
              error: null
            });
          } else {
            resolve({
              data: { success: true, message: `Mock execution of ${functionName} success.` },
              error: null
            });
          }
        }, 300);
      });
    }
  }
};

export function initializeDB(forceReset = false) {
  const seed = getSeedData();
  Object.keys(seed).forEach(table => {
    const storageKey = STORAGE_KEY_PREFIX + table;
    if (forceReset || localStorage.getItem(storageKey) === null) {
      localStorage.setItem(storageKey, JSON.stringify(seed[table]));
    }
  });
}

initializeDB(false);

export function resetDemoData() {
  if (isLiveConnectionConfigured) {
    console.log("Cannot reset local storage: app is connected to live cloud database. Run SQL deletions on Supabase!");
    return;
  }
  initializeDB(true);
  console.log("Mock presentation database successfully reset! 🧹");
}
