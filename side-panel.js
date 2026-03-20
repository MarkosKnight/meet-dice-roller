/**
 * side-panel.js
 * Meet add-on side panel: handles UI, dice rolls, and broadcasting to main stage.
 * Fixed: startActivity() is called only once; all subsequent rolls use sendMessage() only.
 */

const CLOUD_PROJECT_NUMBER = '183167958875';
const MAIN_STAGE_URL = 'https://markosknight.github.io/meet-dice-roller/main-stage.html';

let sidePanelClient = null;
let rollHistory = [];
let displayName = 'Someone';
let activityStarted = false;  // track whether the main stage is already open

(async function init() {
  try {
    const session = await window.meet.addon.createAddonSession({
      cloudProjectNumber: CLOUD_PROJECT_NUMBER,
    });
    try {
      const info = await session.getMeetingInfo();
      if (info && info.localParticipant && info.localParticipant.name) {
        displayName = info.localParticipant.name;
      }
    } catch (_) {}
    sidePanelClient = await session.createSidePanelClient();
    setStatus('Ready! Enter a dice expression and roll.');
    setupUI();
  } catch (err) {
    console.error('Meet add-on init error:', err);
    setStatus('Could not connect to Meet SDK.');
  }
})();

function setupUI() {
  document.getElementById('rollBtn').addEventListener('click', handleRoll);
  document.getElementById('diceExpr').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleRoll();
  });
  document.querySelectorAll('.quick').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('diceExpr').value = btn.dataset.expr;
      handleRoll();
    });
  });
  document.getElementById('clearBtn').addEventListener('click', () => {
    rollHistory = [];
    renderHistory();
  });
  // Launch shared panel button - opens main stage once, manually
  document.getElementById('launchBtn').addEventListener('click', launchMainStage);
}

async function handleRoll() {
  const expr = document.getElementById('diceExpr').value.trim();
  const parsed = parseDiceExpr(expr);
  if (!parsed) {
    setStatus('Invalid expression. Try: 2d6+3 or 1d20');
    return;
  }
  const result = rollDice(parsed);
  const detail = formatRollDetail(result);
  const time = formatTime();
  showResult(result, detail);
  const entry = { who: displayName, expr: result.expr, total: result.total, detail, time };
  rollHistory.unshift(entry);
  if (rollHistory.length > 30) rollHistory.pop();
  renderHistory();
  // Only send message - never call startActivity() here
  await sendRollMessage(entry);
  setStatus('');
}

async function launchMainStage() {
  if (!sidePanelClient) return;
  if (activityStarted) {
    setStatus('Shared panel is already open.');
    return;
  }
  try {
    await sidePanelClient.startActivity({ mainStageUrl: MAIN_STAGE_URL });
    activityStarted = true;
    document.getElementById('launchBtn').textContent = 'Shared Panel Open';
    document.getElementById('launchBtn').disabled = true;
    setStatus('Shared panel launched!');
  } catch (err) {
    // If error says activity already running, mark it as started
    activityStarted = true;
    document.getElementById('launchBtn').textContent = 'Shared Panel Open';
    document.getElementById('launchBtn').disabled = true;
    setStatus('');
    console.warn('startActivity error (may already be running):', err);
  }
}

async function sendRollMessage(entry) {
  if (!sidePanelClient) return;
  try {
    await sidePanelClient.sendMessage(JSON.stringify(entry));
  } catch (err) {
    console.warn('sendMessage failed:', err);
  }
}

function showResult(result, detail) {
  const section = document.getElementById('resultSection');
  document.getElementById('resultExpr').textContent = result.expr;
  document.getElementById('resultTotal').textContent = result.total;
  document.getElementById('resultDetail').textContent = detail;
  section.hidden = false;
  section.classList.remove('flash');
  void section.offsetWidth;
  section.classList.add('flash');
}

function renderHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = '';
  if (rollHistory.length === 0) {
    list.innerHTML = '<li class="empty-history">No rolls yet.</li>';
    return;
  }
  rollHistory.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML =
      '<span class="h-expr">' + entry.expr + '</span>' +
      '<span class="h-total">' + entry.total + '</span>' +
      '<span class="h-detail">' + entry.detail + '</span>' +
      '<span class="h-time">' + entry.time + '</span>';
    list.appendChild(li);
  });
}

function setStatus(msg) {
  document.getElementById('statusMsg').textContent = msg;
}
