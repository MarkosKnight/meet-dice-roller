/**
 * side-panel.js
 * Hooks into the existing index.html UI and adds Firebase Realtime Database sync.
 * Works alongside dice.js for rolling logic.
 */

const CLOUD_PROJECT_NUMBER = '183167958875';
const MAIN_STAGE_URL = 'https://markosknight.github.io/meet-dice-roller/main-stage.html';

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
let displayName = 'Someone';
let activityStarted = false;
let meetingId = 'default-room';
let fbRef = null;
let fbPush = null;

// Initialize Firebase via dynamic import
import('https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js').then(({ initializeApp }) => {
  import('https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js').then(({ getDatabase, ref, push }) => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    fbRef = (path) => ref(db, path);
    fbPush = push;
    console.log('[DiceRoller] Firebase ready');
  });
});

// Initialize Meet SDK
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
      console.warn('[DiceRoller] Could not get meeting info', e);
    }
    sidePanelClient = await session.createSidePanelClient();
    console.log('[DiceRoller] Meet SDK ready, room:', meetingId);
  } catch (e) {
    console.error('[DiceRoller] Failed to init Meet SDK', e);
  }
})();

// Push a roll result to Firebase
function pushRollToFirebase(expr, result, detail) {
  if (!fbRef || !fbPush) return;
  const rollText = `${displayName} rolled ${expr} → ${result}${detail ? ' (' + detail + ')' : ''}`;
  fbPush(fbRef('rolls/' + meetingId), {
    player: displayName,
    expr: expr,
    result: result,
    text: rollText,
    timestamp: Date.now()
  }).catch(e => console.warn('[DiceRoller] Firebase push failed', e));
}

// Expose so dice.js can call it after rolling
window.onDiceRolled = function(expr, total, detail) {
  pushRollToFirebase(expr, total, detail);
};

// Launch button handler
document.addEventListener('DOMContentLoaded', () => {
  const launchBtn = document.getElementById('launchBtn');
  if (launchBtn) {
    launchBtn.addEventListener('click', async () => {
      if (!activityStarted && sidePanelClient) {
        activityStarted = true;
        launchBtn.disabled = true;
        launchBtn.textContent = '✅ Shared Panel Open';
        try {
          await sidePanelClient.startActivity({ main_stage_url: MAIN_STAGE_URL });
        } catch (e) {
          console.error('[DiceRoller] startActivity failed', e);
          activityStarted = false;
          launchBtn.disabled = false;
          launchBtn.textContent = '🗺 Open Shared Panel';
        }
      }
    });
  }
});
