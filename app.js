/* ==========================================================================
   Snag Observation & Management System - Core Application Logic
   ========================================================================== */

// Admin Password Constant
const ADMIN_PASSWORD = 'Satya@1996';

// Permanent Default Firebase Configuration (Fresh Project: snag-tracker-9fae8)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBLCFUqrtnfBkuSc2oRsSJULhYtQHk0SXI",
  authDomain: "snag-tracker-9fae8.firebaseapp.com",
  projectId: "snag-tracker-9fae8",
  storageBucket: "snag-tracker-9fae8.firebasestorage.app",
  messagingSenderId: "492381139800",
  appId: "1:492381139800:web:7358dd1cda7f21a67c6b2d"
};

// Global Application State
let knownSnagIds = new Set();
let knownSnagAssignments = new Map();

const STATE = {
  activeSection: 'user', // 'user' or 'admin'
  activeAdminTab: 'tracking', // 'tracking' or 'users'
  currentUser: null, // Logged in user object
  isAdminAuthenticated: false,
  mediaStream: null,
  facingMode: 'environment', // 'user' or 'environment'
  capturedPhotoDataUrl: null,
  stagedClosurePhoto: null,
  removeClosurePhotoFlag: false,
  userGps: { lat: 12.9716, lng: 77.5946, text: '12.9716° N, 77.5946° E' },
  activeDetailSnagId: null,
  isFirebaseActive: false,
  db: null,
  storage: null,
  auth: null,
  messaging: null
};

// ==========================================================================
// IndexedDB PC Local Storage Engine for High-Res Photos (Uses PC Hard Disk)
// ==========================================================================
const PhotoDB = {
  dbName: 'SnagPhotoPCStore',
  dbVersion: 1,
  db: null,

  async init() {
    return new Promise((resolve) => {
      if (this.db) return resolve(this.db);
      try {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        request.onerror = (e) => {
          console.warn('IndexedDB PC Store open error:', e);
          resolve(null);
        };
        request.onsuccess = (e) => {
          this.db = e.target.result;
          console.log('💾 IndexedDB PC Photo Store Ready (Storing photos on PC disk)');
          resolve(this.db);
        };
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('photos')) {
            db.createObjectStore('photos');
          }
        };
      } catch (err) {
        console.warn('IndexedDB not supported or blocked:', err);
        resolve(null);
      }
    });
  },

  async savePhoto(photoKey, dataUrl) {
    if (!dataUrl) return false;
    if (!this.db) await this.init();
    if (!this.db) return false;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');
        store.put(dataUrl, photoKey);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  async getPhoto(photoKey) {
    if (!this.db) await this.init();
    if (!this.db) return null;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('photos', 'readonly');
        const store = tx.objectStore('photos');
        const req = store.get(photoKey);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  },

  async removePhoto(photoKey) {
    if (!this.db) await this.init();
    if (!this.db) return false;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');
        store.delete(photoKey);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }
};

// Dynamic Building Location & Floor Options Store (NAB-DT3 -> 3rd; NAB-DT4 -> 1st, 4th, 5th, 6th)
let SITE_LOCATIONS = {
  buildings: ['NAB-DT3', 'NAB-DT4'],
  floors: ['1st', '3rd', '4th', '5th', '6th'],
  buildingFloors: {
    'NAB-DT3': ['3rd'],
    'NAB-DT4': ['1st', '4th', '5th', '6th']
  }
};

// Registered System Users Database (Contact Team Details from image (10) with default password Admin@123)
const DEFAULT_SYSTEM_USERS = [
  { id: 'usr_admin', name: 'Admin', mobile: '7008952166', email: 'admin@site.com', password: 'Satya@1996', role: 'Admin', category: 'General', created: '2026-01-01' },
  { id: 'usr_sanjay', name: 'Sanjay', mobile: '9560184825', email: 'er.sanjaykumar5986@gmail.com', password: 'Admin@123', role: 'BMS Operator', category: 'General', created: '2026-01-01' },
  { id: 'usr_sandeep', name: 'Sandeep', mobile: '7027008682', email: 'sandeeprajput00100@gmail.com', password: 'Admin@123', role: 'BMS Operator', category: 'General', created: '2026-01-01' },
  { id: 'usr_raju', name: 'Raju Kumar', mobile: '7042436024', email: 'rajubihar20@gmail.com', password: 'Admin@123', role: 'BMS Operator', category: 'General', created: '2026-01-01' },
  { id: 'usr_vikash', name: 'Vikash', mobile: '7530816479', email: 'vikashmishra8811@gmail.com', password: 'Admin@123', role: 'MST', category: 'General, Electrical', created: '2026-01-01' },
  { id: 'usr_manmohan', name: 'Manmohan', mobile: '8383098855', email: 'manmohansing8383@gmail.com', password: 'Admin@123', role: 'MST', category: 'General, Electrical', created: '2026-01-01' },
  { id: 'usr_darshan', name: 'Darshan', mobile: '9334369687', email: 'dg8404003@gmail.com', password: 'Admin@123', role: 'MST', category: 'General, Electrical', created: '2026-01-01' },
  { id: 'usr_anuj', name: 'Anuj', mobile: '750029699', email: 'anujchaudhary4656@gmail.com', password: 'Admin@123', role: 'MST', category: 'General, Electrical', created: '2026-01-01' },
  { id: 'usr_sangram', name: 'Sangram', mobile: '8447265276', email: 'sangramdas595125@gmail.com', password: 'Admin@123', role: 'Plumber', category: 'Plumbing', created: '2026-01-01' },
  { id: 'usr_diwakar', name: 'Diwakar', mobile: '8587007302', email: 'dm6127886@gmail.com', password: 'Admin@123', role: 'Painter', category: 'Painting', created: '2026-01-01' }
];

let SYSTEM_USERS = [...DEFAULT_SYSTEM_USERS];

// Initial Snag Database (Clean empty array - zero dummy data)
const INITIAL_SNAGS = [];

let snagsStore = [];

// Initialize Application on Page Load
document.addEventListener('DOMContentLoaded', () => {
  initLiveClock();
  initLocalStorage();
  initGeolocation();
  initDefaultMonthFilter();
  checkUserSession();
  requestNotificationPermission();
});

// Realtime Header Clock
function initLiveClock() {
  const clockEl = document.getElementById('headerLiveClock');
  function tick() {
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString() + ' ' + now.toLocaleDateString();
    }
  }
  tick();
  setInterval(tick, 1000);
}


// ==========================================================================
// PUSH NOTIFICATION, NATIVE APK VIBRATION & REAL-TIME MELODIC RING SYSTEM
// ==========================================================================

// Global AudioContext with automatic unlock on first user gesture
let audioCtxInstance = null;
function getAudioContext() {
  if (!audioCtxInstance) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtxInstance = new AudioContextClass();
    }
  }
  if (audioCtxInstance && audioCtxInstance.state === 'suspended') {
    audioCtxInstance.resume().catch(() => {});
  }
  return audioCtxInstance;
}

// User interaction listener to immediately unlock Web Audio API AudioContext
['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
  window.addEventListener(evt, () => {
    try {
      getAudioContext();
    } catch (e) {}
  }, { once: false, passive: true });
});

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => {
      console.log('Notification permission status:', perm);
    });
  }
}

/**
 * Triggers physical device vibration
 * Supports: Native Android APK Bridge, Web Vibration API
 */
function vibrateDevice(pattern = [0, 400, 200, 400, 200, 800]) {
  try {
    // 1. Android Native APK Bridge
    if (window.AndroidBridge && typeof window.AndroidBridge.vibratePattern === 'function') {
      const csv = Array.isArray(pattern) ? pattern.join(',') : '0,400,200,400,200,800';
      window.AndroidBridge.vibratePattern(csv);
      console.log('📳 Native Android APK Vibration triggered:', csv);
      return;
    }
    
    // 2. HTML5 Web Navigator Vibration API
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
      console.log('📳 Web Navigator Vibration triggered:', pattern);
    }
  } catch (e) {
    console.warn('Vibration error:', e);
  }
}

/**
 * Plays high-priority loud melodic notification ringtone chime
 * Supports: Native Android RingtoneManager in APK + Web Audio API synthesizer
 */
function playSnagRingSound() {
  try {
    // 1. Android Native APK Ringtone / Sound (Plays system notification / ringtone sound)
    if (window.AndroidBridge && typeof window.AndroidBridge.playRingSound === 'function') {
      window.AndroidBridge.playRingSound();
      console.log('🔔 Native Android APK Ringtone triggered via RingtoneManager');
    }
  } catch (e) {
    console.warn('Native ring sound error:', e);
  }

  // 2. Synthesize Rich High-Clarity Multi-Tone Melodic Chime Ringtone
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // A melodic 6-tone ascending alert chime with dual harmonic oscillators
    // Sequence: D5 (587.3Hz) -> F#5 (739.9Hz) -> A5 (880Hz) -> D6 (1174.6Hz) -> F#6 (1479.9Hz) -> Chord (D6+A6)
    const notes = [
      { freq: 587.33, start: 0.00, dur: 0.18, vol: 0.35, type: 'triangle' },
      { freq: 739.99, start: 0.12, dur: 0.18, vol: 0.40, type: 'triangle' },
      { freq: 880.00, start: 0.24, dur: 0.22, vol: 0.45, type: 'triangle' },
      { freq: 1174.66, start: 0.40, dur: 0.35, vol: 0.55, type: 'sine' },
      { freq: 1479.98, start: 0.58, dur: 0.30, vol: 0.50, type: 'sine' },
      { freq: 1760.00, start: 0.70, dur: 0.65, vol: 0.60, type: 'sine' },
      { freq: 1174.66, start: 0.70, dur: 0.65, vol: 0.40, type: 'triangle' } // Harmonic under-layer
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = n.type;
      osc.frequency.setValueAtTime(n.freq, now + n.start);

      // Attack & Decay Envelope for realistic bell/chime ring
      gain.gain.setValueAtTime(0.0001, now + n.start);
      gain.gain.exponentialRampToValueAtTime(n.vol, now + n.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur + 0.05);
    });

    console.log('🎵 Melodic Ringtone Chime Synthesizer triggered');
  } catch (err) {
    console.warn('Web Audio synthesis error:', err);
  }
}

/**
 * Core Snag Assignment Notification Dispatcher
 * Triggered whenever a snag is assigned or reassigned
 */
function triggerSnagAssignmentNotification(snag, context = 'assigned') {
  if (!snag) return;

  const curUser = STATE.currentUser;
  const curUserName = (curUser?.name || '').trim().toLowerCase();
  const curUserRole = (curUser?.role || '').trim().toLowerCase();
  const curUserCat = (curUser?.category || '').trim().toLowerCase();

  const assignedTo = (snag.assignedUser || '').trim();
  const assignedToLower = assignedTo.toLowerCase();
  const snagCatLower = (snag.category || '').trim().toLowerCase();

  // Check if current user should receive the alert:
  // - Current user is explicitly named in assignment
  // - Current user is MST / Supervisor / Admin / BMS Operator
  // - Current user belongs to matching category
  // - Or user just created / reassigned the snag and gets feedback confirmation
  const isDirectAssignee = curUserName && assignedToLower.includes(curUserName);
  const isTeamMatch = curUserCat.includes(snagCatLower) || snagCatLower.includes(curUserCat);
  const isPrivilegedRole = !curUser || ['mst', 'engineer', 'supervisor', 'admin', 'bms operator'].includes(curUserRole);

  const shouldNotify = isDirectAssignee || isTeamMatch || isPrivilegedRole;

  if (!shouldNotify && context !== 'test') {
    console.log('Notification skipped for non-matching user:', curUser?.name);
    return;
  }

  const title = `⚡ Snag ${snag.id} Assigned to ${assignedTo || 'Technician'}!`;
  const bodyText = `Category: ${snag.category} | Priority: ${snag.priority}\nLocation: ${snag.location} - ${snag.floor} (${snag.area})\nRemarks: ${snag.description || 'Action required'}`;

  // 1. Double-Pulse Device Vibration (Inside APK and Web)
  vibrateDevice([0, 400, 200, 400, 200, 800]);

  // 2. Play Loud Melodic Ring Tone (Inside APK and Web)
  playSnagRingSound();

  // 3. Native Android Status Bar Notification / Web Push Notification
  try {
    if (window.AndroidBridge && typeof window.AndroidBridge.notifySnagAssigned === 'function') {
      window.AndroidBridge.notifySnagAssigned(title, bodyText, snag.id);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(title, {
        body: bodyText,
        icon: 'https://cdn-icons-png.flaticon.com/512/1042/1042339.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/1042/1042339.png',
        vibrate: [0, 400, 200, 400, 200, 800],
        tag: `snag-${snag.id}`,
        requireInteraction: true
      });
      notif.onclick = () => {
        window.focus();
        openDetailModal(snag.id);
      };
    }
  } catch (e) {
    console.warn('System push notification error:', e);
  }

  // 4. Floating Visual Toast Banner
  showInAppToastBanner(
    `⚡ ${snag.category} Snag Assigned: ${snag.id}`,
    `Assigned to: ${assignedTo || 'Specialist'} • ${snag.location} (${snag.floor}) • ${snag.priority} Priority`,
    snag.id
  );
}

/**
 * User-triggered test function for vibration and ring sound
 */
function testNotificationAlert() {
  requestNotificationPermission();
  const testSnag = {
    id: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
    category: 'Electrical',
    priority: 'High',
    location: 'NAB-DT3',
    floor: '3rd',
    area: 'Server Room',
    description: 'Test vibration and ring sound alert verification',
    assignedUser: STATE.currentUser?.name ? `${STATE.currentUser.name} (${STATE.currentUser.role})` : 'Vikash (MST - Electrical)'
  };
  triggerSnagAssignmentNotification(testSnag, 'test');
}

/**
 * Renders specialist options into a <select> element based on category and users
 */
function renderAssignedUserOptions(selectEl, category = 'General', currentSelected = '') {
  if (!selectEl) return;
  const cat = (category || 'General').trim();
  
  const usersList = (SYSTEM_USERS && SYSTEM_USERS.length > 0) ? SYSTEM_USERS : DEFAULT_SYSTEM_USERS;
  
  let optionsHtml = '';

  // 1. Recommended Specialist based on category
  optionsHtml += `<optgroup label="⭐ Recommended Specialists (${cat})">`;
  
  const matchingUsers = usersList.filter(u => {
    const uCat = (u.category || '').toLowerCase();
    const uRole = (u.role || '').toLowerCase();
    const cLower = cat.toLowerCase();
    return uCat.includes(cLower) || uRole.includes(cLower) || 
      (cat === 'Electrical' && (uRole.includes('mst') || uCat.includes('electrical'))) ||
      (cat === 'Plumbing' && (uRole.includes('plumb') || uCat.includes('plumb'))) ||
      (cat === 'Painting' && (uRole.includes('paint') || uCat.includes('paint'))) ||
      (cat === 'General' && (uRole.includes('bms') || uRole.includes('admin') || uCat.includes('general')));
  });

  if (matchingUsers.length > 0) {
    matchingUsers.forEach(u => {
      const val = `${u.name} (${u.role}${u.category && u.category !== 'General' ? ' - ' + u.category : ''})`;
      optionsHtml += `<option value="${val}">${u.name} (${u.role}${u.category ? ' - ' + u.category : ''})</option>`;
    });
  } else {
    optionsHtml += `<option value="MST Specialist Team (${cat})">MST Specialist Team (${cat})</option>`;
  }
  optionsHtml += `</optgroup>`;

  // 2. All Registered Personnel
  optionsHtml += `<optgroup label="👥 All Personnel & Teams">`;
  usersList.forEach(u => {
    const val = `${u.name} (${u.role}${u.category && u.category !== 'General' ? ' - ' + u.category : ''})`;
    optionsHtml += `<option value="${val}">${u.name} (${u.role}) - ${u.category || 'General'}</option>`;
  });
  optionsHtml += `<option value="All MST Team">All MST Team</option>`;
  optionsHtml += `<option value="BMS Operator Team">BMS Operator Team</option>`;
  optionsHtml += `</optgroup>`;

  selectEl.innerHTML = optionsHtml;

  // Set selected value
  if (currentSelected) {
    let found = false;
    for (let i = 0; i < selectEl.options.length; i++) {
      if (selectEl.options[i].value === currentSelected || selectEl.options[i].value.includes(currentSelected) || currentSelected.includes(selectEl.options[i].text)) {
        selectEl.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) {
      const opt = document.createElement('option');
      opt.value = currentSelected;
      opt.text = currentSelected;
      opt.selected = true;
      selectEl.appendChild(opt);
    }
  } else {
    selectEl.selectedIndex = 0;
  }
}

function handleSnagCategoryChange(newCategory) {
  const assignedInput = document.getElementById('inputAssignedUser');
  if (assignedInput) {
    renderAssignedUserOptions(assignedInput, newCategory);
  }
}

function showInAppToastBanner(title, message, snagId) {
  const container = document.getElementById('inAppToastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'glass-panel bg-slate-900/95 border-2 border-cyan-500 rounded-2xl p-4 shadow-2xl pointer-events-auto transition-all duration-300 transform translate-y-0 flex items-start gap-3';
  toast.innerHTML = `
    <div class="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-lg shrink-0 animate-bounce">
      <i class="fa-solid fa-bell"></i>
    </div>
    <div class="flex-1 min-w-0">
      <h4 class="text-xs font-bold text-white leading-tight">${title}</h4>
      <p class="text-[11px] text-slate-300 mt-1 line-clamp-2">${message}</p>
      <div class="mt-2 flex items-center gap-2">
        <button onclick="openDetailModal('${snagId}'); this.closest('.glass-panel').remove();" class="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] shadow transition">
          View Snag & Update Status
        </button>
        <button onclick="this.closest('.glass-panel').remove();" class="px-2 py-1 text-slate-400 hover:text-white text-[10px] font-bold">
          Dismiss
        </button>
      </div>
    </div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }
  }, 10000);
}

// Local Storage Initializer
function initLocalStorage() {
  const savedSnags = localStorage.getItem('snag_tracker_snags');
  if (savedSnags) {
    try {
      snagsStore = JSON.parse(savedSnags);
    } catch (e) {
      snagsStore = [];
    }
  } else {
    snagsStore = [];
    localStorage.setItem('snag_tracker_snags', JSON.stringify(snagsStore));
  }

  // Strictly enforce NAB-DT3 and NAB-DT4 buildings and their specific floor mappings
  SITE_LOCATIONS = {
    buildings: ['NAB-DT3', 'NAB-DT4'],
    floors: ['1st', '3rd', '4th', '5th', '6th'],
    buildingFloors: {
      'NAB-DT3': ['3rd'],
      'NAB-DT4': ['1st', '4th', '5th', '6th']
    }
  };
  localStorage.setItem('snag_tracker_locations', JSON.stringify(SITE_LOCATIONS));

  const savedUsers = localStorage.getItem('snag_tracker_users');
  if (savedUsers) {
    try {
      const parsed = JSON.parse(savedUsers);
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        SYSTEM_USERS = parsed;
      }
    } catch (e) {}
  }

  // Ensure all default contact team users from image (10) are merged into SYSTEM_USERS
  DEFAULT_SYSTEM_USERS.forEach(defUser => {
    const existingIndex = SYSTEM_USERS.findIndex(u => 
      u.id === defUser.id || 
      u.mobile === defUser.mobile || 
      (u.email && u.email.toLowerCase() === defUser.email.toLowerCase())
    );
    if (existingIndex === -1) {
      SYSTEM_USERS.push(defUser);
    } else {
      if (defUser.role === 'Admin') {
        if (SYSTEM_USERS[existingIndex].name === 'Site Admin Manager' || !SYSTEM_USERS[existingIndex].name) {
          SYSTEM_USERS[existingIndex].name = 'Admin';
        }
        SYSTEM_USERS[existingIndex].mobile = '7008952166';
        SYSTEM_USERS[existingIndex].password = 'Satya@1996';
      } else {
        if (!SYSTEM_USERS[existingIndex].password) {
          SYSTEM_USERS[existingIndex].password = 'Admin@123';
        }
        if (SYSTEM_USERS[existingIndex].role === 'BMS Operator') {
          SYSTEM_USERS[existingIndex].category = 'General';
        } else if (SYSTEM_USERS[existingIndex].role === 'MST') {
          SYSTEM_USERS[existingIndex].category = 'General, Electrical';
        }
      }
    }
  });

  localStorage.setItem('snag_tracker_users', JSON.stringify(SYSTEM_USERS));

  const savedActiveUser = localStorage.getItem('snag_tracker_active_user');
  if (savedActiveUser) {
    try {
      STATE.currentUser = JSON.parse(savedActiveUser);
      if (STATE.currentUser) {
        if (STATE.currentUser.name === 'Site Admin Manager') {
          STATE.currentUser.name = 'Admin';
        }
        if (STATE.currentUser.role === 'Admin') {
          STATE.currentUser.mobile = '7008952166';
          STATE.currentUser.password = 'Satya@1996';
          STATE.isAdminAuthenticated = true;
        }
        localStorage.setItem('snag_tracker_active_user', JSON.stringify(STATE.currentUser));
      }
    } catch (e) {}
  }

  // Render dynamic building location & floor dropdowns
  renderLocationOptions();

  // Auto-connect default hardcoded Firebase config (snag-tracker-9fae8)
  const fbConfig = DEFAULT_FIREBASE_CONFIG;
  if (fbConfig && fbConfig.apiKey) {
    localStorage.setItem('snag_tracker_firebase_config', JSON.stringify(fbConfig));
    initializeFirebaseApp(fbConfig);
  }
}

// User Session Gate Check
function checkUserSession() {
  if (!STATE.currentUser) {
    openUserAuthModal();
  } else {
    closeUserAuthModal();
    if (STATE.currentUser.role === 'Admin') {
      STATE.isAdminAuthenticated = true;
      switchSection('admin');
    } else {
      switchSection('user');
    }
    renderApp();
  }
}

// User Authentication Modal Handlers
function openUserAuthModal() {
  document.getElementById('userLoginIdInput').value = '';
  document.getElementById('userLoginPasswordInput').value = '';
  document.getElementById('userAuthError').classList.add('hidden');
  document.getElementById('userAuthModal').classList.remove('hidden');
}

function closeUserAuthModal() {
  document.getElementById('userAuthModal').classList.add('hidden');
}

function handleUserLoginSubmit(e) {
  e.preventDefault();
  const idInput = document.getElementById('userLoginIdInput').value.trim();
  const pwdInput = document.getElementById('userLoginPasswordInput').value.trim();

  // Find user by 10-digit mobile OR email, AND password
  const matchedUser = SYSTEM_USERS.find(u => 
    (u.mobile === idInput || (u.email && u.email.toLowerCase() === idInput.toLowerCase())) &&
    u.password === pwdInput
  );

  if (matchedUser) {
    STATE.currentUser = matchedUser;
    localStorage.setItem('snag_tracker_active_user', JSON.stringify(matchedUser));
    document.getElementById('userAuthError').classList.add('hidden');
    closeUserAuthModal();
    
    // Admin Role Routing Logic
    if (matchedUser.role === 'Admin') {
      STATE.isAdminAuthenticated = true;
      switchSection('admin');
    } else {
      STATE.isAdminAuthenticated = false;
      switchSection('user');
    }
    renderApp();
    alert(`👋 Welcome back, ${matchedUser.name}!\nLogged in as: ${matchedUser.role} (${matchedUser.category})`);
  } else {
    document.getElementById('userAuthError').classList.remove('hidden');
  }
}

// User Profile Modal Handlers
function openUserProfileModal() {
  if (!STATE.currentUser) return;
  const u = STATE.currentUser;
  
  const pName = document.getElementById('profileName');
  const pRole = document.getElementById('profileRoleBadge');
  const pMobile = document.getElementById('profileMobile');
  const pEmail = document.getElementById('profileEmail');
  const pCat = document.getElementById('profileCategory');

  const displayName = u.name === 'Site Admin Manager' ? 'Admin' : u.name;
  if (pName) pName.textContent = displayName;
  if (pRole) pRole.textContent = u.role === 'Admin' ? 'Admin' : `${u.role} Personnel`;
  if (pMobile) pMobile.textContent = u.mobile;
  if (pEmail) pEmail.textContent = u.email || 'N/A';
  if (pCat) pCat.textContent = `${u.category} Category`;

  document.getElementById('userProfileModal')?.classList.remove('hidden');
}

function closeUserProfileModal() {
  document.getElementById('userProfileModal')?.classList.add('hidden');
}


// Dynamic Building & Floor Location Manager Functions (Strictly NAB-DT3 and NAB-DT4)
function handleBuildingLocationChange(selectedBuilding) {
  const inputFloor = document.getElementById('inputFloor');
  if (!inputFloor) return;

  const b = String(selectedBuilding || '').trim().toUpperCase();

  let availableFloors = [];
  if (b === 'NAB-DT4' || b.includes('DT4')) {
    availableFloors = ['1st', '4th', '5th', '6th'];
  } else {
    // NAB-DT3 (default)
    availableFloors = ['3rd'];
  }

  const currentVal = inputFloor.value;
  inputFloor.innerHTML = availableFloors.map((f) => 
    `<option value="${f}">${f}</option>`
  ).join('');

  if (availableFloors.includes(currentVal)) {
    inputFloor.value = currentVal;
  } else {
    inputFloor.value = availableFloors[0];
  }
}

function renderLocationOptions() {
  const inputLoc = document.getElementById('inputLocation');
  const adminFilterFloor = document.getElementById('adminFilterFloor');
  const adminBuildingsTags = document.getElementById('adminBuildingsTags');
  const adminFloorsTags = document.getElementById('adminFloorsTags');

  // Render Building Locations
  if (inputLoc) {
    const curVal = inputLoc.value || 'NAB-DT3';
    inputLoc.innerHTML = SITE_LOCATIONS.buildings.map(b => 
      `<option value="${b}" ${b === curVal ? 'selected' : ''}>${b}</option>`
    ).join('');

    // Trigger dynamic floor filter for currently selected building
    handleBuildingLocationChange(inputLoc.value || 'NAB-DT3');
  }

  if (adminBuildingsTags) {
    adminBuildingsTags.innerHTML = SITE_LOCATIONS.buildings.map(b => `
      <span class="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5">
        ${b}
        <button type="button" onclick="handleDeleteBuildingLocation('${b}')" class="text-rose-400 hover:text-rose-300 ml-1 font-extrabold text-[11px]" title="Remove building tag">×</button>
      </span>
    `).join('');
  }

  if (adminFilterFloor) {
    adminFilterFloor.innerHTML = `<option value="all">All Floor Levels</option>` + SITE_LOCATIONS.floors.map(f => 
      `<option value="${f}">${f}</option>`
    ).join('');
  }

  if (adminFloorsTags) {
    adminFloorsTags.innerHTML = SITE_LOCATIONS.floors.map(f => `
      <span class="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center gap-1.5">
        ${f}
        <button type="button" onclick="handleDeleteFloorLevel('${f}')" class="text-rose-400 hover:text-rose-300 ml-1 font-extrabold text-[11px]" title="Remove floor tag">×</button>
      </span>
    `).join('');
  }
}

function handleAddBuildingLocation(e) {
  e.preventDefault();
  const input = document.getElementById('newBuildingInput');
  const val = input ? input.value.trim() : '';
  if (!val) return;

  if (!SITE_LOCATIONS.buildings.includes(val)) {
    SITE_LOCATIONS.buildings.push(val);
    saveLocationsState();
  }
  if (input) input.value = '';
}

function handleDeleteBuildingLocation(bName) {
  if (SITE_LOCATIONS.buildings.length <= 1) {
    alert('At least one building location must remain!');
    return;
  }
  SITE_LOCATIONS.buildings = SITE_LOCATIONS.buildings.filter(b => b !== bName);
  saveLocationsState();
}

function handleAddFloorLevel(e) {
  e.preventDefault();
  const input = document.getElementById('newFloorInput');
  const val = input ? input.value.trim() : '';
  if (!val) return;

  if (!SITE_LOCATIONS.floors.includes(val)) {
    SITE_LOCATIONS.floors.push(val);
    saveLocationsState();
  }
  if (input) input.value = '';
}

function handleDeleteFloorLevel(fName) {
  if (SITE_LOCATIONS.floors.length <= 1) {
    alert('At least one floor level must remain!');
    return;
  }
  SITE_LOCATIONS.floors = SITE_LOCATIONS.floors.filter(f => f !== fName);
  saveLocationsState();
}

function saveLocationsState() {
  localStorage.setItem('snag_tracker_locations', JSON.stringify(SITE_LOCATIONS));
  renderLocationOptions();

  // Sync locations to Cloud Firestore
  if (STATE.isFirebaseActive && STATE.db) {
    STATE.db.collection('locations').doc('config').set(SITE_LOCATIONS)
      .then(() => console.log('Location options synced to Cloud Firestore'))
      .catch(e => console.error('Error syncing locations:', e));
  }
}

function handleUserLogout() {
  STATE.currentUser = null;
  STATE.isAdminAuthenticated = false;
  localStorage.removeItem('snag_tracker_active_user');
  openUserAuthModal();
}

function openAdminAuthModalDirect() {
  closeUserAuthModal();
  openAdminAuthModal();
}

// Clear all database data function
function clearAllDataDatabase() {
  if (confirm('Are you sure you want to clear ALL snag observation records? This action cannot be undone!')) {
    snagsStore = [];
    saveSnagsState();

    if (STATE.isFirebaseActive && STATE.db) {
      STATE.db.collection('snags').get().then(snapshot => {
        snapshot.forEach(doc => doc.ref.delete());
      });
    }

    renderApp();
    alert('All observation data cleared successfully!');
  }
}

// Fetch Browser GPS Coordinates
function initGeolocation() {
  const gpsEl = document.getElementById('locationGpsText');
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        STATE.userGps = { lat, lng, text: `${lat}° N, ${lng}° E` };
        if (gpsEl) {
          gpsEl.innerHTML = `<i class="fa-solid fa-location-crosshairs mr-1"></i> GPS: ${lat}°, ${lng}°`;
        }
      },
      (err) => {
        if (gpsEl) gpsEl.innerHTML = `<i class="fa-solid fa-location-pin mr-1"></i> GPS Default: Site Grid 12.97N, 77.59E`;
      },
      { timeout: 5000 }
    );
  }
}

// Default Admin Month Filter to Current Month
function initDefaultMonthFilter() {
  const monthInput = document.getElementById('adminFilterMonth');
  if (monthInput) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    monthInput.value = `${yyyy}-${mm}`;
  }
}

// Main Render Dispatcher
function renderApp() {
  if (!STATE.currentUser) return;

  const curUser = STATE.currentUser;
  
  // Update Header User Pill
  const headerName = document.getElementById('headerUserName');
  const headerRole = document.getElementById('headerUserRole');
  if (headerName) headerName.textContent = curUser.name;
  if (headerRole) headerRole.textContent = `${curUser.role} (${curUser.category})`;

  // Admin Tab Visibility Control (Show Admin tab only if user has Admin role or Admin authenticated)
  const navAdminBtn = document.getElementById('navAdminTab');
  if (navAdminBtn) {
    if (curUser.role === 'Admin' || STATE.isAdminAuthenticated) {
      navAdminBtn.classList.remove('hidden');
    } else {
      navAdminBtn.classList.add('hidden');
    }
  }

  // Update User Banner
  const nameEl = document.getElementById('currentUserNameDisplay');
  const catBadge = document.getElementById('userCategoryBadge');
  const catText = document.getElementById('userCategoryText');
  const roleTag = document.getElementById('userRoleTag');

  if (nameEl) nameEl.textContent = curUser.name;
  if (catText) catText.textContent = curUser.category;
  if (roleTag) roleTag.textContent = curUser.role;

  if (catBadge) {
    const color = getCategoryBadgeClass(curUser.category);
    const icon = getCategoryIcon(curUser.category);
    catBadge.className = `${color} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5`;
    catBadge.innerHTML = `<span>${icon}</span> <span>${curUser.category} Category</span>`;
  }

  // Set category dropdown default in Capture Modal to match active user
  const inputCategory = document.getElementById('inputCategory');
  if (inputCategory) {
    inputCategory.value = curUser.category;
  }

  // Render feeds
  renderUserSnagsFeed();
  renderAdminSnagsTable();
  renderUsersTable();
}


// Switch Main Section (User vs Admin Password Protected)
function switchSection(section) {
  if (section === 'admin' && (!STATE.isAdminAuthenticated && STATE.currentUser?.role !== 'Admin')) {
    openAdminAuthModal();
    return;
  }

  STATE.activeSection = section;
  const userSec = document.getElementById('userSection');
  const adminSec = document.getElementById('adminSection');
  const navUserBtn = document.getElementById('navUserTab');
  const navAdminBtn = document.getElementById('navAdminTab');
  const btnFbConfig = document.getElementById('btnFirebaseConfig');

  if (section === 'user') {
    userSec.classList.remove('hidden');
    adminSec.classList.add('hidden');
    navUserBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-cyan-600 text-white shadow';
    navAdminBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white';
    if (btnFbConfig) btnFbConfig.classList.add('hidden');
  } else {
    userSec.classList.add('hidden');
    adminSec.classList.remove('hidden');
    navAdminBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-blue-600 text-white shadow';
    navUserBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white';
    if (btnFbConfig) btnFbConfig.classList.remove('hidden');
  }
}

// ADMIN AUTHENTICATION LOGIC (Password: Satya@1996)
function openAdminAuthModal() {
  document.getElementById('adminPasswordInput').value = '';
  document.getElementById('adminAuthError').classList.add('hidden');
  document.getElementById('adminAuthModal').classList.remove('hidden');
}

function cancelAdminAuth() {
  document.getElementById('adminAuthModal').classList.add('hidden');
  switchSection('user');
}

function handleAdminLogin(e) {
  e.preventDefault();
  const inputPwd = document.getElementById('adminPasswordInput').value;
  if (inputPwd === ADMIN_PASSWORD) {
    STATE.isAdminAuthenticated = true;
    if (!STATE.currentUser) {
      STATE.currentUser = SYSTEM_USERS.find(u => u.role === 'Admin') || { name: 'Admin', role: 'Admin', category: 'General' };
      localStorage.setItem('snag_tracker_active_user', JSON.stringify(STATE.currentUser));
    }
    document.getElementById('adminAuthModal').classList.add('hidden');
    switchSection('admin');
    renderApp();
  } else {
    document.getElementById('adminAuthError').classList.remove('hidden');
  }
}

function lockAdminSession() {
  STATE.isAdminAuthenticated = false;
  switchSection('user');
  renderApp();
  alert('Admin session locked!');
}

// Switch Admin Internal Tabs (Tracking vs Users)
function switchAdminTab(tab) {
  STATE.activeAdminTab = tab;
  const trackingContent = document.getElementById('adminTabTrackingContent');
  const usersContent = document.getElementById('adminTabUsersContent');
  const btnTracking = document.getElementById('adminTabTracking');
  const btnUsers = document.getElementById('adminTabUsers');

  if (tab === 'tracking') {
    trackingContent.classList.remove('hidden');
    usersContent.classList.add('hidden');
    btnTracking.classList.add('active');
    btnUsers.classList.remove('active');
  } else {
    trackingContent.classList.add('hidden');
    usersContent.classList.remove('hidden');
    btnUsers.classList.add('active');
    btnTracking.classList.remove('active');
  }
}


// ==========================================================================
// USER SECTION LOGIC & CARD RENDERING
// ==========================================================================

function renderUserSnagsFeed() {
  const grid = document.getElementById('userSnagsGrid');
  if (!grid || !STATE.currentUser) return;

  const curUser = STATE.currentUser;
  const filterScope = document.getElementById('userFilterScope')?.value || 'all';
  const filterStatus = document.getElementById('userFilterStatus')?.value || 'all';
  const searchQuery = document.getElementById('userSearchInput')?.value?.toLowerCase() || '';

  const userNameLower = (curUser.name || '').trim().toLowerCase();
  const userCats = (curUser.category || '').split(',').map(c => c.trim().toLowerCase());

  let filtered = snagsStore.filter(snag => {
    const createdByLower = (snag.createdBy || '').trim().toLowerCase();
    const assignedUserLower = (snag.assignedUser || '').trim().toLowerCase();
    const snagCatLower = (snag.category || '').trim().toLowerCase();

    // Check if raised by logged-in user
    const isRaisedByMe = createdByLower === userNameLower || assignedUserLower.includes(userNameLower);

    // Check if assigned to logged-in user's team / category
    let isAssignedToMyTeam = userCats.includes(snagCatLower);
    if (curUser.role === 'MST') {
      if (snagCatLower === 'general' || snagCatLower === 'electrical') {
        isAssignedToMyTeam = true;
      }
    }
    if (curUser.role === 'Admin') {
      isAssignedToMyTeam = true;
    }

    // Filter Scope Selection
    if (filterScope === 'raised' && !isRaisedByMe) return false;
    if (filterScope === 'assigned' && !isAssignedToMyTeam) return false;
    if (filterScope === 'all' && curUser.role !== 'Admin') {
      if (!isRaisedByMe && !isAssignedToMyTeam) return false;
    }

    // Filter Status Selection
    if (filterStatus !== 'all' && snag.status !== filterStatus) return false;

    // Search Query
    if (searchQuery) {
      const match = snag.location.toLowerCase().includes(searchQuery) ||
                    snag.area.toLowerCase().includes(searchQuery) ||
                    snag.description.toLowerCase().includes(searchQuery) ||
                    snag.id.toLowerCase().includes(searchQuery) ||
                    (snag.createdBy && snag.createdBy.toLowerCase().includes(searchQuery)) ||
                    (snag.assignedUser && snag.assignedUser.toLowerCase().includes(searchQuery));
      if (!match) return false;
    }
    return true;
  });

  // Calculate User Stats
  const total = filtered.length;
  const openCount = filtered.filter(s => s.status === 'Open').length;
  const progressCount = filtered.filter(s => s.status === 'In Progress').length;
  const resolvedCount = filtered.filter(s => s.status === 'Resolved').length;

  document.getElementById('statUserTotal').textContent = total;
  document.getElementById('statUserOpen').textContent = openCount;
  document.getElementById('statUserProgress').textContent = progressCount;
  document.getElementById('statUserResolved').textContent = resolvedCount;
  document.getElementById('userFeedCount').textContent = `${total} items`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full glass-panel p-8 text-center rounded-2xl space-y-3">
        <div class="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto text-xl">
          <i class="fa-solid fa-folder-open"></i>
        </div>
        <h4 class="text-sm font-bold text-slate-300">No Snag Observations Found</h4>
        <p class="text-xs text-slate-500">No snag observations match your selected filter (${filterScope === 'raised' ? 'Raised by Me' : filterScope === 'assigned' ? 'Assigned to My Team' : 'All My Snags'}).</p>
      </div>
    `;
    return;
  }

  // Render Snag Cards
  grid.innerHTML = filtered.map(snag => {
    const catClass = getCategoryBadgeClass(snag.category);
    const statusClass = getStatusBadgeClass(snag.status);
    const creatorName = snag.createdBy || 'Inspector';

    return `
      <div class="glass-panel rounded-2xl overflow-hidden snag-card flex flex-col justify-between border border-slate-800">
        <!-- Photo Container -->
        <div class="relative bg-black h-48 overflow-hidden group">
          <img src="${snag.closurePhoto || snag.photo}" alt="${snag.id}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer" onclick="downloadAndZoomPhoto('${snag.closurePhoto || snag.photo}', '${snag.id}_Photo.jpg', '${snag.closurePhoto ? 'Closure Evidence Photo' : 'Initial Defect Photo'}')" title="Click to Download & View Clear High-Res Photo">
          
          <!-- Category & Status Badge Overlay -->
          <div class="absolute top-2 left-2 flex flex-wrap items-center gap-1.5">
            <span class="${catClass} px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shadow">
              ${snag.category}
            </span>
            <span class="${statusClass} px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow">
              ${snag.status}
            </span>
            ${snag.closurePhoto ? `
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/90 text-white shadow border border-emerald-400/50 flex items-center gap-1">
                <i class="fa-solid fa-circle-check"></i> Closure Photo
              </span>
            ` : ''}
          </div>

          <!-- Timestamp Watermark Overlay -->
          <div class="stamped-badge-overlay flex items-center justify-between text-[10px]">
            <span><i class="fa-solid fa-clock mr-1 text-cyan-400"></i>${snag.timestamp}</span>
            <span><i class="fa-solid fa-location-crosshairs mr-1 text-rose-400"></i>${snag.floor}</span>
          </div>
        </div>

        <!-- Details Content -->
        <div class="p-4 space-y-3 flex-grow flex flex-col justify-between">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold font-mono text-cyan-400">${snag.id}</span>
              <span class="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                Priority: <strong class="text-amber-400">${snag.priority}</strong>
              </span>
            </div>

            <div>
              <h4 class="text-xs font-bold text-white line-clamp-1">${snag.location} - ${snag.area}</h4>
              <p class="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">${snag.description}</p>

              <div class="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1 text-[10px] font-mono text-slate-400">
                <div class="flex items-center justify-between">
                  <span><i class="fa-solid fa-user-pen text-cyan-400 mr-1"></i>Raised By: <strong class="text-slate-200">${creatorName}</strong></span>
                  <span><i class="fa-solid fa-user-gear text-teal-400 mr-1"></i>Team: <strong class="text-slate-200">${snag.category}</strong></span>
                </div>
              </div>

              ${snag.technicianRemark ? `
                <div class="mt-2 text-[11px] bg-slate-950/80 p-2 rounded-lg border border-cyan-500/30 text-cyan-300 font-mono">
                  <div class="flex items-center justify-between text-[10px] font-bold text-amber-400 mb-0.5">
                    <span>💬 MST Remark</span>
                    <span class="text-[9px] text-slate-400 font-normal">${snag.remarkTimestamp || ''}</span>
                  </div>
                  <p class="text-slate-200 line-clamp-2 leading-tight">${snag.technicianRemark}</p>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Bottom Action Toolbar -->
          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <select onchange="updateSnagStatusDirect('${snag.id}', this.value)" class="bg-slate-900 border border-slate-700 text-[11px] text-slate-200 rounded-lg px-2 py-1 focus:outline-none">
              <option value="Open" ${snag.status === 'Open' ? 'selected' : ''}>🔴 Open</option>
              <option value="In Progress" ${snag.status === 'In Progress' ? 'selected' : ''}>🟡 In Progress</option>
              <option value="Resolved" ${snag.status === 'Resolved' ? 'selected' : ''}>🟢 Resolved</option>
            </select>

            <button onclick="openDetailModal('${snag.id}')" class="px-3 py-1 rounded-lg ${snag.closurePhoto ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30' : 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border-cyan-500/30'} font-semibold text-xs border flex items-center gap-1 transition">
              <i class="fa-solid ${snag.closurePhoto ? 'fa-eye' : 'fa-camera'}"></i> ${snag.closurePhoto ? 'View Detail' : 'Closure & Detail'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}


// ==========================================================================
// ADMIN MASTER TRACKING TABLE LOGIC
// ==========================================================================

function renderAdminSnagsTable() {
  const tbody = document.getElementById('adminSnagsTableBody');
  if (!tbody) return;

  const monthFilter = document.getElementById('adminFilterMonth')?.value;
  const categoryFilter = document.getElementById('adminFilterCategory')?.value || 'all';
  const statusFilter = document.getElementById('adminFilterStatus')?.value || 'all';
  const floorFilter = document.getElementById('adminFilterFloor')?.value || 'all';
  const searchQuery = document.getElementById('adminSearchInput')?.value?.toLowerCase() || '';

  let filtered = snagsStore.filter(snag => {
    if (monthFilter) {
      const snagMonth = snag.timestamp.substring(0, 7);
      if (snagMonth !== monthFilter) return false;
    }
    if (categoryFilter !== 'all' && snag.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && snag.status !== statusFilter) return false;
    if (floorFilter !== 'all' && snag.floor !== floorFilter) return false;
    
    if (searchQuery) {
      const match = snag.id.toLowerCase().includes(searchQuery) ||
                    snag.location.toLowerCase().includes(searchQuery) ||
                    snag.area.toLowerCase().includes(searchQuery) ||
                    snag.description.toLowerCase().includes(searchQuery) ||
                    snag.assignedUser.toLowerCase().includes(searchQuery);
      if (!match) return false;
    }
    return true;
  });

  // Calculate Admin Metrics
  document.getElementById('statAdminTotal').textContent = snagsStore.length;
  document.getElementById('statAdminOpen').textContent = snagsStore.filter(s => s.status === 'Open').length;
  document.getElementById('statAdminProgress').textContent = snagsStore.filter(s => s.status === 'In Progress').length;
  document.getElementById('statAdminResolved').textContent = snagsStore.filter(s => s.status === 'Resolved').length;
  document.getElementById('statAdminCritical').textContent = snagsStore.filter(s => s.priority === 'Critical' || s.priority === 'High').length;

  document.getElementById('adminTableCount').textContent = `Showing ${filtered.length} of ${snagsStore.length} snags`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-4 py-8 text-center text-slate-500 font-medium">
          No observation records match the selected month and filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(snag => {
    const catClass = getCategoryBadgeClass(snag.category);
    const statusClass = getStatusBadgeClass(snag.status);

    return `
      <tr class="hover:bg-slate-800/40 transition">
        <td class="px-3 py-3 font-mono">
          <div class="flex items-center gap-2.5">
            <img src="${snag.photo}" class="w-10 h-10 rounded-lg object-cover border border-slate-700 cursor-pointer hover:scale-110 transition shadow" onclick="downloadAndZoomPhoto('${snag.photo}', '${snag.id}_InitialDefect.jpg', 'Initial Defect Photo (${snag.id})')" alt="Initial Defect Photo" title="Click to Download & View Clear High-Res Photo">
            <div>
              <div class="font-bold text-cyan-400 text-xs">${snag.id}</div>
              <div class="text-[10px] text-slate-400">${snag.priority} Priority</div>
            </div>
          </div>
        </td>
        <td class="px-3 py-3 font-mono">
          ${snag.closurePhoto ? `
            <div class="flex items-center gap-2 cursor-pointer" onclick="downloadAndZoomPhoto('${snag.closurePhoto}', '${snag.id}_ClosurePhoto.jpg', 'Closure Photo Evidence (${snag.id})')" title="Click to Download & View Clear High-Res Photo">
              <img src="${snag.closurePhoto}" class="w-10 h-10 rounded-lg object-cover border-2 border-emerald-500/70 shadow hover:scale-110 transition" alt="Closure Photo">
              <span class="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">✓ Uploaded</span>
            </div>
          ` : `
            <span class="text-[11px] text-slate-500 font-mono italic flex items-center gap-1"><i class="fa-solid fa-clock text-[10px]"></i> Pending</span>
          `}
        </td>
        <td class="px-3 py-3 font-mono text-[11px] text-slate-300">
          <i class="fa-solid fa-clock mr-1 text-slate-500"></i>${snag.timestamp}
        </td>
        <td class="px-3 py-3">
          <div class="font-semibold text-white text-xs">${snag.location}</div>
          <div class="text-[10px] text-slate-400">${snag.floor} • ${snag.area}</div>
        </td>
        <td class="px-3 py-3">
          <span class="${catClass} px-2.5 py-0.5 rounded-full text-[10px] font-bold">
            ${snag.category}
          </span>
        </td>
        <td class="px-3 py-3 text-xs text-slate-300">
          ${snag.assignedUser}
        </td>
        <td class="px-3 py-3">
          <span class="${statusClass} px-2 py-0.5 rounded-full text-[10px] font-bold">
            ${snag.status}
          </span>
        </td>
        <td class="px-3 py-3 text-right">
          <div class="flex items-center justify-end gap-2">
            <button onclick="openDetailModal('${snag.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition" title="View Full Details & Photos">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="deleteSnagRecord('${snag.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition" title="Delete Snag">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function resetAdminFilters() {
  initDefaultMonthFilter();
  document.getElementById('adminFilterCategory').value = 'all';
  document.getElementById('adminFilterStatus').value = 'all';
  document.getElementById('adminFilterFloor').value = 'all';
  document.getElementById('adminSearchInput').value = '';
  renderAdminSnagsTable();
}


// ==========================================================================
// CAMERA CAPTURE & PHOTO WATERMARKING MODULE
// ==========================================================================

function openCaptureModal() {
  document.getElementById('captureModal').classList.remove('hidden');
  resetPhotoCapture();
  const inputLoc = document.getElementById('inputLocation');
  if (inputLoc) {
    handleBuildingLocationChange(inputLoc.value || 'NAB-DT3');
  }
  const inputCat = document.getElementById('inputCategory');
  const inputAssigned = document.getElementById('inputAssignedUser');
  if (inputAssigned) {
    renderAssignedUserOptions(inputAssigned, inputCat?.value || 'Electrical');
  }

  // Automatically launch Live Camera Viewfinder!
  startWebcamStream();
}

function closeCaptureModal() {
  stopWebcamStream();
  document.getElementById('captureModal').classList.add('hidden');
}

async function startWebcamStream() {
  const video = document.getElementById('webcamVideo');
  const placeholder = document.getElementById('cameraPlaceholder');
  const overlay = document.getElementById('cameraControlsOverlay');
  const reticle = document.getElementById('cameraViewfinderGrid');
  const uploadPreview = document.getElementById('uploadImagePreview');
  const snapshotCanvas = document.getElementById('snapshotCanvas');
  const retakeBtn = document.getElementById('retakeOverlay');

  stopWebcamStream();
  if (uploadPreview) uploadPreview.classList.add('hidden');
  if (snapshotCanvas) snapshotCanvas.classList.add('hidden');
  if (retakeBtn) retakeBtn.classList.add('hidden');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('getUserMedia is not supported on this device/browser.');
    if (placeholder) placeholder.classList.remove('hidden');
    if (video) video.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
    if (reticle) reticle.classList.add('hidden');
    return;
  }

  try {
    const currentFacing = STATE.facingMode || 'environment';
    const constraints = {
      video: {
        facingMode: { ideal: currentFacing },
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 }
      },
      audio: false
    };

    STATE.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    if (video) {
      video.srcObject = STATE.mediaStream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.muted = true;
      video.classList.remove('hidden');
      await video.play().catch(e => console.warn('Video play catch:', e));
    }
    if (placeholder) placeholder.classList.add('hidden');
    if (overlay) overlay.classList.remove('hidden');
    if (reticle) reticle.classList.remove('hidden');
  } catch (err) {
    console.warn('Camera access error or permission denied:', err);
    // Graceful fallback to file selection prompt
    if (video) video.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
    if (reticle) reticle.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
  }
}

function switchCameraFacing() {
  STATE.facingMode = (STATE.facingMode === 'user') ? 'environment' : 'user';
  startWebcamStream();
}

function stopWebcamStream() {
  if (STATE.mediaStream) {
    STATE.mediaStream.getTracks().forEach(track => track.stop());
    STATE.mediaStream = null;
  }
  const video = document.getElementById('webcamVideo');
  if (video) {
    video.srcObject = null;
    video.classList.add('hidden');
  }
  const overlay = document.getElementById('cameraControlsOverlay');
  if (overlay) overlay.classList.add('hidden');
  const reticle = document.getElementById('cameraViewfinderGrid');
  if (reticle) reticle.classList.add('hidden');
}

// Draw Photo Frame to Canvas & Apply Stamp Overlay (Compressed for Cloud Firestore)
// Safe Local Storage Persister with Quota Protection & Auto-Pruning
function saveSnagsState() {
  try {
    localStorage.setItem('snag_tracker_snags', JSON.stringify(snagsStore));
  } catch (err) {
    console.warn('⚠️ LocalStorage quota reached, auto-pruning older snag records to prevent memory freeze:', err);
    if (snagsStore.length > 25) {
      snagsStore = snagsStore.slice(0, 25);
      try {
        localStorage.setItem('snag_tracker_snags', JSON.stringify(snagsStore));
      } catch (e) {
        console.error('LocalStorage write failed after pruning:', e);
      }
    }
  }
}

// Snap high-resolution photo from active video stream
function takeCameraSnap() {
  const video = document.getElementById('webcamVideo');
  const canvas = document.getElementById('snapshotCanvas');
  const placeholder = document.getElementById('cameraPlaceholder');
  const overlay = document.getElementById('cameraControlsOverlay');
  const reticle = document.getElementById('cameraViewfinderGrid');
  const retakeBtn = document.getElementById('retakeOverlay');

  if (!video || !video.videoWidth) {
    alert('Camera stream is still initializing. Please wait a moment.');
    return;
  }

  const ctx = canvas.getContext('2d');
  const maxDim = 800;
  let w = video.videoWidth || 640;
  let h = video.videoHeight || 480;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }

  canvas.width = w;
  canvas.height = h;

  // Draw Camera Frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  STATE.capturedPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.50);

  // Small haptic vibration feedback on snap
  vibrateDevice([60]);

  stopWebcamStream();
  if (video) video.classList.add('hidden');
  if (overlay) overlay.classList.add('hidden');
  if (reticle) reticle.classList.add('hidden');
  if (placeholder) placeholder.classList.add('hidden');
  if (canvas) canvas.classList.remove('hidden');
  if (retakeBtn) retakeBtn.classList.remove('hidden');
}

function handleFileInput(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const img = new Image();
    img.onload = () => {
      stopWebcamStream();
      const canvas = document.getElementById('snapshotCanvas');
      const ctx = canvas.getContext('2d');
      const video = document.getElementById('webcamVideo');
      const placeholder = document.getElementById('cameraPlaceholder');
      const overlay = document.getElementById('cameraControlsOverlay');
      const reticle = document.getElementById('cameraViewfinderGrid');
      const retakeBtn = document.getElementById('retakeOverlay');

      const maxDim = 800;
      let w = img.width || 640;
      let h = img.height || 480;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      STATE.capturedPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.50);
      if (video) video.classList.add('hidden');
      if (overlay) overlay.classList.add('hidden');
      if (reticle) reticle.classList.add('hidden');
      if (placeholder) placeholder.classList.add('hidden');
      if (canvas) canvas.classList.remove('hidden');
      if (retakeBtn) retakeBtn.classList.remove('hidden');
      if (e.target) e.target.value = '';
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function stampCanvasMetadata(canvas, ctx) {
  // Clean photo capture without timestamp text watermark on image
}

function resetPhotoCapture() {
  stopWebcamStream();
  STATE.capturedPhotoDataUrl = null;
  const video = document.getElementById('webcamVideo');
  const canvas = document.getElementById('snapshotCanvas');
  const uploadPreview = document.getElementById('uploadImagePreview');
  const retakeBtn = document.getElementById('retakeOverlay');
  const overlay = document.getElementById('cameraControlsOverlay');
  const reticle = document.getElementById('cameraViewfinderGrid');
  const placeholder = document.getElementById('cameraPlaceholder');

  if (video) video.classList.add('hidden');
  if (canvas) canvas.classList.add('hidden');
  if (uploadPreview) uploadPreview.classList.add('hidden');
  if (retakeBtn) retakeBtn.classList.add('hidden');
  if (overlay) overlay.classList.add('hidden');
  if (reticle) reticle.classList.add('hidden');
  if (placeholder) placeholder.classList.remove('hidden');
}

// Helper to automatically download captured/uploaded photos directly to local PC
function autoSavePhotoToPC(dataUrl, filename) {
  if (!dataUrl) return;
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || `Snag_Photo_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.warn('Auto save to PC error:', e);
  }
}

// Save New Snag Form Handler
function handleSaveSnag(e) {
  e.preventDefault();

  if (!STATE.capturedPhotoDataUrl) {
    alert('Please capture a photo or upload an image before submitting!');
    return;
  }

  try {
    const now = new Date();
    const timestampStr = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      now.toLocaleTimeString();
    
    const monthYearStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const curUser = STATE.currentUser || { name: 'Inspector', role: 'Engineer', category: 'General' };

    const catVal = document.getElementById('inputCategory')?.value || 'General';
    const selectedAssigned = document.getElementById('inputAssignedUser')?.value;
    const finalAssignedUser = selectedAssigned || `${curUser.name} (${curUser.role} - ${curUser.category})`;

    const newSnag = {
      id: `SNAG-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: timestampStr,
      monthYear: monthYearStr,
      location: document.getElementById('inputLocation')?.value || 'NAB-DT3',
      floor: document.getElementById('inputFloor')?.value || '3rd',
      area: document.getElementById('inputArea')?.value || 'General',
      category: catVal,
      priority: document.getElementById('inputPriority')?.value || 'Medium',
      status: document.getElementById('inputStatus')?.value || 'Open',
      description: document.getElementById('inputDescription')?.value || '',
      createdBy: curUser.name,
      createdByRole: curUser.role,
      createdByCategory: curUser.category,
      assignedUser: finalAssignedUser,
      gps: STATE.userGps.text,
      photo: STATE.capturedPhotoDataUrl
    };

    // Store photo locally on PC (IndexedDB Disk Store)
    PhotoDB.savePhoto(newSnag.id, STATE.capturedPhotoDataUrl);

    // Auto-save photo file directly to user PC Downloads folder
    autoSavePhotoToPC(STATE.capturedPhotoDataUrl, `${newSnag.id}_InitialDefect.jpg`);

    // Add to local state & persist
    snagsStore.unshift(newSnag);
    knownSnagIds.add(newSnag.id);
    saveSnagsState();

    // Trigger Push Notification, Vibration & Ring Tone for Assigned Specialist
    triggerSnagAssignmentNotification(newSnag, 'created');

    // Sync light payload (~12KB) to Firebase Firestore so ANY user on ANY device can view photo!
    if (STATE.isFirebaseActive && STATE.db) {
      STATE.db.collection('snags').doc(newSnag.id).set(newSnag)
        .then(() => {
          console.log('✅ Ultra-light snag record synced to Firebase (~12KB, visible to all users)');
        })
        .catch(err => {
          console.error('❌ Firebase snag save error:', err);
        });
    }

    closeCaptureModal();
    renderApp();
    alert(`🔔 Snag Observation ${newSnag.id} created successfully!\n\n📷 Photo automatically downloaded to your PC & visible to all team members live.`);
  } catch (err) {
    console.error('Error in handleSaveSnag:', err);
    alert('Error submitting snag observation: ' + err.message);
  }
}

function deleteSnagRecord(snagId) {
  if (!snagId) return;

  const target = snagsStore.find(s => s.id === snagId);
  const snagName = target ? target.id : snagId;

  if (!confirm(`⚠️ Delete Snag Observation "${snagName}"?\n\nThis will permanently remove this observation record from local storage and Cloud Firestore.`)) {
    return;
  }

  // Remove from local memory array
  snagsStore = snagsStore.filter(s => s.id !== snagId);
  knownSnagIds.delete(snagId);

  // Save updated state
  saveSnagsState();

  // Delete photos from IndexedDB PC Store
  PhotoDB.removePhoto(snagId);
  PhotoDB.removePhoto(snagId + '_closure');

  // Delete from Cloud Firestore if active
  if (STATE.isFirebaseActive && STATE.db) {
    STATE.db.collection('snags').doc(snagId).delete()
      .then(() => console.log(`✅ Snag ${snagId} deleted from Cloud Firestore`))
      .catch(err => console.error('❌ Firestore delete error:', err));
  }

  renderApp();
  alert(`🗑️ Snag Observation "${snagName}" deleted successfully.`);
}

function updateSnagStatusDirect(snagId, newStatus) {
  updateSnagStatusAndRemark(snagId, newStatus, '', null, false);
}

function updateSnagStatusAndRemark(snagId, newStatus, remarkText, closurePhotoDataUrl, removeClosure, newAssignedUser) {
  const target = snagsStore.find(s => s.id === snagId);
  if (!target) {
    console.error('Target snag not found:', snagId);
    return;
  }

  const prevAssignedUser = target.assignedUser;
  target.status = newStatus || target.status || 'Open';
  
  let wasReassigned = false;
  if (newAssignedUser && newAssignedUser !== prevAssignedUser) {
    target.assignedUser = newAssignedUser;
    wasReassigned = true;
  }

  const curUserStr = STATE.currentUser ? `${STATE.currentUser.name} (${STATE.currentUser.role})` : 'MST Technician';
  const nowStr = new Date().toLocaleString();

  if (closurePhotoDataUrl) {
    target.closurePhoto = closurePhotoDataUrl;
    target.closureTimestamp = nowStr;
    target.closureUploadedBy = curUserStr;
    PhotoDB.savePhoto(target.id + '_closure', closurePhotoDataUrl);
  } else if (removeClosure) {
    delete target.closurePhoto;
    delete target.closureTimestamp;
    delete target.closureUploadedBy;
    PhotoDB.removePhoto(target.id + '_closure');
  }

  if (remarkText && String(remarkText).trim()) {
    const cleanRemark = String(remarkText).trim();
    target.technicianRemark = cleanRemark;
    target.remarkTimestamp = nowStr;
    target.updatedBy = curUserStr;

    if (!target.remarksHistory) target.remarksHistory = [];
    target.remarksHistory.unshift({
      status: target.status,
      remark: cleanRemark,
      timestamp: nowStr,
      updatedBy: curUserStr,
      hasClosurePhoto: !!target.closurePhoto
    });
  }

  saveSnagsState();

  // If snag was reassigned, trigger instant vibration & ring notification!
  if (wasReassigned) {
    triggerSnagAssignmentNotification(target, 'reassigned');
  }

  if (STATE.isFirebaseActive && STATE.db) {
    try {
      const updateData = {
        status: target.status || 'Open',
        assignedUser: target.assignedUser || '',
        technicianRemark: target.technicianRemark || '',
        remarkTimestamp: target.remarkTimestamp || '',
        updatedBy: target.updatedBy || '',
        remarksHistory: (target.remarksHistory || []).map(r => ({
          status: r.status || '',
          remark: r.remark || '',
          timestamp: r.timestamp || '',
          updatedBy: r.updatedBy || '',
          hasClosurePhoto: !!r.hasClosurePhoto
        }))
      };

      if (target.closurePhoto) {
        updateData.closurePhoto = target.closurePhoto;
        updateData.closureTimestamp = target.closureTimestamp || nowStr;
        updateData.closureUploadedBy = target.closureUploadedBy || curUserStr;
      } else if (removeClosure) {
        updateData.closurePhoto = null;
        updateData.closureTimestamp = null;
        updateData.closureUploadedBy = null;
      }

      STATE.db.collection('snags').doc(snagId).set(updateData, { merge: true })
        .then(() => console.log(`✅ Snag ${snagId} synced to Cloud Firestore with assigned user: ${target.assignedUser}`))
        .catch(err => console.error('Cloud Firestore update error:', err));
    } catch (err) {
      console.error('Error in Firestore payload prep:', err);
    }
  }

  renderApp();
}

// Trigger Closure File Input Picker
function triggerClosureFileSelect() {
  const input = document.getElementById('closureFileInput');
  if (input) {
    input.value = '';
    input.click();
  }
}

// Fullscreen Photo Lightbox & Instant Clear Photo Downloader
function downloadAndZoomPhoto(photoUrl, filenameStr, titleStr) {
  if (!photoUrl) return;

  // 1. Download full-resolution clear picture directly to user/admin PC/device
  try {
    const a = document.createElement('a');
    a.href = photoUrl;
    a.download = filenameStr || `Snag_Photo_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.warn('Auto download clear picture error:', e);
  }

  // 2. Open full-screen clear viewer modal
  openPhotoLightbox(photoUrl, titleStr);
}

function openPhotoLightbox(photoUrl, titleStr) {
  if (!photoUrl) return;
  const modal = document.getElementById('photoLightboxModal');
  const img = document.getElementById('lightboxImage');
  const title = document.getElementById('lightboxTitle');
  if (modal && img) {
    img.src = photoUrl;
    if (title) title.innerHTML = `<i class="fa-solid fa-expand text-cyan-400 mr-1.5"></i> ${titleStr || 'Photo Evidence View'}`;
    modal.classList.remove('hidden');
  }
}

function closePhotoLightbox() {
  const modal = document.getElementById('photoLightboxModal');
  if (modal) modal.classList.add('hidden');
}

// Closure Photo Upload Handlers
function handleClosureFileInput(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const maxDim = 420;
      let w = img.width || 640;
      let h = img.height || 480;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const now = new Date();
      const timestampStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        now.toLocaleTimeString();

      const curUserStr = STATE.currentUser ? `${STATE.currentUser.name} (${STATE.currentUser.role})` : 'MST Technician';

      STATE.stagedClosurePhoto = canvas.toDataURL('image/jpeg', 0.35);
      STATE.removeClosurePhotoFlag = false;

      // Immediately persist to PC & reflect in snag store and Admin page
      if (STATE.activeDetailSnagId) {
        const activeSnag = snagsStore.find(s => s.id === STATE.activeDetailSnagId);
        if (activeSnag) {
          activeSnag.closurePhoto = STATE.stagedClosurePhoto;
          activeSnag.closureTimestamp = timestampStr;
          activeSnag.closureUploadedBy = curUserStr;
          activeSnag.status = 'Resolved';

          PhotoDB.savePhoto(activeSnag.id + '_closure', STATE.stagedClosurePhoto);
          saveSnagsState();

          if (STATE.isFirebaseActive && STATE.db) {
            STATE.db.collection('snags').doc(activeSnag.id).set({
              status: 'Resolved',
              closurePhoto: activeSnag.closurePhoto,
              closureTimestamp: activeSnag.closureTimestamp,
              closureUploadedBy: activeSnag.closureUploadedBy
            }, { merge: true }).then(() => {
              console.log('✅ Closure photo synced live to Cloud Firestore (~12KB light payload)');
            }).catch(err => {
              console.error('❌ Cloud Firestore sync error:', err);
            });
          }

          renderApp();
        }
      }

      // Update Preview Elements in Modal
      renderClosurePreviewState(STATE.stagedClosurePhoto, timestampStr, STATE.currentUser?.name || 'Technician');

      // Auto-switch status to Resolved if currently Open or In Progress
      const statusSel = document.getElementById('detailStatusSelect');
      if (statusSel && statusSel.value !== 'Resolved') {
        statusSel.value = 'Resolved';
      }

      if (e.target) e.target.value = '';
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function renderClosurePreviewState(photoUrl, timestamp, uploadedBy) {
  const container = document.getElementById('detailClosurePhotoContainer');
  const dateEl = document.getElementById('detailClosureDate');
  const thumb = document.getElementById('closurePreviewThumb');
  const title = document.getElementById('closurePhotoTitle');
  const sub = document.getElementById('closurePhotoSub');
  const removeBtn = document.getElementById('btnRemoveClosurePhoto');
  const btnText = document.getElementById('closureBtnText');
  const tag = document.getElementById('closureStatusTag');

  if (photoUrl) {
    if (container) {
      container.className = "relative rounded-xl overflow-hidden bg-black border border-emerald-500/50 h-56 flex flex-col justify-between group";
      container.onclick = null;
      container.innerHTML = `
        <img src="${photoUrl}" class="w-full h-full object-contain mx-auto transition-transform duration-300 group-hover:scale-105 cursor-pointer" onclick="openPhotoLightbox('${photoUrl}', 'Closure Photo Evidence')" alt="Closure Photo" title="Click to View Full Photo">
        <div class="p-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-emerald-400">
          <span><i class="fa-solid fa-circle-check mr-1 text-emerald-400"></i>Resolved Evidence</span>
          <span>By: ${uploadedBy}</span>
        </div>
      `;
    }
    if (dateEl) {
      dateEl.textContent = timestamp || 'Uploaded';
      dateEl.className = 'text-[10px] font-mono text-emerald-400 font-bold';
    }
    if (thumb) {
      thumb.className = "w-14 h-14 rounded-lg bg-slate-900 border border-emerald-500/50 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer";
      thumb.onclick = () => downloadAndZoomPhoto(photoUrl, `${STATE.activeDetailSnagId || 'Closure'}_ClosurePhoto.jpg`, 'Closure Photo (Resolved Evidence)');
      thumb.innerHTML = `<img src="${photoUrl}" class="w-full h-full object-cover" title="Click to Download & View Clear Photo">`;
    }
    if (title) title.textContent = "🟢 Closure Photo Attached";
    if (sub) sub.textContent = `Uploaded by ${uploadedBy} (${timestamp || 'Just now'})`;
    if (removeBtn) removeBtn.classList.remove('hidden');
    if (btnText) btnText.textContent = "Change Closure Photo";
    if (tag) {
      tag.textContent = "🟢 Closure photo saved & synced";
      tag.className = "text-[10px] font-mono text-emerald-400 font-bold";
    }
  } else {
    if (container) {
      container.className = "relative rounded-xl overflow-hidden bg-slate-950 border border-dashed border-slate-700 h-56 flex flex-col items-center justify-center text-center p-3 cursor-pointer";
      container.onclick = () => triggerClosureFileSelect();
      container.innerHTML = `
        <div class="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-cyan-400 flex items-center justify-center text-xl mb-2 hover:scale-110 transition">
          <i class="fa-solid fa-camera"></i>
        </div>
        <p class="text-xs text-white font-bold">Click to Upload Closure Photo</p>
        <p class="text-[10px] text-slate-400 mt-1 max-w-xs">Technician can upload photo showing fixed/closed snag observation.</p>
      `;
    }
    if (dateEl) {
      dateEl.textContent = 'Not Uploaded';
      dateEl.className = 'text-[10px] font-mono text-slate-500';
    }
    if (thumb) {
      thumb.className = "w-14 h-14 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer";
      thumb.onclick = () => triggerClosureFileSelect();
      thumb.innerHTML = `<i class="fa-solid fa-image text-slate-600 text-xl"></i>`;
    }
    if (title) title.textContent = "No Closure Photo Attached";
    if (sub) sub.textContent = "Upload photo showing fixed/closed snag observation";
    if (removeBtn) removeBtn.classList.add('hidden');
    if (btnText) btnText.textContent = "Upload Closure Photo";
    if (tag) {
      tag.textContent = "Upload proof of fix to resolve";
      tag.className = "text-[10px] font-mono text-slate-400";
    }
  }
}

function removeClosurePhoto() {
  STATE.stagedClosurePhoto = null;
  STATE.removeClosurePhotoFlag = true;
  const fileInput = document.getElementById('closureFileInput');
  if (fileInput) fileInput.value = '';
  
  if (STATE.activeDetailSnagId) {
    const activeSnag = snagsStore.find(s => s.id === STATE.activeDetailSnagId);
    if (activeSnag) {
      delete activeSnag.closurePhoto;
      delete activeSnag.closureTimestamp;
      delete activeSnag.closureUploadedBy;
      saveSnagsState();

      if (STATE.isFirebaseActive && STATE.db) {
        STATE.db.collection('snags').doc(activeSnag.id).update({
          closurePhoto: null,
          closureTimestamp: null,
          closureUploadedBy: null
        });
      }
      renderApp();
    }
  }

  renderClosurePreviewState(null, '', '');
}

function openDetailModal(snagId) {
  const snag = snagsStore.find(s => s.id === snagId);
  if (!snag) return;

  STATE.activeDetailSnagId = snagId;
  STATE.stagedClosurePhoto = null;
  STATE.removeClosurePhotoFlag = false;

  const fileInput = document.getElementById('closureFileInput');
  if (fileInput) fileInput.value = '';

  document.getElementById('detailSnagId').textContent = snag.id;
  const detailImg = document.getElementById('detailImage');
  if (detailImg) {
    detailImg.src = snag.photo;
    detailImg.className = "w-full h-full object-contain mx-auto cursor-pointer transition-transform duration-300 hover:scale-105";
    detailImg.onclick = () => downloadAndZoomPhoto(snag.photo, `${snag.id}_InitialDefect.jpg`, `Initial Defect Photo (${snag.id})`);
    detailImg.title = "Click to Download & View Clear High-Res Photo";
  }
  document.getElementById('detailDate').textContent = snag.timestamp;
  document.getElementById('detailGps').textContent = snag.gps || 'Site Coordinates';
  document.getElementById('detailLocation').textContent = snag.location;
  document.getElementById('detailFloor').textContent = snag.floor;
  document.getElementById('detailArea').textContent = snag.area;
  document.getElementById('detailPriority').textContent = snag.priority;
  document.getElementById('detailDescription').textContent = snag.description;
  document.getElementById('detailStatusSelect').value = snag.status;
  
  const detailAssignedEl = document.getElementById('detailAssignedUser');
  if (detailAssignedEl) {
    renderAssignedUserOptions(detailAssignedEl, snag.category, snag.assignedUser);
  }
  
  const remarkInput = document.getElementById('detailTechnicianRemark');
  if (remarkInput) remarkInput.value = snag.technicianRemark || '';

  // Render Closure Photo State
  renderClosurePreviewState(snag.closurePhoto || null, snag.closureTimestamp || '', snag.closureUploadedBy || 'Technician');

  const historyContainer = document.getElementById('detailRemarksHistoryContainer');
  const historyList = document.getElementById('detailRemarksHistoryList');
  if (historyContainer && historyList) {
    if (snag.remarksHistory && snag.remarksHistory.length > 0) {
      historyContainer.classList.remove('hidden');
      historyList.innerHTML = snag.remarksHistory.map(item => `
        <div class="border-b border-slate-800/80 pb-1.5">
          <div class="flex items-center justify-between text-[11px] text-cyan-300 font-bold">
            <span>Status: ${item.status}</span>
            <span class="text-[9px] text-slate-400 font-normal">${item.timestamp}</span>
          </div>
          <p class="text-[11px] text-slate-200 mt-0.5">${item.remark}</p>
          <span class="text-[9px] text-slate-500 block">By: ${item.updatedBy}</span>
        </div>
      `).join('');
    } else {
      historyContainer.classList.add('hidden');
    }
  }

  const catBadge = document.getElementById('detailCategoryBadge');
  catBadge.className = `${getCategoryBadgeClass(snag.category)} px-2.5 py-1 rounded-full text-xs font-bold`;
  catBadge.textContent = `${getCategoryIcon(snag.category)} ${snag.category}`;

  document.getElementById('detailModal').classList.remove('hidden');
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.add('hidden');
}

function saveDetailStatusUpdate() {
  if (!STATE.activeDetailSnagId) return;
  const newStatus = document.getElementById('detailStatusSelect').value;
  const remarkText = document.getElementById('detailTechnicianRemark')?.value.trim() || '';
  const newAssignedUser = document.getElementById('detailAssignedUser')?.value || '';

  updateSnagStatusAndRemark(
    STATE.activeDetailSnagId, 
    newStatus, 
    remarkText, 
    STATE.stagedClosurePhoto, 
    STATE.removeClosurePhotoFlag,
    newAssignedUser
  );

  closeDetailModal();
  alert(`✅ Snag ${STATE.activeDetailSnagId} updated successfully!`);
}


// ==========================================================================
// ADMIN USER MANAGEMENT MODULE
// ==========================================================================

function handleCreateUser(e) {
  e.preventDefault();
  const name = document.getElementById('newUserName').value.trim();
  const mobile = document.getElementById('newUserMobile').value.trim();
  const email = document.getElementById('newUserEmail').value.trim();
  const password = document.getElementById('newUserPassword').value.trim();
  const role = document.getElementById('newUserRole').value;
  const category = document.getElementById('newUserCategory').value;

  if (!/^[0-9]{9,10}$/.test(mobile)) {
    alert('Please enter a valid 9 or 10-digit mobile number!');
    return;
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    name,
    mobile,
    email: email || 'N/A',
    password: password || 'Admin@123',
    role,
    category,
    created: new Date().toISOString().split('T')[0]
  };

  SYSTEM_USERS.push(newUser);
  localStorage.setItem('snag_tracker_users', JSON.stringify(SYSTEM_USERS));

  // Sync user to Firebase if active
  if (STATE.isFirebaseActive && STATE.db) {
    STATE.db.collection('users').doc(newUser.id).set(newUser)
      .then(() => {
        console.log('User synced to Firebase Firestore');
      })
      .catch(err => {
        console.error('Firebase user save error:', err);
        alert('⚠️ Firebase Cloud Write Blocked: ' + err.message + '\n\nFix: Make sure Firestore Rules allow read/write in Firebase Console -> Firestore Database -> Rules!');
      });
  }

  // Reset Form
  document.getElementById('newUserName').value = '';
  document.getElementById('newUserMobile').value = '';
  document.getElementById('newUserEmail').value = '';
  document.getElementById('newUserPassword').value = 'Admin@123';
  renderUsersTable();
  alert(`User "${name}" created!\nMobile: ${mobile}\nPassword: ${password || 'Admin@123'}\nRole: ${role}`);
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  const countBadge = document.getElementById('userCountBadge');
  if (!tbody) return;

  if (countBadge) countBadge.textContent = `${SYSTEM_USERS.length} Registered`;

  tbody.innerHTML = SYSTEM_USERS.map(usr => {
    const catClass = getCategoryBadgeClass(usr.category);
    return `
      <tr class="hover:bg-slate-800/40">
        <td class="px-3 py-2.5">
          <div class="font-bold text-white text-xs">${usr.name}</div>
          <div class="text-[10px] text-cyan-400 font-mono"><i class="fa-solid fa-phone text-[9px] mr-1"></i>${usr.mobile}</div>
          <div class="text-[10px] text-slate-400">${usr.email}</div>
        </td>
        <td class="px-3 py-2.5">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${usr.role === 'Admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'}">
            ${usr.role}
          </span>
        </td>
        <td class="px-3 py-2.5">
          <span class="${catClass} px-2 py-0.5 rounded-full text-[10px] font-bold">
            ${usr.category}
          </span>
        </td>
        <td class="px-3 py-2.5 font-mono text-xs text-amber-300">
          <span class="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">${usr.password}</span>
        </td>
        <td class="px-3 py-2.5 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="openEditUserModal('${usr.id}')" class="px-2 py-1 rounded bg-slate-800 hover:bg-amber-600/30 text-amber-300 text-[10px] font-bold border border-amber-500/30 transition" title="Edit Category & User Details">
              <i class="fa-solid fa-pen-to-square mr-1"></i> Edit
            </button>
            <button onclick="impersonateUser('${usr.id}')" class="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-600/30 text-cyan-300 text-[10px] font-bold border border-cyan-500/30 transition" title="Preview as this User">
              <i class="fa-solid fa-eye mr-1"></i> View
            </button>
            <button onclick="deleteUserRecord('${usr.id}')" class="p-1 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 text-xs transition" title="Delete user">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// User Edit Modal Handlers
function openEditUserModal(userId) {
  const usr = SYSTEM_USERS.find(u => u.id === userId);
  if (!usr) return;

  const idInput = document.getElementById('editUserId');
  const nameInput = document.getElementById('editUserName');
  const mobileInput = document.getElementById('editUserMobile');
  const emailInput = document.getElementById('editUserEmail');
  const roleInput = document.getElementById('editUserRole');
  const catInput = document.getElementById('editUserCategory');
  const pwdInput = document.getElementById('editUserPassword');

  if (idInput) idInput.value = usr.id;
  if (nameInput) nameInput.value = usr.name || '';
  if (mobileInput) mobileInput.value = usr.mobile || '';
  if (emailInput) emailInput.value = usr.email === 'N/A' ? '' : (usr.email || '');
  if (roleInput) roleInput.value = usr.role || 'MST';
  if (catInput) catInput.value = usr.category || 'General';
  if (pwdInput) pwdInput.value = usr.password || 'Admin@123';

  document.getElementById('editUserModal')?.classList.remove('hidden');
}

function closeEditUserModal() {
  document.getElementById('editUserModal')?.classList.add('hidden');
}

function handleEditUserSubmit(e) {
  e.preventDefault();
  const userId = document.getElementById('editUserId').value;
  const name = document.getElementById('editUserName').value.trim();
  const mobile = document.getElementById('editUserMobile').value.trim();
  const email = document.getElementById('editUserEmail').value.trim();
  const role = document.getElementById('editUserRole').value;
  const category = document.getElementById('editUserCategory').value;
  const password = document.getElementById('editUserPassword').value.trim();

  if (!/^[0-9]{9,10}$/.test(mobile)) {
    alert('Please enter a valid 9 or 10-digit mobile number!');
    return;
  }

  const usrIndex = SYSTEM_USERS.findIndex(u => u.id === userId);
  if (usrIndex === -1) return;

  SYSTEM_USERS[usrIndex].name = name;
  SYSTEM_USERS[usrIndex].mobile = mobile;
  SYSTEM_USERS[usrIndex].email = email || 'N/A';
  SYSTEM_USERS[usrIndex].role = role;
  SYSTEM_USERS[usrIndex].category = category;
  SYSTEM_USERS[usrIndex].password = password || 'Admin@123';

  localStorage.setItem('snag_tracker_users', JSON.stringify(SYSTEM_USERS));

  // If active logged in user was updated, update STATE.currentUser
  if (STATE.currentUser && STATE.currentUser.id === userId) {
    STATE.currentUser = SYSTEM_USERS[usrIndex];
    localStorage.setItem('snag_tracker_active_user', JSON.stringify(STATE.currentUser));
  }

  // Sync edited user to Cloud Firestore if active
  if (STATE.isFirebaseActive && STATE.db) {
    STATE.db.collection('users').doc(userId).set(SYSTEM_USERS[usrIndex], { merge: true })
      .then(() => console.log('User updates synced to Cloud Firestore'))
      .catch(err => console.error('Cloud Firestore user edit error:', err));
  }

  closeEditUserModal();
  renderApp();
  alert(`✅ User "${name}" updated successfully!\nRole: ${role} | Category: ${category}`);
}

function impersonateUser(userId) {
  const targetUser = SYSTEM_USERS.find(u => u.id === userId);
  if (targetUser) {
    STATE.currentUser = targetUser;
    if (targetUser.role === 'Admin') {
      STATE.isAdminAuthenticated = true;
      switchSection('admin');
    } else {
      switchSection('user');
    }
    renderApp();
    alert(`Switched active view to user: ${targetUser.name} (${targetUser.role} - ${targetUser.category})`);
  }
}

function deleteUserRecord(userId) {
  if (confirm('Delete this user?')) {
    SYSTEM_USERS = SYSTEM_USERS.filter(u => u.id !== userId);
    localStorage.setItem('snag_tracker_users', JSON.stringify(SYSTEM_USERS));

    if (STATE.isFirebaseActive && STATE.db) {
      STATE.db.collection('users').doc(userId).delete();
    }
    renderUsersTable();
  }
}


// ==========================================================================
// EXPORT REPORTS MODULE (EXCEL & PDF)
// ==========================================================================

// EXCEL EXPORT (.xlsx)
function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('SheetJS Library loading error. Please refresh the page!');
    return;
  }

  const monthFilter = document.getElementById('adminFilterMonth')?.value;
  const categoryFilter = document.getElementById('adminFilterCategory')?.value || 'all';
  const statusFilter = document.getElementById('adminFilterStatus')?.value || 'all';

  let filtered = snagsStore.filter(snag => {
    if (monthFilter && snag.timestamp.substring(0, 7) !== monthFilter) return false;
    if (categoryFilter !== 'all' && snag.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && snag.status !== statusFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    alert('No observation snags match the selected filters to export!');
    return;
  }

  const dataRows = filtered.map((snag, idx) => ({
    'S.No': idx + 1,
    'Snag ID': snag.id,
    'Date & Time': snag.timestamp,
    'Building': snag.location,
    'Floor Level': snag.floor,
    'Location': snag.area,
    'Category': snag.category,
    'Priority': snag.priority,
    'Status': snag.status,
    'Assigned Team / User': snag.assignedUser,
    'Closure Photo Uploaded': snag.closurePhoto ? 'Yes' : 'No',
    'Closure Date & Time': snag.closureTimestamp || 'N/A',
    'Observation Remarks': snag.description,
    'GPS Coordinates': snag.gps
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Snag Observations');

  const filename = `Snag_Observation_Report_${monthFilter || 'All'}.xlsx`;
  XLSX.writeFile(workbook, filename);
}


// PDF REPORT EXPORT (.pdf with photos attached)
function exportToPDF() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    alert('PDF Generator loading error. Please refresh!');
    return;
  }

  const monthFilter = document.getElementById('adminFilterMonth')?.value || 'All Months';
  const categoryFilter = document.getElementById('adminFilterCategory')?.value || 'all';
  const statusFilter = document.getElementById('adminFilterStatus')?.value || 'all';

  let filtered = snagsStore.filter(snag => {
    if (monthFilter !== 'All Months' && snag.timestamp.substring(0, 7) !== monthFilter) return false;
    if (categoryFilter !== 'all' && snag.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && snag.status !== statusFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    alert('No observation snags match the selected filters for PDF export!');
    return;
  }

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(6, 182, 212);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SITE SNAG OBSERVATION & COMPLIANCE AUDIT REPORT', 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(`Report Filter: Month: ${monthFilter} | Category: ${categoryFilter} | Generated: ${new Date().toLocaleString()}`, 14, 24);

  // Metrics Summary Row
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 36, pageWidth - 28, 18, 3, 3, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const total = filtered.length;
  const openCount = filtered.filter(s => s.status === 'Open').length;
  const progCount = filtered.filter(s => s.status === 'In Progress').length;
  const resCount = filtered.filter(s => s.status === 'Resolved').length;

  doc.text(`Total Observations: ${total}   |   Open: ${openCount}   |   In Progress: ${progCount}   |   Resolved: ${resCount}`, 20, 47);

  // Table Columns
  const tableData = filtered.map((s, i) => [
    i + 1,
    s.id,
    s.timestamp,
    `${s.location}\n(${s.floor} - ${s.area})`,
    s.category,
    s.priority,
    s.closurePhoto ? `${s.status}\n(Closure ✓)` : s.status
  ]);

  doc.autoTable({
    startY: 60,
    head: [['#', 'Snag ID', 'Date/Time', 'Building & Location', 'Category', 'Priority', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillStyle: 'F', fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 32 },
      3: { cellWidth: 50 },
      4: { cellWidth: 25 },
      5: { cellWidth: 20 },
      6: { cellWidth: 20 }
    }
  });

  // Attach Photo Gallery Pages
  filtered.forEach((snag) => {
    doc.addPage();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(`SNAG PHOTO EVIDENCE ATTACHMENT - ${snag.id}`, 14, 13);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 26, pageWidth - 28, 40, 2, 2, 'FD');
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Category: ${snag.category}  |  Priority: ${snag.priority}  |  Status: ${snag.status}`, 18, 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Location: ${snag.location} - ${snag.floor} (${snag.area})`, 18, 42);
    doc.text(`Captured Date & Time: ${snag.timestamp} | GPS: ${snag.gps}`, 18, 50);
    doc.text(`Assigned Specialist: ${snag.assignedUser}`, 18, 58);

    if (snag.closurePhoto) {
      const imgWidth = (pageWidth - 34) / 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(225, 29, 72);
      doc.text('INITIAL DEFECT PHOTO (BEFORE)', 14, 70);
      doc.setTextColor(16, 185, 129);
      doc.text('CLOSURE PHOTO (AFTER / FIXED)', 18 + imgWidth, 70);

      try {
        doc.addImage(snag.photo, 'JPEG', 14, 73, imgWidth, 105);
      } catch (e) {}

      try {
        doc.addImage(snag.closurePhoto, 'JPEG', 18 + imgWidth, 73, imgWidth, 105);
      } catch (e) {}
    } else {
      try {
        doc.addImage(snag.photo, 'JPEG', 14, 72, pageWidth - 28, 110);
      } catch (e) {
        doc.setFontSize(9);
        doc.setTextColor(225, 29, 72);
        doc.text('[Image attached as DataURL - displayed in digital view]', 14, 80);
      }
    }

    doc.setFillColor(255, 255, 255);
    doc.rect(14, 188, pageWidth - 28, 40, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, 188, pageWidth - 28, 40, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('Observation Remarks / Corrective Action Required:', 18, 196);

    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(snag.description, pageWidth - 40);
    doc.text(splitText, 18, 204);
  });

  doc.save(`Snag_Observation_Report_${monthFilter}.pdf`);
}


// ==========================================================================
// FIREBASE INTEGRATION & REALTIME CLOUD SYNC
// ==========================================================================

function openFirebaseConfigModal() {
  const savedFb = localStorage.getItem('snag_tracker_firebase_config');
  let config = savedFb ? JSON.parse(savedFb) : DEFAULT_FIREBASE_CONFIG;
  if (config) {
    if (config.apiKey) document.getElementById('fbApiKey').value = config.apiKey;
    if (config.authDomain) document.getElementById('fbAuthDomain').value = config.authDomain;
    if (config.projectId) document.getElementById('fbProjectId').value = config.projectId;
    if (config.storageBucket) document.getElementById('fbStorageBucket').value = config.storageBucket;
    if (config.messagingSenderId) document.getElementById('fbMessagingSenderId').value = config.messagingSenderId;
    if (config.appId) document.getElementById('fbAppId').value = config.appId;
  }
  document.getElementById('firebaseModal').classList.remove('hidden');
}

function closeFirebaseConfigModal() {
  document.getElementById('firebaseModal').classList.add('hidden');
}

function saveFirebaseConfig(e) {
  e.preventDefault();

  const config = {
    apiKey: document.getElementById('fbApiKey').value.trim(),
    authDomain: document.getElementById('fbAuthDomain').value.trim(),
    projectId: document.getElementById('fbProjectId').value.trim(),
    storageBucket: document.getElementById('fbStorageBucket').value.trim(),
    messagingSenderId: document.getElementById('fbMessagingSenderId').value.trim(),
    appId: document.getElementById('fbAppId').value.trim()
  };

  if (!config.apiKey || !config.projectId) {
    alert('Please enter valid Firebase API Key and Project ID!');
    return;
  }

  localStorage.setItem('snag_tracker_firebase_config', JSON.stringify(config));
  initializeFirebaseApp(config);
  closeFirebaseConfigModal();
  alert('🎉 Firebase Cloud initialized and saved permanently! Cloud sync will automatically stay connected on this device.');
}

function clearFirebaseConfig() {
  localStorage.removeItem('snag_tracker_firebase_config');
  STATE.isFirebaseActive = false;
  STATE.db = null;

  const pill = document.getElementById('firebaseStatusPill');
  const text = document.getElementById('firebaseStatusText');
  if (pill) pill.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
  if (text) text.textContent = 'Local Database Mode';

  closeFirebaseConfigModal();
  alert('Switched back to Local Storage mode.');
}

function initializeFirebaseApp(config) {
  if (typeof firebase === 'undefined') return;

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    STATE.db = firebase.firestore();
    STATE.storage = firebase.storage();
    STATE.isFirebaseActive = true;

    const pill = document.getElementById('firebaseStatusPill');
    const text = document.getElementById('firebaseStatusText');

    // Perform live connection test write to verify Firestore Rules & connectivity
    STATE.db.collection('system_status').doc('ping').set({
      connected: true,
      lastPing: new Date().toISOString(),
      projectId: config.projectId
    }).then(() => {
      console.log('✅ Firebase Cloud Firestore Write Verified!');
      if (pill) pill.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50';
      if (text) text.textContent = '🟢 Firebase Cloud Verified Active';

      // Seed all system users (including Admin & registered users) to Firestore
      if (SYSTEM_USERS && SYSTEM_USERS.length > 0) {
        SYSTEM_USERS.forEach(usr => {
          STATE.db.collection('users').doc(usr.id).set(usr, { merge: true })
            .catch(e => console.error('Firebase seeding error:', e));
        });
      }
    }).catch(err => {
      console.error('❌ Firebase Write Blocked:', err);
      if (pill) pill.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/50';
      if (text) text.textContent = '⚠️ Cloud Rules Blocked (Update Rules)';
    });

    // Subscribe to Realtime Firestore Snags updates
    STATE.db.collection('snags').onSnapshot((snapshot) => {
      const cloudSnags = [];
      const isFirstLoad = knownSnagIds.size === 0;

      snapshot.forEach(doc => {
        const snag = doc.data();
        cloudSnags.push(snag);

        if (!isFirstLoad) {
          const prevAssigned = knownSnagAssignments.get(snag.id);
          if (!knownSnagIds.has(snag.id)) {
            // New snag created & assigned
            triggerSnagAssignmentNotification(snag, 'new');
          } else if (prevAssigned && snag.assignedUser && prevAssigned !== snag.assignedUser) {
            // Existing snag reassigned
            triggerSnagAssignmentNotification(snag, 'reassigned');
          }
        }
        knownSnagIds.add(snag.id);
        knownSnagAssignments.set(snag.id, snag.assignedUser || '');
      });
      snagsStore = cloudSnags;
      saveSnagsState();
      renderApp();
    });

    // Subscribe to Realtime Firestore Users updates across all devices
    STATE.db.collection('users').onSnapshot((snapshot) => {
      if (!snapshot.empty) {
        const cloudUsers = [];
        snapshot.forEach(doc => {
          cloudUsers.push(doc.data());
        });
        if (cloudUsers.length > 0) {
          SYSTEM_USERS = cloudUsers;
          localStorage.setItem('snag_tracker_users', JSON.stringify(SYSTEM_USERS));
          renderUsersTable();
        }
      }
    });

    // Subscribe to Realtime Firestore Locations config updates
    STATE.db.collection('locations').doc('config').onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        if (data && data.buildings && data.floors) {
          SITE_LOCATIONS = data;
          localStorage.setItem('snag_tracker_locations', JSON.stringify(SITE_LOCATIONS));
          renderLocationOptions();
        }
      }
    });

  } catch (err) {
    console.error('Firebase initialization error:', err);
    alert('Could not connect to Firebase with provided keys. Check console or credentials.');
  }
}


// Utility Badge Color Helpers
function getCategoryBadgeClass(category) {
  switch (category) {
    case 'Electrical': return 'badge-electrical';
    case 'Plumbing': return 'badge-plumbing';
    case 'Carpentry': return 'badge-carpentry';
    case 'Painting': return 'badge-painting';
    default: return 'badge-general';
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Open': return 'status-open';
    case 'In Progress': return 'status-in-progress';
    case 'Resolved': return 'status-resolved';
    default: return 'status-open';
  }
}

function getCategoryIcon(category) {
  switch (category) {
    case 'Electrical': return '⚡';
    case 'Plumbing': return '🔧';
    case 'Carpentry': return '🪛';
    case 'Painting': return '🎨';
    default: return '📦';
  }
}
