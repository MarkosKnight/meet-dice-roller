/**
 * side-panel.js
 * Hooks into index.html UI, adds Firebase sync, and opens shared stage.
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
let meetingId = 'default-room';
let fbRef = null;
let fbPush = null;

// Init Firebase
import('https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js').then(function(m) {
  import('https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js').then(function(db) {
    var app = m.initializeApp(firebaseConfig);
    var database = db.getDatabase(app);
    fbRef = function(path) { return db.ref(database, path); };
    fbPush = db.push;
    console.log('[DiceRoller] Firebase ready');
  });
});

// Init Meet SDK
(async function init() {
  try {
    var session = await window.meet.addon.createAddonSession({
      cloudProjectNumber: CLOUD_PROJECT_NUMBER
    });
    try {
      var info = await session.getMeetingInfo();
      if (info && info.localParticipant && info.localParticipant.name) {
        displayName = info.localParticipant.name;
      }
      if (info && info.meeting && info.meeting.meetingCode) {
        meetingId = info.meeting.meetingCode.replace(/-/g, '');
      }
    } catch(e) {
      console.warn('[DiceRoller] getMeetingInfo failed', e);
    }
    sidePanelClient = await session.createSidePanelClient();
    console.log('[DiceRoller] Meet SDK ready, room:', meetingId);
  } catch(e) {
    console.error('[DiceRoller] Meet SDK init failed', e);
  }
})();

// Push roll to Firebase
window.onDiceRolled = function(expr, total, detail) {
  if (!fbRef || !fbPush) return;
  var rollText = displayName + ' rolled ' + expr + ' -> ' + total + (detail ? ' ' + detail : '');
  fbPush(fbRef('rolls/' + meetingId), {
    player: displayName,
    expr: expr,
    result: total,
    text: rollText,
    timestamp: Date.now()
  }).catch(function(e) { console.warn('[DiceRoller] Firebase push failed', e); });
};

// Launch button: open shared stage in new tab + try Meet activity
document.addEventListener('DOMContentLoaded', function() {
  var launchBtn = document.getElementById('launchBtn');
  if (!launchBtn) return;

  launchBtn.addEventListener('click', function() {
    // Always open in a new browser tab so it works with 1 or more participants
    window.open(MAIN_STAGE_URL, '_blank');

    // Also try to start the Meet main-stage activity (works with 2+ participants)
    if (sidePanelClient) {
      sidePanelClient.startActivity({ main_stage_url: MAIN_STAGE_URL })
        .then(function() {
          launchBtn.textContent = 'Shared Panel Open';
          console.log('[DiceRoller] startActivity succeeded');
        })
        .catch(function(e) {
          console.warn('[DiceRoller] startActivity failed (solo call):', e.message);
        });
    }
  });
});
