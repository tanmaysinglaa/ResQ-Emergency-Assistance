/* =========================================
   1. FIREBASE CONFIGURATION (The Cloud Engine)
   ========================================= */
const firebaseConfig = {
  apiKey: "AIzaSyDfBzAQQspKKTvN2qrB3vV42Cl4Mvdtnk",
  authDomain: "resq-e347d.firebaseapp.com",
  databaseURL: "https://resq-e347d-default-rtdb.firebaseio.com",
  projectId: "resq-e347d",
  storageBucket: "resq-e347d.firebasestorage.app",
  messagingSenderId: "16268656348",
  appId: "1:16268656348:web:5a4726890477c9d604be19"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* =========================================
   2. GLOBAL STATE & CONFIGURATION
   ========================================= */
let latitude = null, longitude = null;
let helperLatitude = null, helperLongitude = null;
let map = null;
const ADMIN_PASSWORD = 'admin123';

const regionsData = {
  delhi: { name: 'Delhi NCR', lat: 28.7041, lng: 77.1025, zoom: 12 },
  mumbai: { name: 'Mumbai Metro', lat: 19.0760, lng: 72.8777, zoom: 12 },
  bangalore: { name: 'Bangalore Central', lat: 12.9716, lng: 77.5946, zoom: 12 },
  hyderabad: { name: 'Hyderabad City', lat: 17.3850, lng: 78.4867, zoom: 12 },
  kolkata: { name: 'Kolkata', lat: 22.5726, lng: 88.3639, zoom: 12 },
  chennai: { name: 'Chennai', lat: 13.0827, lng: 80.2707, zoom: 12 },
  noida: { name: 'Noida', lat: 28.5355, lng: 77.3910, zoom: 12 },
  haryana: { name: 'Haryana Region', lat: 29.0588, lng: 76.0856, zoom: 8 }
};

/* =========================================
   3. SYSTEM UTILITIES (Connectivity & Tabs)
   ========================================= */
window.addEventListener('online', updateConnectivityStatus);
window.addEventListener('offline', updateConnectivityStatus);

function updateConnectivityStatus() {
  const statusBar = document.getElementById('status-bar');
  const statusText = document.getElementById('status-text');
  if (!statusBar) return; 

  if (navigator.onLine) {
    statusBar.className = 'status-online';
    statusText.innerHTML = '<i class="fas fa-check-circle"></i> System Online - Live Sync Active';
  } else {
    statusBar.className = 'status-offline';
    statusText.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Offline Mode - Using Local Cache';
  }
}

function showTab(tabId) {
  document.querySelectorAll('.side-nav li').forEach(li => li.classList.remove('active'));
  if(event && event.currentTarget) event.currentTarget.classList.add('active');
  if (tabId === 'requests') loadRequests();
}

/* =========================================
   4. GEOLOCATION FUNCTIONS
   ========================================= */
function getLocation() {
  const display = document.getElementById('locationDisplay');
  if(!display) return;

  display.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating satellites...';
  display.style.display = 'block';
  
  navigator.geolocation.getCurrentPosition(
    pos => {
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
      display.innerHTML = `
        <i class="fas fa-map-marker-alt"></i> Precision: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}<br>
        <span style="font-size:0.8em; color:green;">Ready to Send</span>
      `;
      display.classList.add('loc-badge-active');
    },
    err => {
      display.innerHTML = '<i class="fas fa-times-circle"></i> GPS Access Denied';
      display.style.background = '#fee2e2';
      display.style.color = '#ef4444';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function getHelperLocation() {
  const display = document.getElementById('helperLocationDisplay');
  if(!display) return;

  display.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Establishing zone...';
  
  navigator.geolocation.getCurrentPosition(
    pos => {
      helperLatitude = pos.coords.latitude;
      helperLongitude = pos.coords.longitude;
      display.innerHTML = `✅ Zone Set: ${helperLatitude.toFixed(5)}, ${helperLongitude.toFixed(5)}`;
      display.style.display = 'block';
      displayNearbyEmergencies(); 
    },
    err => {
      display.innerHTML = '❌ Location access required to help.';
    }
  );
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

/* =========================================
   5. FEATURES (WhatsApp, Contacts, Maps)
   ========================================= */
function sendWhatsAppSOS() {
  if (!latitude || !longitude) return alert("⚠️ Please click 'Get My Location' first!");

  const name = document.getElementById('name') ? document.getElementById('name').value : "User";
  const desc = document.getElementById('description') ? document.getElementById('description').value : "Emergency";
  
  // FIXED MAP URL
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const message = `🚨 *SOS EMERGENCY* 🚨%0A%0A👤 *Name:* ${name}%0A📝 *Note:* ${desc}%0A%0A📍 *My Live Location:*%0A${mapUrl}`;

  window.open(`https://wa.me/?text=${message}`, '_blank');
}

function loadFamilyContacts() {
  const list = document.getElementById('familyList');
  if(!list) return;

  const contacts = JSON.parse(localStorage.getItem('resq_family_contacts') || '[]');
  
  if (contacts.length === 0) {
    list.innerHTML = '<p style="color:#64748b; font-size: 0.9rem; grid-column: 1/-1; text-align: center;">No family contacts added yet.</p>';
    return;
  }

  list.innerHTML = contacts.map(c => `
    <div class="contact-card family-card">
      <a href="tel:${c.phone}" style="text-decoration: none; color: inherit; display: block;">
        <strong>${c.name}</strong><br>
        <small>${c.phone}</small>
      </a>
      <button onclick="deleteFamilyContact(${c.id})" class="btn-delete-contact">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

function addFamilyContact(name, phone) {
  const newContact = { id: Date.now(), name, phone };
  const contacts = JSON.parse(localStorage.getItem('resq_family_contacts') || '[]');
  contacts.push(newContact);
  localStorage.setItem('resq_family_contacts', JSON.stringify(contacts));
  loadFamilyContacts();
}

function deleteFamilyContact(id) {
  if(!confirm("Remove this contact?")) return;
  const contacts = JSON.parse(localStorage.getItem('resq_family_contacts') || '[]');
  const updatedContacts = contacts.filter(c => c.id !== id);
  localStorage.setItem('resq_family_contacts', JSON.stringify(updatedContacts));
  loadFamilyContacts();
}

function downloadOfflineMap() {
  const region = document.getElementById('regionSelect').value;
  const status = document.getElementById('mapDownloadStatus');
  
  if (!region) return status.innerHTML = '⚠️ Please select a region first.';
  
  status.innerHTML = '⏳ Downloading map packages (Simulation)...';
  status.style.color = '#f59e0b';

  setTimeout(() => {
    localStorage.setItem(`map_${region}`, JSON.stringify(regionsData[region]));
    status.innerHTML = `✅ ${regionsData[region].name} downloaded securely!`;
    status.style.color = '#10b981';
    
    const container = document.getElementById('offlineMapContainer');
    container.style.display = 'block';
    
    if (map) { map.off(); map.remove(); }
    
    map = L.map('offlineMapContainer').setView([regionsData[region].lat, regionsData[region].lng], regionsData[region].zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.marker([regionsData[region].lat, regionsData[region].lng]).addTo(map)
      .bindPopup(regionsData[region].name + " (Offline Mode)");
      
  }, 1500);
}

/* =========================================
   6. CLOUD SYNC: HELPER & ALERTS LOGIC 
   ========================================= */
function displayNearbyEmergencies() {
  const container = document.getElementById('nearbyEmergencies');
  if (!container) return; 

  if (!helperLatitude || !helperLongitude) {
    container.innerHTML = '<p class="sub-text" style="text-align:center">📍 Set your location above to scan for alerts.</p>';
    return;
  }

  db.ref('emergencyRequests').once('value', (snapshot) => {
    const data = snapshot.val();
    const requests = data ? Object.values(data) : [];
    
    const nearby = requests.filter(r => 
      calculateDistance(helperLatitude, helperLongitude, r.latitude, r.longitude) <= 10
    ).sort((a,b) => 
      calculateDistance(helperLatitude, helperLongitude, a.latitude, a.longitude) -
      calculateDistance(helperLatitude, helperLongitude, b.latitude, b.longitude)
    );

    if (nearby.length === 0) {
      container.innerHTML = '<p class="sub-text" style="text-align:center">✅ No active emergencies in your vicinity.</p>';
      return;
    }

    container.innerHTML = nearby.map(r => {
      const dist = calculateDistance(helperLatitude, helperLongitude, r.latitude, r.longitude).toFixed(1);
      const icons = {fuel:'⛽', medical:'🏥', guidance:'🗺️', breakdown:'🔧', accident:'🚗'};
      const icon = icons[r.helpType] || '🆘';
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`;
      
      return `
        <div class="emergency-alert" style="background:#fff3cd; border-left:4px solid orange; padding:15px; margin-bottom:10px; border-radius:8px;">
          <div style="display:flex; justify-content:space-between;">
            <strong>${icon} ${r.helpType.toUpperCase()}</strong>
            <span>${dist} km away</span>
          </div>
          <p><strong>${r.name}</strong>: "${r.description}"</p>
          <div style="margin-top:8px;">
             <a href="tel:${r.phone}" class="btn-location" style="display:inline-block; padding:5px 10px; background:#25D366; text-decoration:none;">📞 Call</a>
             <a href="${mapUrl}" target="_blank" class="btn-location" style="display:inline-block; padding:5px 10px; text-decoration:none;">📍 Map</a>
          </div>
        </div>
      `;
    }).join('');
  });
}

/* =========================================
   7. CLOUD SYNC: ADMIN DASHBOARD LOGIC
   ========================================= */
function loadRequests() {
  const list = document.getElementById('requestsList');
  if(!list) return;

  db.ref('emergencyRequests').on('value', (snapshot) => {
    const data = snapshot.val();
    const requests = data ? Object.values(data) : [];

    if(document.getElementById('totalRequests')) {
        document.getElementById('totalRequests').innerText = requests.length;
        document.getElementById('fuelRequests').innerText = requests.filter(r => r.helpType === 'fuel').length;
        document.getElementById('medicalRequests').innerText = requests.filter(r => r.helpType === 'medical').length;
        document.getElementById('guidanceRequests').innerText = requests.filter(r => r.helpType === 'guidance').length;
    }

    if (requests.length === 0) {
      list.innerHTML = '<p class="empty-state" style="text-align:center; padding:20px; color:#999;">No active emergency signals.</p>';
      return;
    }

    list.innerHTML = requests.reverse().map(r => {
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`;
      return `
      <div class="request-item ${r.helpType}" style="background:white; padding:15px; border-radius:8px; border-left:4px solid var(--danger); box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
          <span class="type-badge" style="font-weight:bold;">${r.helpType.toUpperCase()}</span>
          <span style="color:#666; font-size:0.85rem;">${r.timestamp}</span>
        </div>
        <h3 style="margin-bottom:5px;">${r.name}</h3>
        <p style="margin-bottom:5px;"><i class="fas fa-phone"></i> ${r.phone}</p>
        <p class="desc" style="font-style:italic; color:#444;">"${r.description}"</p>
        <div class="request-actions" style="margin-top:10px;">
          <a href="${mapUrl}" target="_blank" style="color:white; background:var(--primary); padding:8px 12px; border-radius:6px; text-decoration:none; display:inline-block;">
            <i class="fas fa-directions"></i> Navigate to Location
          </a>
        </div>
      </div>
    `}).join('');
  });
}

function logout() {
  window.location.href = 'index.html';
}

function clearAllRequests() {
  if (confirm("⚠️ Are you sure you want to WIPE all emergency records? This cannot be undone.")) {
    db.ref('emergencyRequests').remove(); 
  }
}

/* =========================================
   8. INITIALIZATION (DOM Ready Handlers)
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  updateConnectivityStatus();
  loadFamilyContacts(); 
  
  // A. Emergency Form Handler -> PUSHES TO CLOUD
  const emergencyForm = document.getElementById('emergencyForm');
  if (emergencyForm) {
    emergencyForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!latitude) return alert("⚠️ Critical: Location required to send help.");

      const request = {
        id: Date.now(),
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        helpType: document.getElementById('helpType').value,
        description: document.getElementById('description').value,
        latitude, longitude,
        timestamp: new Date().toLocaleString()
      };

      db.ref('emergencyRequests').push(request).then(() => {
        const success = document.getElementById('successMessage');
        success.innerHTML = `<strong>Signal Broadcasted to Cloud!</strong><br>Ref ID: ${request.id}`;
        success.classList.add('show');
        e.target.reset();
        setTimeout(() => success.classList.remove('show'), 8000);
      });
    });
  }

  // B. Family Contact Form Handler
  const addFamilyForm = document.getElementById('addFamilyForm');
  if(addFamilyForm) {
    addFamilyForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const name = document.getElementById('famName').value;
      const phone = document.getElementById('famPhone').value;
      if(name && phone) {
        addFamilyContact(name, phone);
        e.target.reset();
      }
    });
  }

  // C. Volunteer Form Handler -> PUSHES TO CLOUD
  const helperForm = document.getElementById('helperForm');
  if (helperForm) {
    helperForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!helperLatitude || !helperLongitude) return alert('⚠️ Please set your availability zone (location) first!');
      
      const helper = {
        id: Date.now(),
        name: document.getElementById('helperName').value,
        phone: document.getElementById('helperPhone').value,
        skills: Array.from(document.getElementById('helperSkills').selectedOptions).map(o => o.value),
        latitude: helperLatitude, longitude: helperLongitude,
        registeredAt: new Date().toLocaleString()
      };
      
      db.ref('activeHelpers').push(helper).then(() => {
        const msg = document.getElementById('helperSuccessMessage');
        msg.innerHTML = '✅ Registered as Volunteer! Scanning area...';
        msg.classList.add('show');
        e.target.reset();
        displayNearbyEmergencies();
      });
    });
    
    setInterval(displayNearbyEmergencies, 10000);
  }

  // D. Admin Login Logic
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const pass = document.getElementById('adminPassword').value;
      const errorMsg = document.getElementById('loginError');

      if (pass === ADMIN_PASSWORD) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'flex';
        loadRequests(); 
      } else {
        errorMsg.style.display = 'flex'; 
        setTimeout(() => errorMsg.style.display = 'none', 3000);
      }
    });
  }
});
