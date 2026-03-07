/* GLOBAL STATE & CONFIGURATION */
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
};

/* SYSTEM UTILITIES (Connectivity & Tabs) */

// Monitor Online/Offline Status
window.addEventListener('online', updateConnectivityStatus);
window.addEventListener('offline', updateConnectivityStatus);

function updateConnectivityStatus() {
  const statusBar = document.getElementById('status-bar');
  const statusText = document.getElementById('status-text');
  
  if (!statusBar) return; // Guard clause if status bar isn't on this page

  if (navigator.onLine) {
    statusBar.className = 'status-online';
    statusText.innerHTML = '<i class="fas fa-check-circle"></i> System Online - Live Sync Active';
  } else {
    statusBar.className = 'status-offline';
    statusText.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Offline Mode - Using Local Cache';
  }
}

// Admin Tab Switching Logic
function showTab(tabId) {
  // Update UI for active tab
  document.querySelectorAll('.side-nav li').forEach(li => li.classList.remove('active'));
  if(event && event.currentTarget) event.currentTarget.classList.add('active');
  
  // Logic to swap content (Mock implementation for visual structure)
  console.log(`Switched to Admin Tab: ${tabId}`);
  if (tabId === 'requests') loadRequests();
}

/*GEOLOCATION FUNCTIONS */

// Get user location for Emergency
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

// Get Helper location
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
      displayNearbyEmergencies(); // Immediately check for alerts
    },
    err => {
      display.innerHTML = '❌ Location access required to help.';
    }
  );
}

// Distance Calculation (Haversine Formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

/*FEATURE: WHATSAPP SOS */
function sendWhatsAppSOS() {
  if (!latitude || !longitude) {
    alert("⚠️ Please click 'Get My Location' first so we can send your coordinates!");
    return;
  }

  const name = document.getElementById('name') ? document.getElementById('name').value : "User";
  const desc = document.getElementById('description') ? document.getElementById('description').value : "Emergency";

  const message = `🚨 *SOS EMERGENCY* 🚨%0A%0A` +
                  `👤 *Name:* ${name}%0A` +
                  `📝 *Note:* ${desc}%0A%0A` +
                  `📍 *My Live Location:*%0A` +
                  `https://maps.google.com/?q=${latitude},${longitude}`;

  window.open(`https://wa.me/?text=${message}`, '_blank');
}

/* FEATURE: FAMILY SPEED DIAL*/
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

/*FEATURE: OFFLINE MAPS*/
function downloadOfflineMap() {
  const region = document.getElementById('regionSelect').value;
  const status = document.getElementById('mapDownloadStatus');
  
  if (!region) {
    status.innerHTML = '⚠️ Please select a region first.';
    return;
  }
  
  status.innerHTML = '⏳ Downloading map packages (Simulation)...';
  status.style.color = '#f59e0b';

  setTimeout(() => {
    localStorage.setItem(`map_${region}`, JSON.stringify(regionsData[region]));
    status.innerHTML = `✅ ${regionsData[region].name} downloaded securely!`;
    status.style.color = '#10b981';
    
    // Render Leaflet Map
    const container = document.getElementById('offlineMapContainer');
    container.style.display = 'block';
    
    // Cleanup old map instance if exists
    if (map) { map.off(); map.remove(); }
    
    map = L.map('offlineMapContainer').setView([regionsData[region].lat, regionsData[region].lng], regionsData[region].zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.marker([regionsData[region].lat, regionsData[region].lng]).addTo(map)
      .bindPopup(regionsData[region].name + " (Offline Mode)");
      
  }, 1500);
}

/*HELPER & ALERTS LOGIC (UPDATED FOR CLOUD)*/
function displayNearbyEmergencies() {
  const container = document.getElementById('nearbyEmergencies');
  if (!container) return; // Only runs on pages with this container

  if (!helperLatitude || !helperLongitude) {
    container.innerHTML = '<p class="sub-text" style="text-align:center">📍 Set your location above to scan for alerts.</p>';
    return;
  }

  // Pulls live from Firebase instead of local cache
  db.ref('emergencyRequests').once('value', (snapshot) => {
    const data = snapshot.val();
    const requests = data ? Object.values(data) : [];
    
    // Filter for requests within 10km
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
      // Determine icon based on type
      const icons = {fuel:'⛽', medical:'🏥', guidance:'🗺️', breakdown:'🔧', accident:'🚗'};
      const icon = icons[r.helpType] || '🆘';
      
      return `
        <div class="emergency-alert" style="background:#fff3cd; border-left:4px solid orange; padding:15px; margin-bottom:10px; border-radius:8px;">
          <div style="display:flex; justify-content:space-between;">
            <strong>${icon} ${r.helpType.toUpperCase()}</strong>
            <span>${dist} km away</span>
          </div>
          <p><strong>${r.name}</strong>: "${r.description}"</p>
          <div style="margin-top:8px;">
             <a href="tel:${r.phone}" class="btn-location" style="display:inline-block; padding:5px 10px; background:#25D366; text-decoration:none;">📞 Call</a>
             <a href="https://maps.google.com/?q=${r.latitude},${r.longitude}" target="_blank" class="btn-location" style="display:inline-block; padding:5px 10px; text-decoration:none;">📍 Map</a>
          </div>
        </div>
      `;
    }).join('');
  });
}

/*ADMIN DASHBOARD LOGIC (UPDATED TO LIVE LISTENER)*/
function loadRequests() {
  const list = document.getElementById('requestsList');
  if(!list) return;

  // Real-time listener for the Admin Dashboard
  db.ref('emergencyRequests').on('value', (snapshot) => {
    const data = snapshot.val();
    const requests = data ? Object.values(data) : [];

    // Update Stats Counters
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

    list.innerHTML = requests.reverse().map(r => `
      <div class="request-item ${r.helpType}">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
          <span class="type-badge">${r.helpType.toUpperCase()}</span>
          <span style="color:#666; font-size:0.85rem;">${r.timestamp}</span>
        </div>
        <h3 style="margin-bottom:5px;">${r.name}</h3>
        <p style="margin-bottom:5px;"><i class="fas fa-phone"></i> ${r.phone}</p>
        <p class="desc" style="font-style:italic; color:#444;">"${r.description}"</p>
        <div class="request-actions">
          <a href="https://maps.google.com/?q=${r.latitude},${r.longitude}" target="_blank" class="btn-map-link">
            <i class="fas fa-directions"></i> Navigate to Location
          </a>
        </div>
      </div>
    `).join('');
  });
}

function logout() {
  // Simple logout simulation
  window.location.href = 'index.html';
}

function clearAllRequests() {
  if (confirm("⚠️ Are you sure you want to WIPE all emergency records? This cannot be undone.")) {
    db.ref('emergencyRequests').remove(); // Deletes from Firebase Cloud
  }
}

/*INITIALIZATION (DOM Ready)*/
document.addEventListener('DOMContentLoaded', () => {
  updateConnectivityStatus();
  loadFamilyContacts(); // Load contacts on any page they might appear
  
  // A. Emergency Form Handler (index.html) -> PUSHES TO CLOUD
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

      // Push to Firebase instead of localStorage
      db.ref('emergencyRequests').push(request).then(() => {
        const success = document.getElementById('successMessage');
        success.innerHTML = `<strong>Signal Broadcasted to Cloud!</strong><br>Ref ID: ${request.id}`;
        success.classList.add('show');
        e.target.reset();
        setTimeout(() => success.classList.remove('show'), 8000);
      });
    });
  }

  // B. Family Contact Form Handler (index.html)
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

  // C. Volunteer/Helper Form Handler (volunteer.html)
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
      
      const helpers = JSON.parse(localStorage.getItem('localHelpers') || '[]');
      helpers.push(helper);
      localStorage.setItem('localHelpers', JSON.stringify(helpers));
      
      const msg = document.getElementById('helperSuccessMessage');
      msg.innerHTML = '✅ Registered as Volunteer! Scanning area...';
      msg.classList.add('show');
      e.target.reset();
      
      // Start polling for emergencies
      displayNearbyEmergencies();
    });
    
    // Poll for emergencies every 10 seconds if on volunteer page
    setInterval(displayNearbyEmergencies, 10000);
  }

  // D. Admin Login Logic (admin.html)
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const pass = document.getElementById('adminPassword').value;
      const errorMsg = document.getElementById('loginError');

      if (pass === ADMIN_PASSWORD) {
        // Switch View
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'flex';
        loadRequests(); // Initiates the live cloud listener
      } else {
        errorMsg.style.display = 'flex'; // Show error pill
        setTimeout(() => errorMsg.style.display = 'none', 3000);
      }
    });
  }

});
