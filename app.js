// ========== KONFIGURASI FIREBASE ==========
const firebaseConfig = {
    apiKey: "AIzaSyDhUmUOZv35ulOxmpUwRtfaHM31TR4FYd0",
    authDomain: "esp-32iot.firebaseapp.com",
    databaseURL: "https://esp-32iot-default-rtdb.firebaseio.com",
    projectId: "esp-32iot",
    storageBucket: "esp-32iot.firebasestorage.app",
    messagingSenderId: "500770412002",
    appId: "1:500770412002:web:c2917be4b5c3fda3ae15bb"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let isAutoMode = true;
let isUpdatingFromFirebase = false;

// Status icons mapping
const statusIcons = {
    'HEATING': '🔥',
    'COOLING': '❄️',
    'STANDBY': '✅',
    'MANUAL': '👆'
};

// ========== FUNGSI UTAMA ==========

// Set Mode (Auto/Manual)
function setMode(auto) {
    isAutoMode = auto;
    database.ref('mode/auto').set(auto);
    
    // Update UI
    document.getElementById('autoBtn').classList.toggle('active', auto);
    document.getElementById('manualBtn').classList.toggle('active', !auto);
    
    // Disable/Enable manual controls
    const switches = ['heaterSwitch', 'fanSwitch', 'lightSwitch'];
    switches.forEach(id => {
        document.getElementById(id).disabled = auto;
    });
}

// Toggle Relay (Manual Mode)
function toggleRelay(relay, state) {
    if (!isAutoMode) {
        database.ref(`relay/${relay}`).set(state);
    }
}

// Update System Status UI
function updateSystemStatus(status) {
    const container = document.getElementById('statusContainer');
    const icon = document.getElementById('statusIcon');
    const value = document.getElementById('statusValue');
    
    // Remove all status classes
    container.className = 'status-container';
    
    // Add new status class
    const statusClass = 'status-' + status.toLowerCase();
    container.classList.add(statusClass);
    
    // Update icon and text
    icon.textContent = statusIcons[status] || '⏸️';
    value.textContent = status;
}

// Update UI dari Firebase Data
function updateUI(data) {
    isUpdatingFromFirebase = true;

    // Sensor Data
    if (data.sensor) {
        document.getElementById('temperature').textContent = 
            data.sensor.temperature ? data.sensor.temperature.toFixed(1) : '--';
        document.getElementById('humidity').textContent = 
            data.sensor.humidity ? data.sensor.humidity.toFixed(0) : '--';
        document.getElementById('ldr').textContent = 
            data.sensor.ldr || '--';
    }

    // System Status
    if (data.status && data.status.state) {
        updateSystemStatus(data.status.state);
    }

    // Relay States
    if (data.relay) {
        updateRelayUI('heater', data.relay.heater);
        updateRelayUI('fan', data.relay.fan);
        updateRelayUI('light', data.relay.light);
    }

    // Mode
    if (data.mode && data.mode.auto !== undefined) {
        const auto = data.mode.auto;
        isAutoMode = auto;
        document.getElementById('autoBtn').classList.toggle('active', auto);
        document.getElementById('manualBtn').classList.toggle('active', !auto);
        
        // Disable switches in auto mode
        const switches = ['heaterSwitch', 'fanSwitch', 'lightSwitch'];
        switches.forEach(id => {
            document.getElementById(id).disabled = auto;
        });
    }

    // Last Update
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    document.getElementById('lastUpdate').textContent = 
        `Terakhir diperbarui: ${timeString}`;

    isUpdatingFromFirebase = false;
}

// Update Relay UI
function updateRelayUI(relay, state) {
    const statusEl = document.getElementById(`${relay}Status`);
    const switchEl = document.getElementById(`${relay}Switch`);
    
    statusEl.textContent = state ? 'ON' : 'OFF';
    statusEl.style.color = state ? '#059669' : '#6b7280';
    statusEl.style.fontWeight = state ? '600' : '400';
    
    if (!isUpdatingFromFirebase) {
        switchEl.checked = state;
    }
}

// ========== FIREBASE LISTENERS ==========

// Listen to all data changes
database.ref('/').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        updateUI(data);
        updateConnectionStatus(true);
    }
}, (error) => {
    console.error('Firebase error:', error);
    updateConnectionStatus(false);
});

// Connection Status
function updateConnectionStatus(connected) {
    const dot = document.getElementById('connectionDot');
    const text = document.getElementById('connectionText');
    
    dot.className = 'connection-dot ' + (connected ? 'connected' : 'disconnected');
    text.textContent = connected ? 'Terhubung ke Firebase' : 'Koneksi Terputus';
}

// Check connection status
const connectedRef = database.ref('.info/connected');
connectedRef.on('value', (snap) => {
    updateConnectionStatus(snap.val() === true);
});

// ========== PWA SERVICE WORKER ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => {
                console.log('✅ Service Worker registered successfully');
                console.log('📦 Scope:', reg.scope);
            })
            .catch(err => {
                console.error('❌ Service Worker registration failed:', err);
            });
    });
}

// ========== INITIALIZE ==========
console.log('🚀 Smart Chicken Coop PWA Started');
console.log('📡 Connecting to Firebase...');

// Notifikasi jika app sudah installable
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('💾 App dapat diinstall ke home screen');
});