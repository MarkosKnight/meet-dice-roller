/**
 * main-stage.js
 * Meet add-on main stage: receives roll messages and displays shared roll log.
 */

const CLOUD_PROJECT_NUMBER = 'YOUR_CLOUD_PROJECT_NUMBER';

let stageHistory = [];

(async function init() {
  try {
    const session = await window.meet.addon.createAddonSession({
      cloudProjectNumber: CLOUD_PROJECT_NUMBER,
    });
    const mainStageClient = await session.createMainStageClient();

    // Listen for roll messages sent from side panels
    mainStageClient.setMessageListener((payload) => {
      try {
        const entry = JSON.parse(payload);
        handleIncomingRoll(entry);
      } catch (e) {
        console.warn('Invalid message payload:', e);
      }
    });

  } catch (err) {
    console.error('Main stage init error:', err);
  }
})();

function handleIncomingRoll(entry) {
  // Show latest roll prominently
  const latestBox = document.getElementById('latestRoll');
  document.getElementById('latestWho').textContent = entry.who + ' rolled';
  document.getElementById('latestExpr').textContent = entry.expr;
  document.getElementById('latestTotal').textContent = entry.total;
  document.getElementById('latestDetail').textContent = entry.detail;
  latestBox.hidden = false;

  // Re-trigger animation
  latestBox.style.animation = 'none';
  void latestBox.offsetWidth;
  latestBox.style.animation = '';

  // Add to shared log
  stageHistory.unshift(entry);
  if (stageHistory.length > 50) stageHistory.pop();
  renderStageHistory();
}

function renderStageHistory() {
  const list = document.getElementById('stageHistoryList');
  list.innerHTML = '';
  if (stageHistory.length === 0) {
    list.innerHTML = '<li class="empty-history">No rolls yet. Open the side panel to roll!</li>';
    return;
  }
  stageHistory.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML =
      '<span class="h-expr">' + entry.expr + '</span>' +
      '<span class="h-total">' + entry.total + '</span>' +
      '<span class="h-detail">' + entry.detail + '</span>' +
      '<span class="h-who">' + entry.who + '</span>' +
      '<span class="h-time">' + entry.time + '</span>';
    list.appendChild(li);
  });
}
