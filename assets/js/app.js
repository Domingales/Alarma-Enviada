'use strict';

const LS = {
  deviceId: 'sinc_alarmas_device_id_v3',
  peerId: 'sinc_alarmas_peer_id_v3',
  pairKey: 'sinc_alarmas_pair_key_v3',
  settings: 'sinc_alarmas_settings_v3',
  alarms: 'sinc_alarmas_alarms_v3',
  ackShown: 'sinc_alarmas_ack_shown_v3',
  deletedIds: 'sinc_alarmas_deleted_ids_v4'
};

const state = {
  deviceId: getOrCreateDeviceId(),
  peerId: localStorage.getItem(LS.peerId) || '',
  pairKey: localStorage.getItem(LS.pairKey) || '',
  settings: loadSettings(),
  alarms: loadAlarms(),
  deletedIds: loadDeletedIds(),
  db: null,
  ackDb: null,
  firebaseReady: false,
  ringingAlarm: null,
  audioCtx: null,
  ringTimer: null,
  qrStream: null,
  listFilter: 'pending',
  firebaseListenersActive: false,
  firebaseRefPath: '',
  firebaseAckPath: '',
  ackRetryTimer: null,
  ackUploads: {}
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
  checkDueAlarms();
  flushPendingProgrammedConfirmations();
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
  // Fallback para file:// o navegadores antiguos donde crypto.subtle no está disponible.
  let h1 = 0x811c9dc5;
  for(let i=0; i<clean.length; i++){
    h1 ^= clean.charCodeAt(i);
    h1 += (h1 << 1) + (h1 << 4) + (h1 << 7) + (h1 << 8) + (h1 << 24);
  }
  return ('fallback-' + (h1 >>> 0).toString(16)).padEnd(32, '0').slice(0,32);
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
  const msg = state.firebaseReady ? 'Sincronización online activa' : 'Modo local · configura Firebase para sincronizar dos móviles por internet';
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
    receiverAckAt: null,
    receiverAckBy: '',
    receiverAckText: '',
    receivedAt: null,
    cancelledAt: null,
    cancelledBy: '',
    cancelMessage: '',
    updatedAt: Date.now()
  };
  upsertAlarm(alarm);
  pushAlarmOnline(alarm);
  setText('sendInfo', state.firebaseReady ? 'Alarma enviada online. El otro móvil sonará cuando llegue la hora.' : 'Alarma guardada en este móvil. Para que llegue al otro por internet debes configurar Firebase.');
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
  if(!merged.receiverAckAt && existing.receiverAckAt) merged.receiverAckAt = existing.receiverAckAt;
  if(!merged.receiverAckBy && existing.receiverAckBy) merged.receiverAckBy = existing.receiverAckBy;
  if(!merged.receiverAckText && existing.receiverAckText) merged.receiverAckText = existing.receiverAckText;
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
    receiverAckAt: alarm.receiverAckAt ? Number(alarm.receiverAckAt) : null,
    receiverAckBy: String(alarm.receiverAckBy || ''),
    receiverAckText: String(alarm.receiverAckText || ''),
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
  const ackAt = a.receiverAckAt || a.receiverProgrammedAt;
  const ackBy = a.receiverAckBy || a.receiverProgrammedBy || a.to || 'receptor';
  const programmedMsg = a.from === state.deviceId && ackAt
    ? `<div class="programmed-message"><span class="green-check">✅</span> <strong>Recibida y programada automáticamente en el otro móvil</strong><br><span>Confirmado por: ${escapeHtml(ackBy)} · ${escapeHtml(new Date(ackAt).toLocaleString('es-ES'))}</span></div>`
    : (a.from === state.deviceId && a.status === 'pending'
      ? `<div class="waiting-message">⏳ Esperando confirmación automática del otro móvil...</div>`
      : '');
  const canCancel = a.status === 'pending' && a.from === state.deviceId;
  const cancelBtn = canCancel
    ? `<button type="button" class="cancel-alarm-btn" data-cancel-alarm="${escapeHtml(a.id)}">Anular alarma</button>`
    : '';
  const deleteBtn = a.status !== 'pending'
    ? `<button type="button" class="delete-record-btn" data-delete-record="${escapeHtml(a.id)}">Eliminar registro</button>`
    : '';
  const actions = (cancelBtn || deleteBtn) ? `<div class="alarm-actions">${cancelBtn}${deleteBtn}</div>` : '';
  const extra = compact ? '' : `<div class="small">Origen: ${escapeHtml(a.from || '-') } · Destino: ${escapeHtml(a.to || '-')} · ID: ${escapeHtml(a.id)}</div>`;
  const transition = a.status === 'cancelled'
    ? `<div class="status-transition">Estado: <span>PENDIENTE</span> → <strong>ANULADA</strong></div>`
    : `<div class="status-transition">Estado: <strong>${status}</strong></div>`;
  return `<div class="alarm-item ${a.status}"><strong>${dir}</strong><div>${when}</div><div><strong>Mensaje original:</strong> ${note}</div>${transition}${programmedMsg}${cancelMsg}${receivedMsg}${extra}${actions}</div>`;
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
  upsertAlarm(alarm);
  pushAlarmOnline(alarm);
}

function checkAckPopups(){
  const shown = loadAckShown();

  const programmedNotice = state.alarms
    .filter(a => a.from === state.deviceId && (a.receiverAckAt || a.receiverProgrammedAt) && !shown['programmed-' + a.id])
    .sort((a,b) => ((b.receiverAckAt || b.receiverProgrammedAt || 0) - (a.receiverAckAt || a.receiverProgrammedAt || 0)))[0];
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
    updateStatusLine();
    return;
  }
  try{
    if(!firebase.apps.length) firebase.initializeApp(cfg);
    if(state.firebaseListenersActive){
      if(state.db) state.db.off();
      if(state.ackDb) state.ackDb.off();
      state.firebaseListenersActive = false;
    }
    state.firebaseRefPath = 'pairs/' + state.pairKey + '/alarms';
    state.firebaseAckPath = 'pairs/' + state.pairKey + '/acks';
    state.db = firebase.database().ref(state.firebaseRefPath);
    state.ackDb = firebase.database().ref(state.firebaseAckPath);
    state.firebaseReady = true;
    state.firebaseListenersActive = true;
    updateStatusLine();

    // Escucha completa del nodo compartido. Es más robusto que depender solo
    // de child_changed, porque reconstruye el estado cuando el móvil se reconecta.
    state.db.on('value', snap => syncOnlineAlarms(snap.val() || {}));
    state.db.on('child_added', snap => receiveOnlineAlarm(snap.val()));
    state.db.on('child_changed', snap => receiveOnlineAlarm(snap.val()));
    state.ackDb.on('child_added', snap => receiveOnlineAck(snap.val()));
    state.ackDb.on('child_changed', snap => receiveOnlineAck(snap.val()));
  }catch(err){
    console.error('Firebase no se pudo iniciar:', err);
    state.firebaseReady = false;
    state.firebaseListenersActive = false;
    updateStatusLine();
  }
}
function pushAlarmOnline(alarm){
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
  if(!remoteAlarms.length){ renderAlarms(); return; }

  let hadImportantUpdate = false;
  for(const remoteAlarm of remoteAlarms){
    let alarm = remoteAlarm;
    const before = state.alarms.find(a => a.id === alarm.id);
    const beforeStatus = before ? before.status : '';

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
      // El receptor confirma de forma automática y sin intervención del usuario.
      // Si la alarma ya venía confirmada no cambia nada, pero igualmente se reintenta subir
      // el acuse para que el emisor pueda ver el check verde.
      alarm = needsLocalProgrammedStamp(alarm) ? buildProgrammedConfirmation(alarm) : normalizeAlarm(alarm);
      upsertAlarm(alarm);
      autoConfirmProgrammed(alarm);
    } else {
      upsertAlarm(alarm);
    }

    if(alarm.status === 'cancelled' && beforeStatus !== 'cancelled'){
      hadImportantUpdate = true;
      showCancellationNotice(alarm, beforeStatus === 'pending' || !before);
    }
    if(alarm.status === 'received' && beforeStatus !== 'received'){
      hadImportantUpdate = true;
    }
  }
  renderAlarms();
  if(!hadImportantUpdate) checkDueAlarms();
}


function shouldAutoConfirmProgrammed(alarm){
  return Boolean(
    alarm &&
    alarm.id &&
    alarm.to === state.deviceId &&
    alarm.from !== state.deviceId &&
    alarm.status === 'pending' &&
    !isLocallyDeleted(alarm.id)
  );
}

function needsLocalProgrammedStamp(alarm){
  return shouldAutoConfirmProgrammed(alarm) && !(alarm.receiverAckAt || alarm.receiverProgrammedAt);
}

function buildProgrammedConfirmation(alarm){
  const now = Date.now();
  const ackAt = alarm.receiverAckAt || alarm.receiverProgrammedAt || now;
  return normalizeAlarm(Object.assign({}, alarm, {
    receiverProgrammedAt: alarm.receiverProgrammedAt || ackAt,
    receiverProgrammedBy: alarm.receiverProgrammedBy || state.deviceId,
    receiverAckAt: alarm.receiverAckAt || ackAt,
    receiverAckBy: alarm.receiverAckBy || state.deviceId,
    receiverAckText: alarm.receiverAckText || 'ALARMA_RECIBIDA_Y_PROGRAMADA_AUTOMATICAMENTE',
    updatedAt: Math.max(now, Number(alarm.updatedAt || 0) + 1)
  }));
}

function autoConfirmProgrammed(alarm){
  if(!shouldAutoConfirmProgrammed(alarm)) return;
  const programmed = buildProgrammedConfirmation(alarm);
  upsertAlarm(programmed);

  if(!state.firebaseReady || !state.db) return;

  const lastUpload = state.ackUploads[programmed.id] || 0;
  if(Date.now() - lastUpload < 15000 && (programmed.receiverAckAt || programmed.receiverProgrammedAt)) return;
  state.ackUploads[programmed.id] = Date.now();

  const ackAt = programmed.receiverAckAt || programmed.receiverProgrammedAt || Date.now();
  const patch = {
    receiverProgrammedAt: programmed.receiverProgrammedAt || ackAt,
    receiverProgrammedBy: state.deviceId,
    receiverAckAt: ackAt,
    receiverAckBy: state.deviceId,
    receiverAckText: 'ALARMA_RECIBIDA_Y_PROGRAMADA_AUTOMATICAMENTE',
    updatedAt: Math.max(Date.now(), Number(programmed.updatedAt || 0) + 1)
  };

  // Confirmación automática y silenciosa: el receptor escribe este parche en Firebase
  // sobre el MISMO ID de alarma. El emisor lee estos campos y muestra el check verde.
  state.db.child(programmed.id).update(patch).catch((err) => {
    console.error('No se pudo confirmar recepción/programación en Firebase:', err);
  });

  // Canal secundario de acuse. Esto evita que el emisor se quede esperando si por
  // cualquier motivo no llega a leer el campo dentro del registro de alarma.
  if(state.ackDb){
    state.ackDb.child(programmed.id).set(Object.assign({
      alarmId: programmed.id,
      from: programmed.from,
      to: programmed.to,
      ackType: 'programmed'
    }, patch)).catch((err) => {
      console.error('No se pudo guardar el acuse independiente en Firebase:', err);
    });
  }
}

function flushPendingProgrammedConfirmations(){
  if(!state.alarms || !state.alarms.length) return;
  // Reintenta también alarmas que ya tienen sello local, por si el primer UPDATE a Firebase falló.
  const pendingForMe = state.alarms.filter(shouldAutoConfirmProgrammed);
  pendingForMe.forEach(autoConfirmProgrammed);
}

function receiveOnlineAlarm(alarm){
  if(!alarm || !alarm.id) return;
  syncOnlineAlarms({[alarm.id]: alarm});
}

function receiveOnlineAck(ack){
  if(!ack || !ack.alarmId || ack.ackType !== 'programmed') return;
  // El acuse solo interesa al emisor original de esa alarma.
  if(ack.from !== state.deviceId) return;
  const alarm = state.alarms.find(a => a.id === ack.alarmId);
  if(!alarm) return;
  const patched = normalizeAlarm(Object.assign({}, alarm, {
    receiverProgrammedAt: Number(ack.receiverProgrammedAt || ack.receiverAckAt || Date.now()),
    receiverProgrammedBy: String(ack.receiverProgrammedBy || ack.receiverAckBy || ack.to || ''),
    receiverAckAt: Number(ack.receiverAckAt || ack.receiverProgrammedAt || Date.now()),
    receiverAckBy: String(ack.receiverAckBy || ack.receiverProgrammedBy || ack.to || ''),
    receiverAckText: String(ack.receiverAckText || 'ALARMA_RECIBIDA_Y_PROGRAMADA_AUTOMATICAMENTE'),
    updatedAt: Math.max(Number(alarm.updatedAt || 0), Number(ack.updatedAt || 0), Date.now())
  }));
  upsertAlarm(patched);
  checkAckPopups();
}

function showCancellationNotice(alarm, wasPendingForMe){
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
