/* ==========================================================================
   Snag Observation & Management System - Core Application Logic
   ========================================================================== */

// Global Application State
const STATE = {
  activeSection: 'user', // 'user' or 'admin'
  activeAdminTab: 'tracking', // 'tracking' or 'users'
  currentPersonaKey: 'user_electrical',
  mediaStream: null,
  facingMode: 'environment', // 'user' or 'environment'
  capturedPhotoDataUrl: null,
  userGps: { lat: 12.9716, lng: 77.5946, text: '12.9716° N, 77.5946° E' },
  activeDetailSnagId: null,
  isFirebaseActive: false,
  db: null,
  storage: null,
  auth: null
};

// System Users Database (Default initial users)
let SYSTEM_USERS = [
  { id: 'usr_1', name: 'Rajesh Kumar', email: 'rajesh.elec@site.com', role: 'Technician', category: 'Electrical', created: '2026-01-15' },
  { id: 'usr_2', name: 'Sunil Verma', email: 'sunil.plumb@site.com', role: 'Technician', category: 'Plumbing', created: '2026-01-18' },
  { id: 'usr_3', name: 'Amit Singh', email: 'amit.carp@site.com', role: 'Technician', category: 'Carpentry', created: '2026-02-01' },
  { id: 'usr_4', name: 'Ravi Sharma', email: 'ravi.paint@site.com', role: 'Technician', category: 'Painting', created: '2026-02-10' },
  { id: 'usr_5', name: 'Pooja Nair', email: 'pooja.gen@site.com', role: 'Technician', category: 'General', created: '2026-03-05' },
  { id: 'usr_6', name: 'Site Safety Admin', email: 'admin@site.com', role: 'Admin', category: 'General', created: '2026-01-01' }
];

// Persona Mapping Configuration
const PERSONAS = {
  admin: { name: 'Site Safety Admin', role: 'Admin', category: 'All', icon: '👑', color: 'badge-general' },
  user_electrical: { name: 'Rajesh Kumar', role: 'Technician', category: 'Electrical', icon: '⚡', color: 'badge-electrical' },
  user_plumbing: { name: 'Sunil Verma', role: 'Technician', category: 'Plumbing', icon: '🔧', color: 'badge-plumbing' },
  user_carpentry: { name: 'Amit Singh', role: 'Technician', category: 'Carpentry', icon: '🪛', color: 'badge-carpentry' },
  user_painting: { name: 'Ravi Sharma', role: 'Technician', category: 'Painting', icon: '🎨', color: 'badge-painting' },
  user_general: { name: 'Pooja Nair', role: 'Technician', category: 'General', icon: '📦', color: 'badge-general' }
};

// Initial Default Sample Snag Observations Dataset
const INITIAL_SNAGS = [
  {
    id: 'SNAG-2026-0801',
    timestamp: '2026-08-08 14:30:15',
    monthYear: '2026-08',
    location: 'Tower A - Main Building',
    floor: '2nd Floor',
    area: 'Electrical DB Room 204',
    category: 'Electrical',
    priority: 'High',
    status: 'Open',
    description: 'Exposed wire termination near circuit breaker CB14. Cable tag loose and ground bonding wire missing.',
    assignedUser: 'Rajesh Kumar (Electrical)',
    gps: '12.9716° N, 77.5946° E',
    photo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%231e293b"/><path d="M150 100 h300 v200 h-300 z" fill="%230f172a" stroke="%23f59e0b" stroke-width="4"/><text x="300" y="180" font-family="sans-serif" font-size="20" fill="%23fbbf24" text-anchor="middle">⚡ ELECTRICAL PANEL DEFECT</text><text x="300" y="220" font-family="sans-serif" font-size="14" fill="%2394a3b8" text-anchor="middle">Location: Tower A, 2nd Floor (DB-204)</text><rect x="0" y="340" width="600" height="60" fill="%23090d16"/><text x="20" y="375" font-family="monospace" font-size="14" fill="%2338bdf8">DATE: 2026-08-08 14:30 | GPS: 12.9716 N, 77.5946 E</text></svg>'
  },
  {
    id: 'SNAG-2026-0802',
    timestamp: '2026-08-08 11:15:40',
    monthYear: '2026-08',
    location: 'Tower B - Commercial',
    floor: '1st Floor',
    area: 'Restroom Wet Area B',
    category: 'Plumbing',
    priority: 'Medium',
    status: 'In Progress',
    description: 'Minor water seepage observed at PVC pipe elbow joint under sink counter. Gasket needs replacement.',
    assignedUser: 'Sunil Verma (Plumbing)',
    gps: '12.9718° N, 77.5948° E',
    photo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%230f172a"/><path d="M200 120 h200 v160 h-200 z" fill="%231e293b" stroke="%2306b6d4" stroke-width="4"/><text x="300" y="180" font-family="sans-serif" font-size="20" fill="%2338bdf8" text-anchor="middle">🔧 PLUMBING LEAK DEFECT</text><text x="300" y="220" font-family="sans-serif" font-size="14" fill="%2394a3b8" text-anchor="middle">Location: Tower B, 1st Floor Restroom</text><rect x="0" y="340" width="600" height="60" fill="%23090d16"/><text x="20" y="375" font-family="monospace" font-size="14" fill="%2338bdf8">DATE: 2026-08-08 11:15 | GPS: 12.9718 N, 77.5948 E</text></svg>'
  },
  {
    id: 'SNAG-2026-0803',
    timestamp: '2026-08-07 16:45:10',
    monthYear: '2026-08',
    location: 'Podium Plaza',
    floor: 'Ground Floor',
    area: 'Main Entrance Fire Door',
    category: 'Carpentry',
    priority: 'High',
    status: 'Open',
    description: 'Fire exit door frame misaligned; door leaf scraping bottom threshold. Needs hinge adjustment and trimming.',
    assignedUser: 'Amit Singh (Carpentry)',
    gps: '12.9715° N, 77.5945° E',
    photo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%2318181b"/><path d="M180 80 h240 v240 h-240 z" fill="%2327272a" stroke="%23f59e0b" stroke-width="4"/><text x="300" y="180" font-family="sans-serif" font-size="20" fill="%23fbbf24" text-anchor="middle">🪛 DOOR ALIGNMENT SNAG</text><text x="300" y="220" font-family="sans-serif" font-size="14" fill="%23a1a1aa" text-anchor="middle">Location: Podium Plaza, Ground Entrance</text><rect x="0" y="340" width="600" height="60" fill="%23090d16"/><text x="20" y="375" font-family="monospace" font-size="14" fill="%2338bdf8">DATE: 2026-08-07 16:45 | GPS: 12.9715 N, 77.5945 E</text></svg>'
  },
  {
    id: 'SNAG-2026-0701',
    timestamp: '2026-07-28 10:20:00',
    monthYear: '2026-07',
    location: 'Tower A - Main Building',
    floor: '3rd Floor',
    area: 'Executive Lobby Corridor',
    category: 'Painting',
    priority: 'Low',
    status: 'Resolved',
    description: 'Uneven primer coat and drywall patch visible under wall lighting near Elevator B. Touchup paint completed.',
    assignedUser: 'Ravi Sharma (Painting)',
    gps: '12.9716° N, 77.5946° E',
    photo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%231e1b4b"/><path d="M150 100 h300 v200 h-300 z" fill="%23312e81" stroke="%23c084fc" stroke-width="4"/><text x="300" y="180" font-family="sans-serif" font-size="20" fill="%23e879f9" text-anchor="middle">🎨 WALL PAINT PATCH DEFECT</text><text x="300" y="220" font-family="sans-serif" font-size="14" fill="%23cbd5e1" text-anchor="middle">Location: Tower A, 3rd Floor Lobby</text><rect x="0" y="340" width="600" height="60" fill="%23090d16"/><text x="20" y="375" font-family="monospace" font-size="14" fill="%2338bdf8">DATE: 2026-07-28 10:20 | GPS: 12.9716 N, 77.5946 E</text></svg>'
  }
];

let snagsStore = [];

// Initialize Application on Page Load
document.addEventListener('DOMContentLoaded', () => {
  initLiveClock();
  initLocalStorage();
  initGeolocation();
  initPersonaSelector();
  initDefaultMonthFilter();
  renderApp();
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

// Local Storage Initializer
function initLocalStorage() {
  const savedSnags = localStorage.getItem('snag_tracker_snags');
  if (savedSnags) {
    try {
      snagsStore = JSON.parse(savedSnags);
    } catch (e) {
      snagsStore = INITIAL_SNAGS;
    }
  } else {
    snagsStore = INITIAL_SNAGS;
    localStorage.setItem('snag_tracker_snags', JSON.stringify(snagsStore));
  }

  const savedUsers = localStorage.getItem('snag_tracker_users');
  if (savedUsers) {
    try {
      SYSTEM_USERS = JSON.parse(savedUsers);
    } catch (e) {}
  } else {
    localStorage.setItem('snag_tracker_users', JSON.stringify(SYSTEM_USERS));
  }

  // Check stored Firebase config
  const savedFb = localStorage.getItem('snag_tracker_firebase_config');
  if (savedFb) {
    try {
      const config = JSON.parse(savedFb);
      initializeFirebaseApp(config);
    } catch (e) {}
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

// Persona Switcher Handler
function initPersonaSelector() {
  const select = document.getElementById('userSelector');
  if (select) {
    select.addEventListener('change', (e) => {
      STATE.currentPersonaKey = e.target.value;
      const persona = PERSONAS[STATE.currentPersonaKey];

      // Auto switch section if admin is selected vs user
      if (e.target.value === 'admin') {
        switchSection('admin');
      } else {
        switchSection('user');
      }
      renderApp();
    });
  }
}

// Main Render Dispatcher
function renderApp() {
  const persona = PERSONAS[STATE.currentPersonaKey];
  
  // Update User Banner
  const nameEl = document.getElementById('currentUserNameDisplay');
  const catBadge = document.getElementById('userCategoryBadge');
  const catText = document.getElementById('userCategoryText');
  const roleTag = document.getElementById('userRoleTag');

  if (nameEl) nameEl.textContent = persona.name;
  if (catText) catText.textContent = persona.category;
  if (roleTag) roleTag.textContent = persona.role;

  if (catBadge) {
    catBadge.className = `${persona.color} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5`;
    catBadge.innerHTML = `<span>${persona.icon}</span> <span>${persona.category} Category</span>`;
  }

  // Set category dropdown default in Capture Modal to match active user persona
  const inputCategory = document.getElementById('inputCategory');
  if (inputCategory && persona.category !== 'All') {
    inputCategory.value = persona.category;
  }

  // Render feeds
  renderUserSnagsFeed();
  renderAdminSnagsTable();
  renderUsersTable();
}


// Switch Main Section (User vs Admin)
function switchSection(section) {
  STATE.activeSection = section;
  const userSec = document.getElementById('userSection');
  const adminSec = document.getElementById('adminSection');
  const navUserBtn = document.getElementById('navUserTab');
  const navAdminBtn = document.getElementById('navAdminTab');

  if (section === 'user') {
    userSec.classList.remove('hidden');
    adminSec.classList.add('hidden');
    navUserBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-cyan-600 text-white shadow';
    navAdminBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white';
  } else {
    userSec.classList.add('hidden');
    adminSec.classList.remove('hidden');
    navAdminBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-blue-600 text-white shadow';
    navUserBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white';
  }
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
  if (!grid) return;

  const persona = PERSONAS[STATE.currentPersonaKey];
  const filterStatus = document.getElementById('userFilterStatus')?.value || 'all';
  const searchQuery = document.getElementById('userSearchInput')?.value?.toLowerCase() || '';

  // Filter snags by active user's assigned category (Unless Admin viewing)
  let filtered = snagsStore.filter(snag => {
    if (persona.category !== 'All' && snag.category !== persona.category) {
      return false;
    }
    if (filterStatus !== 'all' && snag.status !== filterStatus) {
      return false;
    }
    if (searchQuery) {
      const match = snag.location.toLowerCase().includes(searchQuery) ||
                    snag.area.toLowerCase().includes(searchQuery) ||
                    snag.description.toLowerCase().includes(searchQuery) ||
                    snag.id.toLowerCase().includes(searchQuery);
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
        <h4 class="text-sm font-bold text-slate-300">No Snags Found</h4>
        <p class="text-xs text-slate-500">No observation snags logged in category (${persona.category}) matching filters.</p>
      </div>
    `;
    return;
  }

  // Render Snag Cards
  grid.innerHTML = filtered.map(snag => {
    const catClass = getCategoryBadgeClass(snag.category);
    const statusClass = getStatusBadgeClass(snag.status);

    return `
      <div class="glass-panel rounded-2xl overflow-hidden snag-card flex flex-col justify-between border border-slate-800">
        <!-- Photo Container -->
        <div class="relative bg-black h-48 overflow-hidden group">
          <img src="${snag.photo}" alt="${snag.id}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
          
          <!-- Category & Status Badge Overlay -->
          <div class="absolute top-2 left-2 flex items-center gap-1.5">
            <span class="${catClass} px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shadow">
              ${snag.category}
            </span>
            <span class="${statusClass} px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow">
              ${snag.status}
            </span>
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
            </div>
          </div>

          <!-- Bottom Action Toolbar -->
          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <select onchange="updateSnagStatusDirect('${snag.id}', this.value)" class="bg-slate-900 border border-slate-700 text-[11px] text-slate-200 rounded-lg px-2 py-1 focus:outline-none">
              <option value="Open" ${snag.status === 'Open' ? 'selected' : ''}>🔴 Open</option>
              <option value="In Progress" ${snag.status === 'In Progress' ? 'selected' : ''}>🟡 In Progress</option>
              <option value="Resolved" ${snag.status === 'Resolved' ? 'selected' : ''}>🟢 Resolved</option>
            </select>

            <button onclick="openDetailModal('${snag.id}')" class="px-3 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 font-semibold text-xs border border-cyan-500/30 flex items-center gap-1 transition">
              <i class="fa-solid fa-eye"></i> View Detail
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

  const monthFilter = document.getElementById('adminFilterMonth')?.value; // '2026-08'
  const categoryFilter = document.getElementById('adminFilterCategory')?.value || 'all';
  const statusFilter = document.getElementById('adminFilterStatus')?.value || 'all';
  const floorFilter = document.getElementById('adminFilterFloor')?.value || 'all';
  const searchQuery = document.getElementById('adminSearchInput')?.value?.toLowerCase() || '';

  let filtered = snagsStore.filter(snag => {
    // Month Filter (Match YYYY-MM)
    if (monthFilter) {
      const snagMonth = snag.timestamp.substring(0, 7); // '2026-08'
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
        <td class="px-4 py-3 font-mono">
          <div class="flex items-center gap-3">
            <img src="${snag.photo}" class="w-10 h-10 rounded-lg object-cover border border-slate-700" alt="thumbnail">
            <div>
              <div class="font-bold text-cyan-400 text-xs">${snag.id}</div>
              <div class="text-[10px] text-slate-400">${snag.priority} Priority</div>
            </div>
          </div>
        </td>
        <td class="px-4 py-3 font-mono text-[11px] text-slate-300">
          <i class="fa-solid fa-clock mr-1 text-slate-500"></i>${snag.timestamp}
        </td>
        <td class="px-4 py-3">
          <div class="font-semibold text-white text-xs">${snag.location}</div>
          <div class="text-[10px] text-slate-400">${snag.floor} • ${snag.area}</div>
        </td>
        <td class="px-4 py-3">
          <span class="${catClass} px-2.5 py-0.5 rounded-full text-[10px] font-bold">
            ${snag.category}
          </span>
        </td>
        <td class="px-4 py-3 text-xs text-slate-300">
          ${snag.assignedUser}
        </td>
        <td class="px-4 py-3">
          <span class="${statusClass} px-2 py-0.5 rounded-full text-[10px] font-bold">
            ${snag.status}
          </span>
        </td>
        <td class="px-4 py-3 text-right">
          <div class="flex items-center justify-end gap-2">
            <button onclick="openDetailModal('${snag.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition" title="View Full Details">
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
}

function closeCaptureModal() {
  stopWebcamStream();
  document.getElementById('captureModal').classList.add('hidden');
}

async function startWebcamStream() {
  const video = document.getElementById('webcamVideo');
  const placeholder = document.getElementById('cameraPlaceholder');
  const overlay = document.getElementById('cameraControlsOverlay');
  const uploadPreview = document.getElementById('uploadImagePreview');
  const snapshotCanvas = document.getElementById('snapshotCanvas');

  stopWebcamStream();
  uploadPreview.classList.add('hidden');
  snapshotCanvas.classList.add('hidden');

  try {
    const constraints = {
      video: {
        facingMode: STATE.facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };
    STATE.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = STATE.mediaStream;
    video.classList.remove('hidden');
    placeholder.classList.add('hidden');
    overlay.classList.remove('hidden');
  } catch (err) {
    alert('Camera access denied or unavailable. You can use the "Upload Image" option instead!');
  }
}

function switchCameraFacing() {
  STATE.facingMode = STATE.facingMode === 'user' ? 'environment' : 'user';
  startWebcamStream();
}

function stopWebcamStream() {
  if (STATE.mediaStream) {
    STATE.mediaStream.getTracks().forEach(track => track.stop());
    STATE.mediaStream = null;
  }
  const video = document.getElementById('webcamVideo');
  if (video) video.classList.add('hidden');
  const overlay = document.getElementById('cameraControlsOverlay');
  if (overlay) overlay.classList.add('hidden');
}

// Draw Photo Frame to Canvas & Apply Stamp Overlay
function takeCameraSnap() {
  const video = document.getElementById('webcamVideo');
  const canvas = document.getElementById('snapshotCanvas');
  const ctx = canvas.getContext('2d');
  const retakeBtn = document.getElementById('retakeOverlay');

  canvas.width = video.videoWidth || 800;
  canvas.height = video.videoHeight || 600;

  // Draw Camera Frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Apply Real-Time Date, Time & GPS Stamp Overlay
  stampCanvasMetadata(canvas, ctx);

  STATE.capturedPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.85);

  stopWebcamStream();
  canvas.classList.remove('hidden');
  retakeBtn.classList.remove('hidden');
}

function handleFileInput(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.getElementById('snapshotCanvas');
      const ctx = canvas.getContext('2d');
      const placeholder = document.getElementById('cameraPlaceholder');
      const retakeBtn = document.getElementById('retakeOverlay');

      canvas.width = img.width || 800;
      canvas.height = img.height || 600;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      stampCanvasMetadata(canvas, ctx);

      STATE.capturedPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      placeholder.classList.add('hidden');
      canvas.classList.remove('hidden');
      retakeBtn.classList.remove('hidden');
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function stampCanvasMetadata(canvas, ctx) {
  const now = new Date();
  const timestampStr = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    now.toLocaleTimeString();

  const floorVal = document.getElementById('inputFloor')?.value || 'Site Area';
  const areaVal = document.getElementById('inputArea')?.value || 'General';

  // Bottom overlay banner background
  const bannerHeight = 50;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, bannerHeight);

  // Top accent stripe
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, 3);

  // Text Stamp
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`DATE/REALTIME: ${timestampStr}`, 15, canvas.height - 28);

  ctx.font = '14px "Courier New", monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`LOC: ${floorVal} (${areaVal}) | GPS: ${STATE.userGps.text}`, 15, canvas.height - 10);
}

function resetPhotoCapture() {
  stopWebcamStream();
  STATE.capturedPhotoDataUrl = null;
  document.getElementById('webcamVideo').classList.add('hidden');
  document.getElementById('snapshotCanvas').classList.add('hidden');
  document.getElementById('uploadImagePreview').classList.add('hidden');
  document.getElementById('retakeOverlay').classList.add('hidden');
  document.getElementById('cameraControlsOverlay').classList.add('hidden');
  document.getElementById('cameraPlaceholder').classList.remove('hidden');
}


// Save New Snag Form Handler
function handleSaveSnag(e) {
  e.preventDefault();

  if (!STATE.capturedPhotoDataUrl) {
    alert('Please capture a photo or upload an image before submitting!');
    return;
  }

  const now = new Date();
  const timestampStr = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    now.toLocaleTimeString();
  
  const monthYearStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const persona = PERSONAS[STATE.currentPersonaKey];

  const newSnag = {
    id: `SNAG-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: timestampStr,
    monthYear: monthYearStr,
    location: document.getElementById('inputLocation').value,
    floor: document.getElementById('inputFloor').value,
    area: document.getElementById('inputArea').value,
    category: document.getElementById('inputCategory').value,
    priority: document.getElementById('inputPriority').value,
    status: document.getElementById('inputStatus').value,
    description: document.getElementById('inputDescription').value,
    assignedUser: `${persona.name} (${persona.category})`,
    gps: STATE.userGps.text,
    photo: STATE.capturedPhotoDataUrl
  };

  // Add to local state & persist
  snagsStore.unshift(newSnag);
  saveSnagsState();

  // Sync to Firebase if active
  if (STATE.isFirebaseActive && STATE.db) {
    STATE.db.collection('snags').doc(newSnag.id).set(newSnag)
      .then(() => console.log('Snag synced to Firebase Firestore'))
      .catch(err => console.error('Firebase save error:', err));
  }

  closeCaptureModal();
  renderApp();
  alert(`Snag Observation ${newSnag.id} created successfully and routed to ${newSnag.category} team!`);
}

function updateSnagStatusDirect(snagId, newStatus) {
  const target = snagsStore.find(s => s.id === snagId);
  if (target) {
    target.status = newStatus;
    saveSnagsState();

    if (STATE.isFirebaseActive && STATE.db) {
      STATE.db.collection('snags').doc(snagId).update({ status: newStatus });
    }
    renderApp();
  }
}

function deleteSnagRecord(snagId) {
  if (confirm(`Are you sure you want to delete observation ${snagId}?`)) {
    snagsStore = snagsStore.filter(s => s.id !== snagId);
    saveSnagsState();

    if (STATE.isFirebaseActive && STATE.db) {
      STATE.db.collection('snags').doc(snagId).delete();
    }
    renderApp();
  }
}

function saveSnagsState() {
  localStorage.setItem('snag_tracker_snags', JSON.stringify(snagsStore));
}


// ==========================================================================
// DETAIL MODAL LOGIC
// ==========================================================================

function openDetailModal(snagId) {
  const snag = snagsStore.find(s => s.id === snagId);
  if (!snag) return;

  STATE.activeDetailSnagId = snagId;

  document.getElementById('detailSnagId').textContent = snag.id;
  document.getElementById('detailImage').src = snag.photo;
  document.getElementById('detailDate').textContent = snag.timestamp;
  document.getElementById('detailGps').textContent = snag.gps || 'Site Coordinates';
  document.getElementById('detailLocation').textContent = snag.location;
  document.getElementById('detailFloor').textContent = snag.floor;
  document.getElementById('detailArea').textContent = snag.area;
  document.getElementById('detailPriority').textContent = snag.priority;
  document.getElementById('detailDescription').textContent = snag.description;
  document.getElementById('detailStatusSelect').value = snag.status;
  document.getElementById('detailAssignedUser').value = snag.assignedUser;

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
  updateSnagStatusDirect(STATE.activeDetailSnagId, newStatus);
  closeDetailModal();
}


// ==========================================================================
// ADMIN USER MANAGEMENT MODULE
// ==========================================================================

function handleCreateUser(e) {
  e.preventDefault();
  const name = document.getElementById('newUserName').value;
  const email = document.getElementById('newUserEmail').value;
  const role = document.getElementById('newUserRole').value;
  const category = document.getElementById('newUserCategory').value;

  const newUser = {
    id: `usr_${Date.now()}`,
    name,
    email,
    role,
    category,
    created: new Date().toISOString().split('T')[0]
  };

  SYSTEM_USERS.push(newUser);
  localStorage.setItem('snag_tracker_users', JSON.stringify(SYSTEM_USERS));

  // Reset Form
  document.getElementById('newUserName').value = '';
  document.getElementById('newUserEmail').value = '';
  renderUsersTable();
  alert(`User ${name} created and assigned to ${category} category!`);
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
          <div class="text-[10px] text-slate-400">${usr.email}</div>
        </td>
        <td class="px-3 py-2.5">
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            ${usr.role}
          </span>
        </td>
        <td class="px-3 py-2.5">
          <span class="${catClass} px-2 py-0.5 rounded-full text-[10px] font-bold">
            ${usr.category}
          </span>
        </td>
        <td class="px-3 py-2.5">
          <button onclick="deleteUserRecord('${usr.id}')" class="text-xs text-rose-400 hover:text-rose-300 font-semibold" title="Delete user">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function deleteUserRecord(userId) {
  if (confirm('Delete this user?')) {
    SYSTEM_USERS = SYSTEM_USERS.filter(u => u.id !== userId);
    localStorage.setItem('snag_tracker_users', JSON.stringify(SYSTEM_USERS));
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

  // Filter snags for report
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

  // Format data rows for Excel
  const dataRows = filtered.map((snag, idx) => ({
    'S.No': idx + 1,
    'Snag ID': snag.id,
    'Date & Time': snag.timestamp,
    'Building Location': snag.location,
    'Floor Level': snag.floor,
    'Specific Area': snag.area,
    'Category': snag.category,
    'Priority': snag.priority,
    'Status': snag.status,
    'Assigned Team / User': snag.assignedUser,
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
  doc.setFillColor(15, 23, 42); // Dark slate
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(6, 182, 212); // Cyan
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
    s.status
  ]);

  doc.autoTable({
    startY: 60,
    head: [['#', 'Snag ID', 'Date/Time', 'Location & Area', 'Category', 'Priority', 'Status']],
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
  filtered.forEach((snag, idx) => {
    doc.addPage();

    // Header for photo card page
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(`SNAG PHOTO EVIDENCE ATTACHMENT - ${snag.id}`, 14, 13);

    // Metadata Box
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

    // Embed Stamped Photo Image
    try {
      doc.addImage(snag.photo, 'JPEG', 14, 72, pageWidth - 28, 110);
    } catch (e) {
      doc.setFontSize(9);
      doc.setTextColor(225, 29, 72);
      doc.text('[Image attached as DataURL - displayed in digital view]', 14, 80);
    }

    // Observation Remarks Box
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

    // Update Status Pill
    const pill = document.getElementById('firebaseStatusPill');
    const text = document.getElementById('firebaseStatusText');
    if (pill) pill.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30';
    if (text) text.textContent = '☁️ Live Firebase Cloud Active';

    // Subscribe to Realtime Firestore updates
    STATE.db.collection('snags').onSnapshot((snapshot) => {
      const cloudSnags = [];
      snapshot.forEach(doc => {
        cloudSnags.push(doc.data());
      });
      if (cloudSnags.length > 0) {
        snagsStore = cloudSnags;
        saveSnagsState();
        renderApp();
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
