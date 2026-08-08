/* ==========================================================================
   Snag Observation & Management System - Core Application Logic
   ========================================================================== */

// Admin Password Constant
const ADMIN_PASSWORD = 'Satya@1996';

// Global Application State
const STATE = {
  activeSection: 'user', // 'user' or 'admin'
  activeAdminTab: 'tracking', // 'tracking' or 'users'
  currentUser: null, // Logged in user object
  isAdminAuthenticated: false,
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

// Registered System Users Database (Clean initial database - default single Admin account)
let SYSTEM_USERS = [
  { id: 'usr_admin', name: 'Site Admin Manager', mobile: '9999999999', email: 'admin@site.com', password: 'Satya@1996', role: 'Admin', category: 'General', created: '2026-01-01' }
];

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
      snagsStore = [];
    }
  } else {
    snagsStore = [];
    localStorage.setItem('snag_tracker_snags', JSON.stringify(snagsStore));
  }

  const savedUsers = localStorage.getItem('snag_tracker_users');
  if (savedUsers) {
    try {
      const parsed = JSON.parse(savedUsers);
      if (parsed && parsed.length > 0) {
        SYSTEM_USERS = parsed;
      }
    } catch (e) {}
  } else {
    localStorage.setItem('snag_tracker_users', JSON.stringify(SYSTEM_USERS));
  }

  const savedActiveUser = localStorage.getItem('snag_tracker_active_user');
  if (savedActiveUser) {
    try {
      STATE.currentUser = JSON.parse(savedActiveUser);
      if (STATE.currentUser && STATE.currentUser.role === 'Admin') {
        STATE.isAdminAuthenticated = true;
      }
    } catch (e) {}
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
  } else {
    document.getElementById('userAuthError').classList.remove('hidden');
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
      STATE.currentUser = SYSTEM_USERS.find(u => u.role === 'Admin') || { name: 'Site Admin Manager', role: 'Admin', category: 'General' };
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
  const filterStatus = document.getElementById('userFilterStatus')?.value || 'all';
  const searchQuery = document.getElementById('userSearchInput')?.value?.toLowerCase() || '';

  // Filter snags by logged in user's assigned category (Unless Admin viewing)
  let filtered = snagsStore.filter(snag => {
    if (curUser.role !== 'Admin' && snag.category !== curUser.category) {
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
        <h4 class="text-sm font-bold text-slate-300">No Snag Observations Found</h4>
        <p class="text-xs text-slate-500">No defect observations logged in category (${curUser.category}). Click "Capture & Report Snag" to add one!</p>
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

  const curUser = STATE.currentUser || { name: 'Inspector', role: 'Engineer', category: 'General' };

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
    assignedUser: `${curUser.name} (${curUser.role} - ${curUser.category})`,
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
  const name = document.getElementById('newUserName').value.trim();
  const mobile = document.getElementById('newUserMobile').value.trim();
  const email = document.getElementById('newUserEmail').value.trim();
  const password = document.getElementById('newUserPassword').value.trim();
  const role = document.getElementById('newUserRole').value;
  const category = document.getElementById('newUserCategory').value;

  if (!/^[0-9]{10}$/.test(mobile)) {
    alert('Please enter a valid 10-digit mobile number!');
    return;
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    name,
    mobile,
    email: email || 'N/A',
    password,
    role,
    category,
    created: new Date().toISOString().split('T')[0]
  };

  SYSTEM_USERS.push(newUser);
  localStorage.setItem('snag_tracker_users', JSON.stringify(SYSTEM_USERS));

  // Reset Form
  document.getElementById('newUserName').value = '';
  document.getElementById('newUserMobile').value = '';
  document.getElementById('newUserEmail').value = '';
  document.getElementById('newUserPassword').value = '';
  renderUsersTable();
  alert(`User "${name}" created!\nMobile: ${mobile}\nPassword: ${password}\nRole: ${role}`);
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
          <div class="flex items-center justify-end gap-2">
            <button onclick="impersonateUser('${usr.id}')" class="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-600/30 text-cyan-300 text-[10px] font-bold border border-cyan-500/30 transition" title="Preview as this User">
              <i class="fa-solid fa-eye mr-1"></i> View User
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

    try {
      doc.addImage(snag.photo, 'JPEG', 14, 72, pageWidth - 28, 110);
    } catch (e) {
      doc.setFontSize(9);
      doc.setTextColor(225, 29, 72);
      doc.text('[Image attached as DataURL - displayed in digital view]', 14, 80);
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
      snagsStore = cloudSnags;
      saveSnagsState();
      renderApp();
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
