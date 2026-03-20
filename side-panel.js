/**
 * side-panel.js
 * Meet add-on side panel: handles UI, dice rolls, and syncs via Firebase Realtime Database.
 */

const CLOUD_PROJECT_NUMBER = '183167958875';
const MAIN_STAGE_URL = 'https://markosknight.github.io/meet-dice-roller/main-stage.html';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCcydiLjfC48SRKEeaqbgvsOYqlqBDB1Zo",
  authDomain: "meet-dice-roller-4508d.firebaseapp.com",
  databaseURL: "https://meet-dice-roller-4508d-default-rtdb.firebaseio.com",
  projectId: "meet-dice-roller-4508d",
  storageBucket: "meet-dice-roller-4508d.firebasestorage.app",
  messagingSenderId: "13711318374",
  appId: "1:13711318374:web:87e12390c0a81b5a71fca7"
};

let sidePanelClient = null;
let rollHistory = [];
let displayName = 'Someone';
let activityStarted = false;
let meetingId = 'default-room';
let db = null;

// Initialize Firebase
import('https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js').then(({ initializeApp }) => {
  import('https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js').then(({ getDatabase, ref, push, onValue }) => {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    window._fbRef = ref;
    window._fbPush = push;
    window._fbOnValue = onValue;
    console.log('Firebase initialized');
  });
});

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
      if (info && info.meeting && info.meeting.meetingCode) {
        meetingId = info.meeting.meetingCode.replace(/-/g, '');
      }
    } catch (e) {
      console.warn('Could not get meeting info', e);
    }
    sidePanelClient = await session.createSidePanelClient();
    document.getElementById('display-name').textContent = displayName;
  } catch (e) {
    console.error('Failed to init Meet SDK', e);
  }
})();

function rollDice(sides) {
  const result = Math.floor(Math.random() * sides) + 1;
  const rollText = `${displayName} rolled 1d${sides} → ${result}`;
  addToHistory(rollText);

  // Write to Firebase
  if (db && window._fbRef && window._fbPush) {
    const rollsRef = window._fbRef(db, 'rolls/' + meetingId);
    window._fbPush(rollsRef, {
      player: displayName,
      dice: `1d${sides}`,
      result: result,
      text: rollText,
      timestamp: Date.now()
    }).catch(e => console.warn('Firebase write failed', e));
  }
}

function addToHistory(text) {
  rollHistory.unshift(text);
  if (rollHistory.length > 20) rollHistory.pop();
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('roll-history');
  list.innerHTML = rollHistory.map(r => `<li>${r}</li>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.roll-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sides = parseInt(btn.dataset.sides);
      rollDice(sides);
    });
  });

  const launchBtn = document.getElementById('launch-btn');
  if (launchBtn) {
    launchBtn.addEventListener('click', async () => {
      if (!activityStarted && sidePanelClient) {
        activityStarted = true;
        launchBtn.disabled = true;
        launchBtn.textContent = 'Shared Panel Open';
        try {
          await sidePanelClient.startActivity({ main_stage_url: MAIN_STAGE_URL });
        } catch (e) {
          console.error('startActivity failed', e);
          activityStarted = false;
          launchBtn.disabled = false;
          launchBtn.textContent = 'Open Shared Panel';
        }
      }
    });
  }
});
