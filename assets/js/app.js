'use strict';

const APP_VERSION = 'GPS-POP-v2-20260708';

const LS = {
  deviceId: 'sinc_alarmas_device_id_v3',
  peerId: 'sinc_alarmas_peer_id_v3',
  pairKey: 'sinc_alarmas_pair_key_v3',
  settings: 'sinc_alarmas_settings_v3',
  alarms: 'sinc_alarmas_alarms_v3',
  ackShown: 'sinc_alarmas_ack_shown_v3',
  deletedIds: 'sinc_alarmas_deleted_ids_v4',
  gpsLogs: 'sinc_alarmas_gps_logs_v1'
};

const state = {
  deviceId: getOrCreateDeviceId(),
  peerId: localStorage.getItem(LS.peerId) || '',
  pairKey: localStorage.getItem(LS.pairKey) || '',
  settings: loadSettings(),
  alarms: loadAlarms(),
  deletedIds: loadDeletedIds(),
  gpsLogs: loadGpsLogs(),
  db: null,
  firebaseReady: false,
  ringingAlarm: null,
  audioCtx: null,
  ringTimer: null,
  qrStream: null,
  listFilter: 'pending',
  firebaseListenersActive: false,
  firebaseRefPath: '',
  ackRetryTimer: null,
  gpsUploadTimers: {},
  gpsUploadBusy: {},
  gpsListeners: {},
  currentGpsPopupAlarmId: '',
  programmedAckUploaded: {}
};

const $ = (id) => document.getElementById(id);
let app = null;

document.addEventListener('DOMContentLoaded', init);

function init(){
  app = $('app');
  migrateOldData();
  applySettings();
  updateIdentityUI();
  setDefaultDateTime();
  setupEvents();
  initFirebase();
  renderAlarms();
  setInterval(checkDueAlarms, 1000);
  setInterval(flushPendingProgrammedConfirmations, 3000);
  setInterval(ensureInitialGpsPopupsForPendingIncoming, 2000);
  checkDueAlarms();
  flushPendingProgrammedConfirmations();
  ensureInitialGpsPopupsForPendingIncoming();
}

function setupEvents(){
  safeOn('menuBtn', 'click', openMenu);
  safeOn('closeMenuBtn', 'click', closeMenu);
  safeOn('scrim', 'click', () => { closeMenu(); closePanels(); });
  safeOn('openListBtn', 'click', () => openPanel('listPanel'));

  document.querySelectorAll('[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => openPanel(btn.dataset.panel));
  });
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', closePanels);
  });

  safeOn('connectBtn', 'click', connectPair);
  safeOn('manualPeerBtn', 'click', addPeerManual);
  safeOn('scanBtn', 'click', scanPeerQr);
  safeOn('copyMyIdBtn', 'click', copyMyDeviceId);
  safeOn('sendAlarmBtn', 'click', sendAlarm);
  safeOn('receivedBtn', 'click', confirmReceived);
  safeOn('senderPopupOk', 'click', () => $('senderPopup').classList.add('hidden'));
  safeOn('gpsPopupClose', 'click', closeGpsPopup);
  safeOn('showPendingBtn', 'click', () => { state.listFilter = 'pending'; renderAlarms(); });
  safeOn('showAllBtn', 'click', () => { state.listFilter = 'all'; renderAlarms(); });
  safeOn('soundSelect', 'change', () => {
    state.settings.sound = $('soundSelect').value;
    saveSettings();
  });
  safeOn('testSoundBtn', 'click', () => {
    startTone();
    setTimeout(stopTone, 1800);
  });
  safeOn('windowOpacity', 'input', () => {
    const val = Number($('windowOpacity').value || 90);
    state.settings.windowOpacity = Math.max(45, Math.min(100, val));
    saveSettings();
    applySettings();
  });

  document.addEventListener('click', handleAlarmActionClick);

  document.querySelectorAll('#themeChips button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.settings.theme = btn.dataset.theme;
      saveSettings();
      applySettings();
    });
  });
  document.querySelectorAll('#modeChips button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.settings.mode = btn.dataset.mode;
      saveSettings();
      applySettings();
    });
  });
}

function safeOn(id, eventName, handler){
  const el = $(id);
  if(el) el.addEventListener(eventName, handler);
}

function migrateOldData(){
  // Conserva datos de versiones anteriores si el usuario ya había probado la app.
  migrateKey('sinc_alarmas_device_id_v2', LS.deviceId, false);
  migrateKey('sinc_alarmas_peer_id_v2', LS.peerId, true);
  migrateKey('sinc_alarmas_pair_key_v2', LS.pairKey, true);
  migrateKey('sinc_alarmas_settings_v2', LS.settings, true);
  migrateKey('sinc_alarmas_alarms_v2', LS.alarms, true);
  migrateKey('sinc_alarmas_ack_shown_v2', LS.ackShown, true);

  state.peerId = localStorage.getItem(LS.peerId) || state.peerId;
  state.pairKey = localStorage.getItem(LS.pairKey) || state.pairKey;
  state.settings = loadSettings();
  state.alarms = loadAlarms();
}

function migrateKey(oldKey, newKey, onlyIfNewMissing){
  const oldValue = localStorage.getItem(oldKey);
  const newValue = localStorage.getItem(newKey);
  if(oldValue && (!onlyIfNewMissing || !newValue)) localStorage.setItem(newKey, oldValue);
}

function getOrCreateDeviceId(){
  let id = localStorage.getItem(LS.deviceId) || localStorage.getItem('sinc_alarmas_device_id_v2');
  if(!id){
    id = 'MOVIL-' + Math.random().toString(36).slice(2,6).toUpperCase() + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
  }
  localStorage.setItem(LS.deviceId, id);
  return id;
}

function loadSettings(){
  try {
    return Object.assign({theme:'blue', mode:'3d', sound:'tone1', windowOpacity:90}, JSON.parse(localStorage.getItem(LS.settings) || '{}'));
  } catch {
    return {theme:'blue', mode:'3d', sound:'tone1', windowOpacity:90};
  }
}
function saveSettings(){ localStorage.setItem(LS.settings, JSON.stringify(state.settings)); }
function loadAlarms(){
  try {
    const parsed = JSON.parse(localStorage.getItem(LS.alarms) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveAlarms(){
  localStorage.setItem(LS.alarms, JSON.stringify(state.alarms));
  renderAlarms();
}
function loadAckShown(){
  try { return JSON.parse(localStorage.getItem(LS.ackShown) || '{}') || {}; }
  catch { return {}; }
}
function saveAckShown(obj){ localStorage.setItem(LS.ackShown, JSON.stringify(obj)); }

function loadDeletedIds(){
  try { return JSON.parse(localStorage.getItem(LS.deletedIds) || '{}') || {}; }
  catch { return {}; }
}
function saveDeletedIds(){ localStorage.setItem(LS.deletedIds, JSON.stringify(state.deletedIds || {})); }
function loadGpsLogs(){
  try {
    const parsed = JSON.parse(localStorage.getItem(LS.gpsLogs) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}
function saveGpsLogs(){ localStorage.setItem(LS.gpsLogs, JSON.stringify(state.gpsLogs || {})); }

function isLocallyDeleted(id){ return Boolean(state.deletedIds && state.deletedIds[id]); }
function deleteLocalRecord(id){
  const alarm = state.alarms.find(a => a.id === id);
  if(!alarm) return;
  if(alarm.status === 'pending'){
    alert('No se elimina una alarma pendiente. Si la enviaste tú, usa ANULAR ALARMA. Si la recibiste, espera a que sea recibida o anulada.');
    return;
  }
  if(!confirm('¿Eliminar este registro solo de este móvil? No se borrará del móvil de la otra persona.')) return;
  state.deletedIds[id] = Date.now();
  saveDeletedIds();
  renderAlarms();
}


async function hashText(text){
  const clean = text.trim();
  if(window.crypto && crypto.subtle && window.TextEncoder){
    const data = new TextEncoder().encode(clean);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,'0')).join('').slice(0,32);
  }
  // Fallback SHA-256 real. Importante: debe producir el mismo canal que crypto.subtle.
  // Si un móvil abre la app en modo local/file:// y otro desde HTTPS, ambos usarán
  // exactamente la misma ruta de Firebase para la misma contraseña compartida.
  return sha256Fallback(clean).slice(0,32);
}

function sha256Fallback(message){
  const bytes = utf8Bytes(message);
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while((bytes.length % 64) !== 56) bytes.push(0);
  const high = Math.floor(bitLen / 0x100000000);
  const low = bitLen >>> 0;
  bytes.push((high>>>24)&255,(high>>>16)&255,(high>>>8)&255,high&255,(low>>>24)&255,(low>>>16)&255,(low>>>8)&255,low&255);

  const rotr = (x,n) => (x >>> n) | (x << (32-n));
  const W = new Array(64);
  for(let i=0; i<bytes.length; i+=64){
    for(let t=0; t<16; t++){
      const j = i + t*4;
      W[t] = ((bytes[j]<<24) | (bytes[j+1]<<16) | (bytes[j+2]<<8) | bytes[j+3]) >>> 0;
    }
    for(let t=16; t<64; t++){
      const s0 = (rotr(W[t-15],7) ^ rotr(W[t-15],18) ^ (W[t-15]>>>3)) >>> 0;
      const s1 = (rotr(W[t-2],17) ^ rotr(W[t-2],19) ^ (W[t-2]>>>10)) >>> 0;
      W[t] = (W[t-16] + s0 + W[t-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for(let t=0; t<64; t++){
      const S1 = (rotr(e,6) ^ rotr(e,11) ^ rotr(e,25)) >>> 0;
      const ch = ((e & f) ^ ((~e) & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = (rotr(a,2) ^ rotr(a,13) ^ rotr(a,22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    H = [(H[0]+a)>>>0,(H[1]+b)>>>0,(H[2]+c)>>>0,(H[3]+d)>>>0,(H[4]+e)>>>0,(H[5]+f)>>>0,(H[6]+g)>>>0,(H[7]+h)>>>0];
  }
  return H.map(x => x.toString(16).padStart(8,'0')).join('');
}

function utf8Bytes(str){
  if(window.TextEncoder) return Array.from(new TextEncoder().encode(str));
  const encoded = unescape(encodeURIComponent(str));
  const out = [];
  for(let i=0; i<encoded.length; i++) out.push(encoded.charCodeAt(i));
  return out;
}

function openMenu(){
  $('sideMenu').classList.add('open');
  $('sideMenu').setAttribute('aria-hidden', 'false');
  $('scrim').classList.add('show');
}
function closeMenu(){
  $('sideMenu').classList.remove('open');
  $('sideMenu').setAttribute('aria-hidden', 'true');
  if(!document.querySelector('.panel:not(.hidden)')) $('scrim').classList.remove('show');
}
function openPanel(id){
  closeMenu();
  closePanels(false);
  const panel = $(id);
  if(panel) panel.classList.remove('hidden');
  $('scrim').classList.add('show');
  if(id === 'listPanel') renderAlarms();
}
function closePanels(hideScrim = true){
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  if(hideScrim) $('scrim').classList.remove('show');
  stopQrScanner();
}

function applySettings(){
  if(!app) app = $('app');
  app.className = `theme-${state.settings.theme} mode-${state.settings.mode}`;
  const opacity = Math.max(45, Math.min(100, Number(state.settings.windowOpacity || 90)));
  app.style.setProperty('--window-opacity', String(opacity / 100));
  const opacityInput = $('windowOpacity');
  const opacityText = $('windowOpacityText');
  if(opacityInput) opacityInput.value = String(opacity);
  if(opacityText) opacityText.textContent = opacity + '%';
  const select = $('soundSelect');
  if(select) select.value = state.settings.sound;
  markActiveChips();
}
function markActiveChips(){
  document.querySelectorAll('#themeChips button').forEach(b => b.classList.toggle('active', b.dataset.theme === state.settings.theme));
  document.querySelectorAll('#modeChips button').forEach(b => b.classList.toggle('active', b.dataset.mode === state.settings.mode));
}

function updateIdentityUI(){
  setText('myDeviceIdText', state.deviceId);
  setText('myDeviceIdCode', state.deviceId);
  setText('peerDeviceIdText', state.peerId || 'No emparejado');
  const qrData = encodeURIComponent(JSON.stringify({type:'SINC_ALARMAS_DEVICE', deviceId: state.deviceId}));
  const img = $('qrImg');
  if(img) img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}`;
  updateStatusLine();
}
function setText(id, value){ const el = $(id); if(el) el.textContent = value; }

function updateStatusLine(){
  const channel = state.pairKey ? ' · canal ' + String(state.pairKey).slice(0,8) : '';
  const msg = state.firebaseReady
    ? 'Sincronización online activa' + channel + ' · ' + APP_VERSION
    : 'Modo local · sin Firebase activo' + channel + ' · ' + APP_VERSION;
  setText('statusLine', msg);
}

async function connectPair(){
  const pass = $('pairPassword').value.trim();
  if(!pass){ setText('pairInfo', 'Escribe la contraseña compartida.'); return; }
  state.pairKey = await hashText(pass);
  localStorage.setItem(LS.pairKey, state.pairKey);
  setText('pairInfo', 'Contraseña guardada. Ahora escanea o introduce el DNI del otro móvil.');
  initFirebase();
}

function setPeerId(id){
  const normalized = String(id || '').trim().toUpperCase();
  if(!normalized || !normalized.startsWith('MOVIL-')) { setText('pairInfo', 'DNI no válido. Debe empezar por MOVIL-.'); return; }
  if(normalized === state.deviceId){ setText('pairInfo', 'Ese es el DNI de este mismo móvil. Debes poner el DNI del otro.'); return; }
  state.peerId = normalized;
  localStorage.setItem(LS.peerId, normalized);
  updateIdentityUI();
  renderAlarms();
  setText('pairInfo', 'Móvil emparejado correctamente: ' + normalized);
}

function addPeerManual(){
  const id = prompt('Introduce el DNI del otro móvil:');
  if(id) setPeerId(id);
}

async function copyMyDeviceId(){
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(state.deviceId);
      setText('pairInfo', 'DNI copiado al portapapeles.');
    } else {
      prompt('Copia este DNI:', state.deviceId);
    }
  }catch{
    prompt('Copia este DNI:', state.deviceId);
  }
}

async function scanPeerQr(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    setText('pairInfo', 'La cámara no está disponible en este modo. Usa Añadir DNI manual.');
    return;
  }
  if(!('BarcodeDetector' in window)){
    setText('pairInfo', 'Este navegador no permite escanear QR aquí. Usa Añadir DNI manual o abre la app en Chrome/HTTPS.');
    return;
  }
  try{
    const detector = new BarcodeDetector({formats:['qr_code']});
    const video = $('qrVideo');
    state.qrStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}, audio:false});
    video.srcObject = state.qrStream;
    video.classList.remove('hidden');
    await video.play();
    setText('pairInfo', 'Enfoca el QR del otro móvil.');
    const loop = async () => {
      if(!state.qrStream) return;
      const codes = await detector.detect(video).catch(() => []);
      if(codes.length){
        try{
          const data = JSON.parse(codes[0].rawValue);
          if(data.type === 'SINC_ALARMAS_DEVICE' && data.deviceId) setPeerId(data.deviceId);
          else setText('pairInfo', 'QR no reconocido.');
        }catch{
          setText('pairInfo', 'QR no reconocido.');
        }
        stopQrScanner();
        return;
      }
      requestAnimationFrame(loop);
    };
    loop();
  }catch{
    setText('pairInfo', 'No se pudo abrir la cámara. Usa Añadir DNI manual.');
    stopQrScanner();
  }
}

function stopQrScanner(){
  if(state.qrStream){
    state.qrStream.getTracks().forEach(t => t.stop());
    state.qrStream = null;
  }
  const video = $('qrVideo');
  if(video){
    video.pause();
    video.srcObject = null;
    video.classList.add('hidden');
  }
}

function setDefaultDateTime(){
  const d = new Date(Date.now() + 5*60*1000);
  d.setSeconds(0,0);
  const input = $('alarmDateTime');
  if(input) input.value = toLocalInput(d);
}
function toLocalInput(d){
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sendAlarm(){
  if(!state.pairKey){ setText('sendInfo', 'Primero conecta con la contraseña compartida en Emparejar.'); return; }
  if(!state.peerId){ setText('sendInfo', 'Primero empareja el otro móvil por QR o DNI manual.'); return; }
  const dt = $('alarmDateTime').value;
  const note = $('alarmNote').value.trim();
  if(!dt){ setText('sendInfo', 'Selecciona fecha y hora.'); return; }
  if(!note){ setText('sendInfo', 'Escribe una nota o descripción.'); return; }
  const timestamp = new Date(dt).getTime();
  if(Number.isNaN(timestamp)){ setText('sendInfo', 'La fecha/hora no es válida.'); return; }
  if(timestamp < Date.now() - 30000){ setText('sendInfo', 'La alarma debe tener una hora futura.'); return; }

  const alarm = {
    id: 'AL-' + Date.now() + '-' + Math.random().toString(36).slice(2,7),
    from: state.deviceId,
    to: state.peerId,
    time: timestamp,
    note,
    createdAt: Date.now(),
    status: 'pending',
    receiverProgrammedAt: null,
    receiverProgrammedBy: '',
    receivedAt: null,
    cancelledAt: null,
    cancelledBy: '',
    cancelMessage: '',
    updatedAt: Date.now()
  };
  upsertAlarm(alarm);
  pushAlarmOnline(alarm);
  startGpsUploadForAlarm(alarm);
  setText('sendInfo', state.firebaseReady ? 'Alarma enviada online. Se intentará enviar también la ubicación GPS de este móvil cada minuto hasta que la alarma finalice.' : 'Alarma guardada en este móvil. Para que llegue al otro por internet debes configurar Firebase.');
  $('alarmNote').value = '';
  setDefaultDateTime();
  renderAlarms();
}

function upsertAlarm(alarm){
  if(!alarm || !alarm.id) return;
  const cleaned = normalizeAlarm(alarm);
  const i = state.alarms.findIndex(a => a.id === cleaned.id);
  if(i >= 0){
    const existing = normalizeAlarm(state.alarms[i]);
    // Los estados finales remotos SIEMPRE ganan sobre pendiente.
    // Esto corrige el fallo principal: si el emisor anula, el receptor debe cambiar
    // de PENDIENTE a ANULADA aunque tuviese una copia local anterior.
    if(isOlderAlarmUpdate(cleaned, existing)) return;
    state.alarms[i] = mergeAlarm(existing, cleaned);
  } else {
    state.alarms.push(cleaned);
  }
  saveAlarms();
}

function mergeAlarm(existing, incoming){
  const merged = Object.assign({}, existing, incoming);
  // Conserva mensajes importantes aunque llegue una copia parcial.
  if(!merged.note && existing.note) merged.note = existing.note;
  if(!merged.cancelMessage && existing.cancelMessage) merged.cancelMessage = existing.cancelMessage;
  if(!merged.cancelledAt && existing.cancelledAt) merged.cancelledAt = existing.cancelledAt;
  if(!merged.receivedAt && existing.receivedAt) merged.receivedAt = existing.receivedAt;
  if(!merged.receiverProgrammedAt && existing.receiverProgrammedAt) merged.receiverProgrammedAt = existing.receiverProgrammedAt;
  if(!merged.receiverProgrammedBy && existing.receiverProgrammedBy) merged.receiverProgrammedBy = existing.receiverProgrammedBy;
  if(statusRank(incoming.status) > statusRank(existing.status)) merged.status = incoming.status;
  return normalizeAlarm(merged);
}

function statusRank(status){
  // Estados finales tienen prioridad sobre pendiente.
  if(status === 'cancelled') return 3;
  if(status === 'received') return 2;
  return 1;
}

function isOlderAlarmUpdate(incoming, existing){
  if(!existing || !existing.id) return false;
  const incomingUpdated = Number(incoming.updatedAt || 0);
  const existingUpdated = Number(existing.updatedAt || 0);
  // Nunca dejes que una versión pendiente pise una alarma ya anulada o recibida.
  if(existing.status !== 'pending' && incoming.status === 'pending') return true;
  // Una anulación o confirmación entrante debe aceptarse aunque el reloj de un móvil vaya raro.
  if(existing.status === 'pending' && incoming.status !== 'pending') return false;
  if(incomingUpdated < existingUpdated && statusRank(incoming.status) <= statusRank(existing.status)) return true;
  if(incomingUpdated === existingUpdated && statusRank(incoming.status) < statusRank(existing.status)) return true;
  return false;
}

function normalizeAlarm(alarm){
  return {
    id: String(alarm.id),
    from: String(alarm.from || ''),
    to: String(alarm.to || ''),
    time: Number(alarm.time || 0),
    note: String(alarm.note || ''),
    createdAt: Number(alarm.createdAt || Date.now()),
    status: ['received','cancelled'].includes(alarm.status) ? alarm.status : 'pending',
    receiverProgrammedAt: alarm.receiverProgrammedAt ? Number(alarm.receiverProgrammedAt) : null,
    receiverProgrammedBy: String(alarm.receiverProgrammedBy || ''),
    receivedAt: alarm.receivedAt ? Number(alarm.receivedAt) : null,
    cancelledAt: alarm.cancelledAt ? Number(alarm.cancelledAt) : null,
    cancelledBy: String(alarm.cancelledBy || ''),
    cancelMessage: String(alarm.cancelMessage || ''),
    updatedAt: Number(alarm.updatedAt || alarm.cancelledAt || alarm.receivedAt || alarm.createdAt || Date.now())
  };
}

function renderAlarms(){
  const incomingPending = state.alarms.filter(a => a.to === state.deviceId && a.status === 'pending');
  const outgoingPending = state.alarms.filter(a => a.from === state.deviceId && a.status === 'pending');
  setText('pendingIncomingCount', incomingPending.length);
  setText('pendingOutgoingCount', outgoingPending.length);

  renderPendingPreview(incomingPending, outgoingPending);
  renderFullAlarmList();
}

function renderPendingPreview(incomingPending, outgoingPending){
  const target = $('pendingPreviewList');
  if(!target) return;
  const visible = state.alarms
    .filter(a => (a.from === state.deviceId || a.to === state.deviceId) && !isLocallyDeleted(a.id))
    .sort((a,b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
  if(!visible.length){
    target.innerHTML = '<p class="hint">No hay alarmas ni actuaciones todavía.</p>';
    return;
  }
  target.innerHTML = visible.slice(0,5).map(a => alarmCardHtml(a, true)).join('');
}

function renderFullAlarmList(){
  const list = $('alarmList');
  if(!list) return;
  let alarms = state.alarms.filter(a => !isLocallyDeleted(a.id));
  if(state.listFilter === 'pending') alarms = alarms.filter(a => a.status === 'pending');
  if(!alarms.length){
    list.innerHTML = state.listFilter === 'pending' ? '<p class="hint">No hay alarmas pendientes.</p>' : '<p class="hint">No hay alarmas todavía.</p>';
    return;
  }
  list.innerHTML = alarms.sort((a,b) => b.createdAt - a.createdAt).map(a => alarmCardHtml(a, false)).join('');
}

function alarmCardHtml(a, compact){
  const dir = a.from === state.deviceId ? 'Enviada al otro móvil' : 'Recibida para este móvil';
  const statusMap = {
    pending: 'PENDIENTE',
    received: 'RECIBIDA / CONFIRMADA',
    cancelled: 'ANULADA'
  };
  const status = statusMap[a.status] || 'PENDIENTE';
  const when = Number.isFinite(a.time) && a.time ? new Date(a.time).toLocaleString('es-ES') : 'Fecha no válida';
  const note = escapeHtml(a.note || 'Sin nota');
  const cancelMsg = a.status === 'cancelled'
    ? `<div class="cancel-message"><strong>Mensaje de anulación:</strong> ${escapeHtml(a.cancelMessage || 'Sin mensaje adicional')}</div>`
    : '';
  const receivedMsg = a.status === 'received'
    ? `<div class="received-message"><strong>Confirmada:</strong> ${a.receivedAt ? escapeHtml(new Date(a.receivedAt).toLocaleString('es-ES')) : 'Sí'}</div>`
    : '';
  const programmedMsg = a.from === state.deviceId && a.receiverProgrammedAt
    ? `<div class="programmed-message"><span class="green-check">✅</span> <strong>Recibida y programada en el otro móvil</strong><br><span>Confirmado por: ${escapeHtml(a.receiverProgrammedBy || a.to || 'receptor')} · ${escapeHtml(new Date(a.receiverProgrammedAt).toLocaleString('es-ES'))}</span></div>`
    : (a.from === state.deviceId && a.status === 'pending'
      ? `<div class="waiting-message">⏳ Esperando confirmación de recepción del otro móvil...</div>`
      : '');
  const canCancel = a.status === 'pending' && a.from === state.deviceId;
  const cancelBtn = canCancel
    ? `<button type="button" class="cancel-alarm-btn" data-cancel-alarm="${escapeHtml(a.id)}">Anular alarma</button>`
    : '';
  const deleteBtn = a.status !== 'pending'
    ? `<button type="button" class="delete-record-btn" data-delete-record="${escapeHtml(a.id)}">Eliminar registro</button>`
    : '';
  const actions = (cancelBtn || deleteBtn) ? `<div class="alarm-actions">${cancelBtn}${deleteBtn}</div>` : '';
  const gpsBlock = gpsLogsCardHtml(a.id, compact);
  const extra = compact ? '' : `<div class="small">Origen: ${escapeHtml(a.from || '-') } · Destino: ${escapeHtml(a.to || '-')} · ID: ${escapeHtml(a.id)}</div>`;
  const transition = a.status === 'cancelled'
    ? `<div class="status-transition">Estado: <span>PENDIENTE</span> → <strong>ANULADA</strong></div>`
    : `<div class="status-transition">Estado: <strong>${status}</strong></div>`;
  return `<div class="alarm-item ${a.status}"><strong>${dir}</strong><div>${when}</div><div><strong>Mensaje original:</strong> ${note}</div>${transition}${programmedMsg}${cancelMsg}${receivedMsg}${gpsBlock}${extra}${actions}</div>`;
}

function handleAlarmActionClick(ev){
  const cancelBtn = ev.target.closest('[data-cancel-alarm]');
  if(cancelBtn){ cancelAlarm(cancelBtn.dataset.cancelAlarm); return; }
  const deleteBtn = ev.target.closest('[data-delete-record]');
  if(deleteBtn){ deleteLocalRecord(deleteBtn.dataset.deleteRecord); }
}

function cancelAlarm(id){
  const alarm = state.alarms.find(a => a.id === id);
  if(!alarm || alarm.status !== 'pending') return;
  const message = prompt('Mensaje para el otro móvil al anular la alarma:', 'Llegué bien');
  if(message === null) return;
  const cancelled = Object.assign({}, alarm, {
    status: 'cancelled',
    cancelledAt: Date.now(),
    cancelledBy: state.deviceId,
    cancelMessage: String(message || '').trim(),
    updatedAt: Date.now()
  });
  stopGpsUploadForAlarm(id);
  if(state.ringingAlarm && state.ringingAlarm.id === id){
    stopTone();
    state.ringingAlarm = null;
    $('receiverOverlay').classList.add('hidden');
  }
  upsertAlarm(cancelled);
  pushAlarmOnline(cancelled);
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function checkDueAlarms(){
  if(state.ringingAlarm) return;
  const now = Date.now();
  const due = state.alarms
    .filter(a => a.to === state.deviceId && a.status === 'pending' && !isLocallyDeleted(a.id) && a.time <= now)
    .sort((a,b) => a.time - b.time)[0];
  if(due) showReceiverAlarm(due);
  checkAckPopups();
}

function showReceiverAlarm(alarm){
  state.ringingAlarm = alarm;
  setText('receiverNote', alarm.note || 'Alarma sin nota');
  setText('receiverAlarmWhen', formatAlarmDateTime(alarm.time));
  closeGpsPopupIfAlarm(alarm.id);
  startGpsListenerForAlarm(alarm);
  renderGpsViews(alarm.id);
  $('receiverOverlay').classList.remove('hidden');
  startTone();
  if(navigator.vibrate) navigator.vibrate([500,200,500,200,900]);
}

function confirmReceived(){
  if(!state.ringingAlarm) return;
  stopTone();
  const alarm = Object.assign({}, state.ringingAlarm, {status:'received', receivedAt:Date.now(), updatedAt:Date.now()});
  state.ringingAlarm = null;
  $('receiverOverlay').classList.add('hidden');
  closeGpsPopupIfAlarm(alarm.id);
  stopGpsListenerForAlarm(alarm.id);
  upsertAlarm(alarm);
  pushAlarmOnline(alarm);
}

function checkAckPopups(){
  const shown = loadAckShown();

  const programmedNotice = state.alarms
    .filter(a => a.from === state.deviceId && a.receiverProgrammedAt && !shown['programmed-' + a.id])
    .sort((a,b) => (b.receiverProgrammedAt || 0) - (a.receiverProgrammedAt || 0))[0];
  if(programmedNotice){
    shown['programmed-' + programmedNotice.id] = true;
    saveAckShown(shown);
    const title = document.querySelector('#senderPopup h2');
    if(title) title.textContent = 'Alarma recibida y programada ✅';
    setText('senderPopupText', `El otro móvil ya ha recibido y guardado la alarma. Si después pierde cobertura, la alarma queda preparada mientras la app siga abierta.\n\nNota: ${programmedNotice.note}`);
    $('senderPopup').classList.remove('hidden');
    return;
  }

  const notice = state.alarms
    .filter(a => a.from === state.deviceId && a.status === 'received' && !shown[a.id])
    .sort((a,b) => (b.receivedAt || 0) - (a.receivedAt || 0))[0];
  if(notice){
    shown[notice.id] = true;
    saveAckShown(shown);
    const title = document.querySelector('#senderPopup h2');
    if(title) title.textContent = 'Confirmación recibida';
    setText('senderPopupText', `El otro móvil ha pulsado RECIBIDO.\n\nNota: ${notice.note}`);
    $('senderPopup').classList.remove('hidden');
    return;
  }

  const cancelNotice = state.alarms
    .filter(a => a.status === 'cancelled' && a.cancelledBy && a.cancelledBy !== state.deviceId && (a.from === state.deviceId || a.to === state.deviceId) && !shown['cancel-' + a.id])
    .sort((a,b) => (b.cancelledAt || 0) - (a.cancelledAt || 0))[0];
  if(cancelNotice){
    shown['cancel-' + cancelNotice.id] = true;
    saveAckShown(shown);
    const msg = cancelNotice.cancelMessage ? `\n\nMensaje: ${cancelNotice.cancelMessage}` : '';
    const title = document.querySelector('#senderPopup h2');
    if(title) title.textContent = 'Alarma anulada';
    setText('senderPopupText', `El otro móvil ha anulado una alarma pendiente.${msg}\n\nNota original: ${cancelNotice.note}`);
    $('senderPopup').classList.remove('hidden');
  }
}

function startTone(){
  stopTone();
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if(!AudioContext) return;
  state.audioCtx = new AudioContext();
  if(state.audioCtx.state === 'suspended') state.audioCtx.resume().catch(() => {});
  const pattern = getPattern(state.settings.sound);
  let step = 0;
  const playStep = () => {
    if(!state.audioCtx) return;
    const p = pattern[step % pattern.length];
    step++;
    if(p.freq > 0){
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      osc.type = p.type || 'sine';
      osc.frequency.value = p.freq;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(state.audioCtx.destination);
      const t = state.audioCtx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + p.ms/1000);
      osc.start(t);
      osc.stop(t + p.ms/1000 + 0.03);
    }
    state.ringTimer = setTimeout(playStep, p.ms + (p.gap || 80));
  };
  playStep();
}
function stopTone(){
  if(state.ringTimer) clearTimeout(state.ringTimer);
  state.ringTimer = null;
  if(state.audioCtx){
    state.audioCtx.close().catch(() => {});
    state.audioCtx = null;
  }
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
  const configured = Boolean(cfg.apiKey && cfg.databaseURL);
  if(!configured || !state.pairKey || typeof firebase === 'undefined'){
    state.firebaseReady = false;
    stopAllGpsListeners();
    stopAllGpsUploads();
    updateStatusLine();
    return;
  }
  try{
    if(!firebase.apps.length) firebase.initializeApp(cfg);
    if(state.db && state.firebaseListenersActive){
      state.db.off();
      state.firebaseListenersActive = false;
    }
    stopAllGpsListeners();
    stopAllGpsUploads();
    state.firebaseRefPath = 'pairs/' + state.pairKey + '/alarms';
    state.db = firebase.database().ref(state.firebaseRefPath);
    state.firebaseReady = true;
    state.firebaseListenersActive = true;
    updateStatusLine();

    // Escucha completa del nodo compartido. Es más robusto que depender solo
    // de child_changed, porque reconstruye el estado cuando el móvil se reconecta.
    state.db.on('value', snap => syncOnlineAlarms(snap.val() || {}));
    ensureGpsRuntimeForAlarms();
  }catch(err){
    console.error('Firebase no se pudo iniciar:', err);
    state.firebaseReady = false;
    state.firebaseListenersActive = false;
    updateStatusLine();
  }
}
function pushAlarmOnline(alarm){
  if(alarm && alarm.status !== 'pending') stopGpsUploadForAlarm(alarm.id);
  if(state.firebaseReady && state.db){
    state.db.child(alarm.id).set(normalizeAlarm(alarm)).catch((err) => {
      console.error('No se pudo guardar en Firebase:', err);
      state.firebaseReady = false;
      updateStatusLine();
    });
  }
}
function syncOnlineAlarms(remoteMap){
  const remoteAlarms = Object.values(remoteMap || {}).map(normalizeAlarm)
    .filter(a => a.from === state.deviceId || a.to === state.deviceId);
  if(!remoteAlarms.length){
    ensureGpsRuntimeForAlarms();
    renderAlarms();
    return;
  }

  let hadImportantUpdate = false;
  for(const remoteAlarm of remoteAlarms){
    let alarm = remoteAlarm;
    if(alarm.receiverProgrammedAt && alarm.receiverProgrammedBy === state.deviceId){
      state.programmedAckUploaded[alarm.id] = true;
    }
    const before = state.alarms.find(a => a.id === alarm.id);
    const beforeStatus = before ? before.status : '';
    const shouldOpenInitialGps = shouldShowInitialGpsPopup(alarm);

    if(state.ringingAlarm && state.ringingAlarm.id === alarm.id && alarm.status !== 'pending'){
      stopTone();
      state.ringingAlarm = null;
      const overlay = $('receiverOverlay');
      if(overlay) overlay.classList.add('hidden');
    }

    // PUNTO CRÍTICO: si este móvil es el receptor, primero marca la alarma
    // como recibida/programada y sube ESA CONFIRMACIÓN al mismo registro remoto.
    // Después guarda la copia local ya confirmada. Así el emisor ve el check verde.
    if(shouldAutoConfirmProgrammed(alarm)){
      alarm = buildProgrammedConfirmation(alarm);
      upsertAlarm(alarm);
      autoConfirmProgrammed(alarm);
    } else {
      upsertAlarm(alarm);
    }

    manageGpsForAlarm(alarm);
    if(shouldOpenInitialGps) showInitialGpsPopup(alarm);

    if(alarm.status === 'cancelled' && beforeStatus !== 'cancelled'){
      hadImportantUpdate = true;
      showCancellationNotice(alarm, beforeStatus === 'pending' || !before);
    }
    if(alarm.status === 'received' && beforeStatus !== 'received'){
      hadImportantUpdate = true;
    }
  }
  ensureGpsRuntimeForAlarms();
  renderAlarms();
  ensureInitialGpsPopupsForPendingIncoming();
  if(!hadImportantUpdate) checkDueAlarms();
}


function shouldAutoConfirmProgrammed(alarm){
  return Boolean(
    alarm &&
    alarm.id &&
    alarm.to === state.deviceId &&
    alarm.from !== state.deviceId &&
    alarm.status === 'pending' &&
    !alarm.receiverProgrammedAt &&
    !isLocallyDeleted(alarm.id)
  );
}

function buildProgrammedConfirmation(alarm){
  const now = Date.now();
  return normalizeAlarm(Object.assign({}, alarm, {
    receiverProgrammedAt: alarm.receiverProgrammedAt || now,
    receiverProgrammedBy: alarm.receiverProgrammedBy || state.deviceId,
    updatedAt: Math.max(now, Number(alarm.updatedAt || 0) + 1)
  }));
}

function autoConfirmProgrammed(alarm){
  const programmed = buildProgrammedConfirmation(alarm);
  upsertAlarm(programmed);

  if(!state.firebaseReady || !state.db) return;
  if(programmed.receiverProgrammedAt && state.programmedAckUploaded[programmed.id]) return;

  const patch = {
    receiverProgrammedAt: programmed.receiverProgrammedAt,
    receiverProgrammedBy: state.deviceId,
    updatedAt: Math.max(Date.now(), Number(programmed.updatedAt || 0) + 1)
  };

  // Usamos UPDATE parcial, no SET completo. Así no pisamos el registro remoto
  // con copias antiguas y el emisor recibe el cambio en tiempo real.
  state.db.child(programmed.id).update(patch).then(() => {
    state.programmedAckUploaded[programmed.id] = true;
  }).catch((err) => {
    console.error('No se pudo confirmar recepción/programación en Firebase:', err);
  });
}

function needsProgrammedConfirmationUpload(alarm){
  if(!alarm || !alarm.id || alarm.to !== state.deviceId || alarm.from === state.deviceId || alarm.status !== 'pending' || isLocallyDeleted(alarm.id)) return false;
  if(!alarm.receiverProgrammedAt) return true;
  return alarm.receiverProgrammedBy === state.deviceId && !state.programmedAckUploaded[alarm.id];
}

function flushPendingProgrammedConfirmations(){
  if(!state.alarms || !state.alarms.length) return;
  const pendingForMe = state.alarms.filter(needsProgrammedConfirmationUpload);
  pendingForMe.forEach(autoConfirmProgrammed);
}

function ensureInitialGpsPopupsForPendingIncoming(){
  if(state.ringingAlarm) return;
  const alarm = (state.alarms || [])
    .filter(a => a.to === state.deviceId && a.from !== state.deviceId && a.status === 'pending' && !isLocallyDeleted(a.id) && shouldShowInitialGpsPopup(a))
    .sort((a,b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];
  if(!alarm) return;
  startGpsListenerForAlarm(alarm);
  showInitialGpsPopup(alarm);
}

function receiveOnlineAlarm(alarm){
  if(!alarm || !alarm.id) return;
  syncOnlineAlarms({[alarm.id]: alarm});
}

function showCancellationNotice(alarm, wasPendingForMe){
  closeGpsPopupIfAlarm(alarm.id);
  const shown = loadAckShown();
  const key = 'cancel-notice-' + alarm.id;
  if(shown[key]) return;
  // Mostramos aviso sobre todo al receptor. También sirve si estaba abierta la lista.
  if(alarm.to === state.deviceId || wasPendingForMe){
    shown[key] = true;
    saveAckShown(shown);
    const msg = alarm.cancelMessage ? `

Mensaje: ${alarm.cancelMessage}` : '';
    setText('senderPopupText', `ALARMA ANULADA.${msg}

Nota original: ${alarm.note}`);
    const title = document.querySelector('#senderPopup h2');
    if(title) title.textContent = 'Alarma anulada';
    $('senderPopup').classList.remove('hidden');
  }
}


function ensureGpsRuntimeForAlarms(){
  if(!state.firebaseReady) return;
  (state.alarms || []).forEach(manageGpsForAlarm);
}

function manageGpsForAlarm(alarm){
  if(!alarm || !alarm.id) return;
  if(alarm.status === 'pending' && alarm.from === state.deviceId){
    startGpsUploadForAlarm(alarm);
  } else {
    stopGpsUploadForAlarm(alarm.id);
  }

  if(alarm.status === 'pending' && alarm.to === state.deviceId){
    startGpsListenerForAlarm(alarm);
  } else if(alarm.to === state.deviceId && alarm.status !== 'pending'){
    stopGpsListenerForAlarm(alarm.id);
    renderGpsViews(alarm.id);
  }
}

function gpsRootRef(){
  if(!state.firebaseReady || !state.pairKey || typeof firebase === 'undefined') return null;
  return firebase.database().ref('pairs/' + state.pairKey + '/gpsLogs');
}

function gpsAlarmRef(alarmId){
  const root = gpsRootRef();
  return root ? root.child(alarmId) : null;
}

function startGpsUploadForAlarm(alarm){
  if(!alarm || !alarm.id || alarm.from !== state.deviceId || alarm.status !== 'pending') return;
  if(!state.firebaseReady) return;
  if(!('geolocation' in navigator)){
    setText('sendInfo', 'Alarma enviada, pero este móvil/navegador no ofrece GPS.');
    return;
  }
  if(state.gpsUploadTimers[alarm.id]) return;
  uploadGpsPosition(alarm);
  state.gpsUploadTimers[alarm.id] = setInterval(() => {
    const current = state.alarms.find(a => a.id === alarm.id);
    if(!current || current.status !== 'pending' || current.from !== state.deviceId){
      stopGpsUploadForAlarm(alarm.id);
      return;
    }
    uploadGpsPosition(current);
  }, 60000);
}

function stopGpsUploadForAlarm(alarmId){
  if(state.gpsUploadTimers && state.gpsUploadTimers[alarmId]){
    clearInterval(state.gpsUploadTimers[alarmId]);
    delete state.gpsUploadTimers[alarmId];
  }
  if(state.gpsUploadBusy) delete state.gpsUploadBusy[alarmId];
}

function uploadGpsPosition(alarm){
  if(!alarm || !alarm.id || state.gpsUploadBusy[alarm.id]) return;
  const ref = gpsAlarmRef(alarm.id);
  if(!ref || !('geolocation' in navigator)) return;
  state.gpsUploadBusy[alarm.id] = true;
  navigator.geolocation.getCurrentPosition(pos => {
    state.gpsUploadBusy[alarm.id] = false;
    const ts = Date.now();
    const record = normalizeGpsLog({
      alarmId: alarm.id,
      from: state.deviceId,
      to: alarm.to,
      timestamp: ts,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      source: 'emisor'
    });
    mergeGpsLogs(alarm.id, [record]);
    ref.child(String(ts)).set(record).catch(err => {
      console.error('No se pudo subir la posición GPS:', err);
    });
  }, err => {
    state.gpsUploadBusy[alarm.id] = false;
    console.warn('No se pudo obtener GPS:', err);
    if(err && err.code === 1){
      setText('sendInfo', 'Alarma enviada, pero el permiso GPS está denegado. Activa la ubicación para enviar coordenadas al receptor.');
      stopGpsUploadForAlarm(alarm.id);
    }
  }, {enableHighAccuracy:true, timeout:20000, maximumAge:30000});
}

function startGpsListenerForAlarm(alarm){
  if(!alarm || !alarm.id || alarm.to !== state.deviceId || alarm.status !== 'pending') return;
  if(state.gpsListeners[alarm.id]) return;
  const ref = gpsAlarmRef(alarm.id);
  if(!ref) return;
  const query = ref.limitToLast(250);
  const callback = snap => {
    const values = Object.values(snap.val() || {}).map(normalizeGpsLog).filter(log => log.alarmId === alarm.id);
    mergeGpsLogs(alarm.id, values);
    renderGpsViews(alarm.id);
    renderAlarms();
  };
  query.on('value', callback);
  state.gpsListeners[alarm.id] = {query, callback};
}

function stopGpsListenerForAlarm(alarmId){
  const listener = state.gpsListeners && state.gpsListeners[alarmId];
  if(listener){
    listener.query.off('value', listener.callback);
    delete state.gpsListeners[alarmId];
  }
}

function stopAllGpsListeners(){
  Object.keys(state.gpsListeners || {}).forEach(stopGpsListenerForAlarm);
}

function stopAllGpsUploads(){
  Object.keys(state.gpsUploadTimers || {}).forEach(stopGpsUploadForAlarm);
}

function normalizeGpsLog(log){
  return {
    alarmId: String(log && log.alarmId || ''),
    from: String(log && log.from || ''),
    to: String(log && log.to || ''),
    timestamp: Number(log && log.timestamp || 0),
    latitude: Number(log && log.latitude),
    longitude: Number(log && log.longitude),
    accuracy: Number(log && log.accuracy || 0),
    source: String(log && log.source || 'emisor')
  };
}

function mergeGpsLogs(alarmId, logs){
  if(!alarmId) return;
  const valid = (logs || []).filter(l => Number.isFinite(l.latitude) && Number.isFinite(l.longitude) && l.timestamp);
  if(!valid.length) return;
  const map = new Map((state.gpsLogs[alarmId] || []).map(l => [String(l.timestamp), l]));
  valid.forEach(l => map.set(String(l.timestamp), l));
  state.gpsLogs[alarmId] = Array.from(map.values())
    .sort((a,b) => b.timestamp - a.timestamp)
    .slice(0, 500);
  saveGpsLogs();
}

function getGpsLogs(alarmId){
  return (state.gpsLogs && state.gpsLogs[alarmId] ? state.gpsLogs[alarmId] : [])
    .slice()
    .sort((a,b) => b.timestamp - a.timestamp);
}

function gpsLogsCardHtml(alarmId, compact){
  const logs = getGpsLogs(alarmId);
  if(!logs.length) return '';
  const max = compact ? 1 : 5;
  const lines = logs.slice(0, max).map(gpsLineHtml).join('');
  const more = logs.length > max ? `<div class="gps-more">+ ${logs.length - max} registros GPS más</div>` : '';
  return `<div class="gps-card-block"><strong>GPS del emisor</strong><div class="gps-log-list compact">${lines}${more}</div></div>`;
}

function gpsLineHtml(log){
  const d = new Date(log.timestamp);
  const date = d.toLocaleDateString('es-ES');
  const time = d.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  const lat = Number(log.latitude).toFixed(6);
  const lon = Number(log.longitude).toFixed(6);
  const acc = log.accuracy ? ` · precisión aprox. ${Math.round(log.accuracy)} m` : '';
  return `<div class="gps-line"><span>${escapeHtml(date)}</span><span>${escapeHtml(time)}</span><code>${escapeHtml(lat)}, ${escapeHtml(lon)}</code><small>${escapeHtml(acc)}</small></div>`;
}

function renderGpsViews(alarmId){
  if(state.currentGpsPopupAlarmId === alarmId) renderGpsPopupLogs(alarmId);
  if(state.ringingAlarm && state.ringingAlarm.id === alarmId) renderReceiverGpsLogs(alarmId);
}

function renderGpsPopupLogs(alarmId){
  const target = $('gpsPopupLogs');
  if(!target) return;
  const logs = getGpsLogs(alarmId);
  target.innerHTML = logs.length
    ? logs.map(gpsLineHtml).join('')
    : '<p class="hint">Esperando la primera ubicación GPS del móvil emisor...</p>';
}

function renderReceiverGpsLogs(alarmId){
  const target = $('receiverGpsLogs');
  if(!target) return;
  const logs = getGpsLogs(alarmId);
  target.innerHTML = logs.length
    ? logs.slice(0, 20).map(gpsLineHtml).join('')
    : '<p class="hint">Esperando ubicación GPS del móvil emisor...</p>';
}

function shouldShowInitialGpsPopup(alarm){
  if(!alarm || alarm.to !== state.deviceId || alarm.from === state.deviceId || alarm.status !== 'pending' || isLocallyDeleted(alarm.id)) return false;
  const shown = loadAckShown();
  return !shown['initial-gps-' + alarm.id];
}

function showInitialGpsPopup(alarm){
  if(!alarm || !alarm.id || alarm.to !== state.deviceId) return;
  const popup = $('gpsPopup');
  if(!popup) return;
  state.currentGpsPopupAlarmId = alarm.id;
  setText('gpsPopupNote', alarm.note || 'Alarma sin mensaje');
  setText('gpsPopupDay', formatAlarmDay(alarm.time));
  setText('gpsPopupHour', formatAlarmHour(alarm.time));
  setText('gpsPopupStatus', alarmStatusText(alarm.status));
  renderGpsPopupLogs(alarm.id);
  popup.classList.remove('hidden');
  const shown = loadAckShown();
  shown['initial-gps-' + alarm.id] = true;
  saveAckShown(shown);
}

function closeGpsPopup(){
  state.currentGpsPopupAlarmId = '';
  const popup = $('gpsPopup');
  if(popup) popup.classList.add('hidden');
}

function closeGpsPopupIfAlarm(alarmId){
  if(state.currentGpsPopupAlarmId === alarmId) closeGpsPopup();
}

function alarmStatusText(status){
  if(status === 'received') return 'RECIBIDA / CONFIRMADA';
  if(status === 'cancelled') return 'ANULADA';
  return 'PENDIENTE';
}

function formatAlarmDay(timestamp){
  const d = new Date(Number(timestamp || 0));
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('es-ES') : '-';
}

function formatAlarmHour(timestamp){
  const d = new Date(Number(timestamp || 0));
  return Number.isFinite(d.getTime()) ? d.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}) : '-';
}

function formatAlarmDateTime(timestamp){
  return `${formatAlarmDay(timestamp)} · ${formatAlarmHour(timestamp)}`;
}
