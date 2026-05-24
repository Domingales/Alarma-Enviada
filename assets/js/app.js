'use strict';

const LS = {
  deviceId: 'sinc_alarmas_device_id_v2',
  peerId: 'sinc_alarmas_peer_id_v2',
  pairKey: 'sinc_alarmas_pair_key_v2',
  settings: 'sinc_alarmas_settings_v2',
  alarms: 'sinc_alarmas_alarms_v2',
  ackShown: 'sinc_alarmas_ack_shown_v2'
};

let state = {
  deviceId: getOrCreateDeviceId(),
  peerId: localStorage.getItem(LS.peerId) || '',
  pairKey: localStorage.getItem(LS.pairKey) || '',
  settings: loadSettings(),
  alarms: loadAlarms(),
  db: null,
  firebaseReady: false,
  ringingAlarm: null,
  audioCtx: null,
  ringTimer: null,
  qrStream: null
};

const $ = (id) => document.getElementById(id);
const app = $('app');

init();

function init(){
  applySettings();
  updateIdentityUI();
  setDefaultDateTime();
  setupEvents();
  initFirebase();
  renderAlarms();
  setInterval(checkDueAlarms, 1000);
  checkDueAlarms();
}

function setupEvents(){
  $('menuBtn').onclick = openMenu;
  $('closeMenuBtn').onclick = closeMenu;
  $('scrim').onclick = () => { closeMenu(); closePanels(); };
  document.querySelectorAll('[data-panel]').forEach(btn => btn.onclick = () => openPanel(btn.dataset.panel));
  document.querySelectorAll('[data-close]').forEach(btn => btn.onclick = closePanels);
  $('connectBtn').onclick = connectPair;
  $('manualPeerBtn').onclick = addPeerManual;
  $('scanBtn').onclick = scanPeerQr;
  $('sendAlarmBtn').onclick = sendAlarm;
  $('receivedBtn').onclick = confirmReceived;
  $('senderPopupOk').onclick = () => $('senderPopup').classList.add('hidden');
  $('soundSelect').onchange = () => { state.settings.sound = $('soundSelect').value; saveSettings(); };
  $('testSoundBtn').onclick = () => { startTone(); setTimeout(stopTone, 1800); };
  document.querySelectorAll('#themeChips button').forEach(btn => btn.onclick = () => { state.settings.theme = btn.dataset.theme; saveSettings(); applySettings(); });
  document.querySelectorAll('#modeChips button').forEach(btn => btn.onclick = () => { state.settings.mode = btn.dataset.mode; saveSettings(); applySettings(); });
}

function getOrCreateDeviceId(){
  let id = localStorage.getItem(LS.deviceId);
  if(!id){
    id = 'MOVIL-' + Math.random().toString(36).slice(2,6).toUpperCase() + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
    localStorage.setItem(LS.deviceId, id);
  }
  return id;
}

function loadSettings(){
  try { return Object.assign({theme:'blue', mode:'3d', sound:'tone1'}, JSON.parse(localStorage.getItem(LS.settings)||'{}')); }
  catch { return {theme:'blue', mode:'3d', sound:'tone1'}; }
}
function saveSettings(){ localStorage.setItem(LS.settings, JSON.stringify(state.settings)); }
function loadAlarms(){ try { return JSON.parse(localStorage.getItem(LS.alarms)||'[]'); } catch { return []; } }
function saveAlarms(){ localStorage.setItem(LS.alarms, JSON.stringify(state.alarms)); renderAlarms(); }
function loadAckShown(){ try { return JSON.parse(localStorage.getItem(LS.ackShown)||'{}'); } catch { return {}; } }
function saveAckShown(obj){ localStorage.setItem(LS.ackShown, JSON.stringify(obj)); }

async function hashText(text){
  const data = new TextEncoder().encode(text.trim());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,32);
}

function openMenu(){ $('sideMenu').classList.add('open'); $('scrim').classList.add('show'); }
function closeMenu(){ $('sideMenu').classList.remove('open'); if(!document.querySelector('.panel:not(.hidden)')) $('scrim').classList.remove('show'); }
function openPanel(id){ closeMenu(); closePanels(); $(id).classList.remove('hidden'); $('scrim').classList.add('show'); if(id === 'listPanel') renderAlarms(); }
function closePanels(){ document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden')); $('scrim').classList.remove('show'); stopQrScanner(); }

function applySettings(){
  app.className = `theme-${state.settings.theme} mode-${state.settings.mode}`;
  $('soundSelect').value = state.settings.sound;
}

function updateIdentityUI(){
  $('myDeviceIdText').textContent = state.deviceId;
  $('myDeviceIdCode').textContent = state.deviceId;
  $('peerDeviceIdText').textContent = state.peerId || 'No emparejado';
  const qrData = encodeURIComponent(JSON.stringify({type:'SINC_ALARMAS_DEVICE', deviceId: state.deviceId}));
  $('qrImg').src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}`;
  updateStatusLine();
}

function updateStatusLine(){
  $('statusLine').textContent = state.firebaseReady ? 'Sincronización online activa' : 'Modo local · Firebase pendiente';
}

async function connectPair(){
  const pass = $('pairPassword').value.trim();
  if(!pass){ $('pairInfo').textContent = 'Escribe la contraseña compartida.'; return; }
  state.pairKey = await hashText(pass);
  localStorage.setItem(LS.pairKey, state.pairKey);
  $('pairInfo').textContent = 'Conectado a la sala de sincronización. Ahora escanea o introduce el DNI del otro móvil.';
  initFirebase();
}

function setPeerId(id){
  if(!id || !id.startsWith('MOVIL-')) { $('pairInfo').textContent = 'DNI no válido.'; return; }
  if(id === state.deviceId){ $('pairInfo').textContent = 'Ese es el DNI de este mismo móvil.'; return; }
  state.peerId = id;
  localStorage.setItem(LS.peerId, id);
  updateIdentityUI();
  $('pairInfo').textContent = 'Móvil emparejado correctamente: ' + id;
}

function addPeerManual(){
  const id = prompt('Introduce el DNI del otro móvil:');
  if(id) setPeerId(id.trim().toUpperCase());
}

async function scanPeerQr(){
  if(!('BarcodeDetector' in window)){
    $('pairInfo').textContent = 'Este navegador no permite escanear QR aquí. Usa Añadir DNI manual o abre la app en Chrome/HTTPS.';
    return;
  }
  try{
    const detector = new BarcodeDetector({formats:['qr_code']});
    const video = $('qrVideo');
    state.qrStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    video.srcObject = state.qrStream;
    video.classList.remove('hidden');
    await video.play();
    $('pairInfo').textContent = 'Enfoca el QR del otro móvil.';
    const loop = async () => {
      if(!state.qrStream) return;
      const codes = await detector.detect(video).catch(()=>[]);
      if(codes.length){
        try{
          const data = JSON.parse(codes[0].rawValue);
          if(data.type === 'SINC_ALARMAS_DEVICE') setPeerId(data.deviceId);
        }catch{ $('pairInfo').textContent = 'QR no reconocido.'; }
        stopQrScanner();
        return;
      }
      requestAnimationFrame(loop);
    };
    loop();
  }catch(e){ $('pairInfo').textContent = 'No se pudo abrir la cámara. Usa la opción manual.'; }
}

function stopQrScanner(){
  if(state.qrStream){ state.qrStream.getTracks().forEach(t=>t.stop()); state.qrStream = null; }
  $('qrVideo').classList.add('hidden');
}

function setDefaultDateTime(){
  const d = new Date(Date.now() + 5*60*1000);
  d.setSeconds(0,0);
  $('alarmDateTime').value = toLocalInput(d);
}
function toLocalInput(d){
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sendAlarm(){
  if(!state.pairKey){ $('sendInfo').textContent = 'Primero conecta con la contraseña compartida en Emparejar.'; return; }
  if(!state.peerId){ $('sendInfo').textContent = 'Primero empareja el otro móvil por QR o DNI manual.'; return; }
  const dt = $('alarmDateTime').value;
  const note = $('alarmNote').value.trim();
  if(!dt){ $('sendInfo').textContent = 'Selecciona fecha y hora.'; return; }
  if(!note){ $('sendInfo').textContent = 'Escribe una nota o descripción.'; return; }
  const alarm = {
    id: 'AL-' + Date.now() + '-' + Math.random().toString(36).slice(2,7),
    from: state.deviceId,
    to: state.peerId,
    time: new Date(dt).getTime(),
    note,
    createdAt: Date.now(),
    status: 'pending',
    receivedAt: null
  };
  upsertAlarm(alarm);
  pushAlarmOnline(alarm);
  $('sendInfo').textContent = 'Alarma enviada. El otro móvil sonará cuando llegue la hora.';
  $('alarmNote').value = '';
  renderAlarms();
}

function upsertAlarm(alarm){
  const i = state.alarms.findIndex(a => a.id === alarm.id);
  if(i >= 0) state.alarms[i] = Object.assign({}, state.alarms[i], alarm);
  else state.alarms.push(alarm);
  saveAlarms();
}

function renderAlarms(){
  $('pendingCount').textContent = state.alarms.filter(a => a.to === state.deviceId && a.status === 'pending').length;
  const list = $('alarmList');
  if(!state.alarms.length){ list.innerHTML = '<p class="hint">No hay alarmas todavía.</p>'; return; }
  list.innerHTML = state.alarms.slice().sort((a,b)=>b.createdAt-a.createdAt).map(a => {
    const dir = a.from === state.deviceId ? 'Enviada' : 'Recibida';
    const status = a.status === 'received' ? 'Recibida/confirmada' : 'Pendiente';
    return `<div class="alarm-item"><strong>${dir} · ${status}</strong><div>${new Date(a.time).toLocaleString('es-ES')}</div><div>${escapeHtml(a.note)}</div></div>`;
  }).join('');
}
function escapeHtml(s){ return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function checkDueAlarms(){
  if(state.ringingAlarm) return;
  const now = Date.now();
  const due = state.alarms.find(a => a.to === state.deviceId && a.status === 'pending' && a.time <= now);
  if(due) showReceiverAlarm(due);
  checkAckPopups();
}

function showReceiverAlarm(alarm){
  state.ringingAlarm = alarm;
  $('receiverNote').textContent = alarm.note;
  $('receiverOverlay').classList.remove('hidden');
  startTone();
  if(navigator.vibrate) navigator.vibrate([500,200,500,200,900]);
}

function confirmReceived(){
  if(!state.ringingAlarm) return;
  stopTone();
  const alarm = Object.assign({}, state.ringingAlarm, {status:'received', receivedAt:Date.now()});
  state.ringingAlarm = null;
  $('receiverOverlay').classList.add('hidden');
  upsertAlarm(alarm);
  pushAlarmOnline(alarm);
}

function checkAckPopups(){
  const shown = loadAckShown();
  const ack = state.alarms.find(a => a.from === state.deviceId && a.status === 'received' && !shown[a.id]);
  if(ack){
    shown[ack.id] = true;
    saveAckShown(shown);
    $('senderPopupText').textContent = `El otro móvil ha pulsado RECIBIDO.\n\nNota: ${ack.note}`;
    $('senderPopup').classList.remove('hidden');
  }
}

function startTone(){
  stopTone();
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  state.audioCtx = new AudioContext();
  const pattern = getPattern(state.settings.sound);
  let step = 0;
  const playStep = () => {
    if(!state.audioCtx) return;
    const p = pattern[step % pattern.length]; step++;
    if(p.freq > 0){
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      osc.type = p.type || 'sine'; osc.frequency.value = p.freq;
      gain.gain.value = 0.0001;
      osc.connect(gain); gain.connect(state.audioCtx.destination);
      const t = state.audioCtx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.28, t+0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + p.ms/1000);
      osc.start(t); osc.stop(t + p.ms/1000 + 0.03);
    }
    state.ringTimer = setTimeout(playStep, p.ms + (p.gap||80));
  };
  playStep();
}
function stopTone(){
  if(state.ringTimer) clearTimeout(state.ringTimer);
  state.ringTimer = null;
  if(state.audioCtx){ state.audioCtx.close().catch(()=>{}); state.audioCtx = null; }
  if(navigator.vibrate) navigator.vibrate(0);
}
function getPattern(sound){
  const map = {
    tone1:[{freq:880,ms:250,type:'square'},{freq:0,ms:100},{freq:880,ms:250,type:'square'},{freq:0,ms:450}],
    tone2:[{freq:660,ms:180,type:'sine'},{freq:990,ms:180,type:'sine'},{freq:0,ms:250}],
    tone3:[{freq:330,ms:520,type:'sawtooth'},{freq:0,ms:240}],
    tone4:[{freq:1040,ms:110,type:'square'},{freq:0,ms:70},{freq:1040,ms:110,type:'square'},{freq:0,ms:70},{freq:1040,ms:110,type:'square'},{freq:0,ms:250}],
    tone5:[{freq:523,ms:280,type:'sine'},{freq:659,ms:280,type:'sine'},{freq:784,ms:360,type:'sine'},{freq:0,ms:400}]
  };
  return map[sound] || map.tone1;
}

function initFirebase(){
  const cfg = window.SINC_FIREBASE_CONFIG || {};
  const configured = cfg.apiKey && cfg.databaseURL;
  if(!configured || !state.pairKey || typeof firebase === 'undefined'){
    state.firebaseReady = false; updateStatusLine(); return;
  }
  try{
    if(!firebase.apps.length) firebase.initializeApp(cfg);
    state.db = firebase.database().ref('pairs/' + state.pairKey + '/alarms');
    state.firebaseReady = true; updateStatusLine();
    state.db.off();
    state.db.on('child_added', snap => receiveOnlineAlarm(snap.val()));
    state.db.on('child_changed', snap => receiveOnlineAlarm(snap.val()));
  }catch(e){ state.firebaseReady = false; updateStatusLine(); }
}
function pushAlarmOnline(alarm){
  if(state.firebaseReady && state.db) state.db.child(alarm.id).set(alarm).catch(()=>{});
}
function receiveOnlineAlarm(alarm){
  if(!alarm || !alarm.id) return;
  if(alarm.from !== state.deviceId && alarm.to !== state.deviceId) return;
  upsertAlarm(alarm);
  checkDueAlarms();
}
