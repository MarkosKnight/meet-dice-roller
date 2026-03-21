/**
 * side-panel.js
 * Firebase sync + shared roll feed + Meet SDK integration
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
let fbOnChildAdded = null;
let listeningStarted = false;
let meetReady = false;

// Init Firebase and start listening for shared rolls
Promise.all([
  import('https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js')
]).then(function(modules) {
  var m = modules[0];
  var db = modules[1];
  var app = m.initializeApp(firebaseConfig);
  var database = db.getDatabase(app);
  fbRef = function(path) { return db.ref(database, path); };
  fbPush = db.push;
  fbOnChildAdded = db.onChildAdded;
  console.log('[DiceRoller] Firebase ready');
  startListening();
}).catch(function(e) {
  console.error('[DiceRoller] Firebase load failed', e);
});

function startListening() {
  if (listeningStarted || !fbRef || !fbOnChildAdded) return;
  listeningStarted = true;
  var rollsRef = fbRef('rolls/' + meetingId);
  fbOnChildAdded(rollsRef, function(snapshot) {
    var data = snapshot.val();
    if (data && data.text) {
      addSharedEntry(data.text, data.timestamp);
    }
  });
  console.log('[DiceRoller] Listening on:', meetingId);
}

function addSharedEntry(text, timestamp) {
  var list = document.getElementById('sharedList');
  var empty = document.getElementById('sharedEmpty');
  if (!list) return;
  if (empty) { empty.style.display = 'none'; }
  var li = document.createElement('li');
  li.className = 'shared-entry new-roll';
  var time = timestamp ? new Date(timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
  li.innerHTML = '<span class="s-time">' + time + '</span> <span class="s-text">' + text + '</span>';
  list.insertBefore(li, list.firstChild);
  while (list.children.length > 31) list.removeChild(list.lastChild);
  setTimeout(function() { li.classList.remove('new-roll'); }, 2500);
}

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
        var newId = info.meeting.meetingCode.replace(/-/g, '');
        if (newId !== meetingId) {
          meetingId = newId;
          listeningStarted = false;
          startListening();
        }
      }
    } catch(e) {
      console.warn('[DiceRoller] getMeetingInfo failed', e);
    }
    sidePanelClient = await session.createSidePanelClient();
    meetReady = true;
    updateLaunchBtn();
    console.log('[DiceRoller] Meet SDK ready, room:', meetingId);
  } catch(e) {
    console.warn('[DiceRoller] Meet SDK init failed (normal outside Meet)', e);
  }
})();

function updateLaunchBtn() {
  var btn = document.getElementById('launchBtn');
  if (!btn) return;
  if (meetReady) {
    btn.disabled = false;
    btn.title = 'Open the shared dice stage for all participants';
  } else {
    btn.disabled = true;
    btn.title = 'Only available inside Google Meet';
    btn.textContent = '\uD83D\uDCCB Open Shared Stage (Meet only)';
  }
}

// Called by dice.js after every roll
window.onDiceRolled = function(expr, total, detail) {
  if (!fbRef || !fbPush) return;
  var rollText = displayName + ' rolled ' + expr + ' \u2192 ' + total + (detail ? ' ' + detail : '');
  fbPush(fbRef('rolls/' + meetingId), {
    player: displayName,
    expr: expr,
    result: total,
    text: rollText,
    timestamp: Date.now()
  }).catch(function(e) {
    console.warn('[DiceRoller] Firebase push failed', e);
  });
};

// Launch button: start Meet main-stage activity
document.addEventListener('DOMContentLoaded', function() {
  updateLaunchBtn();

  var launchBtn = document.getElementById('launchBtn');
  if (!launchBtn) return;

  launchBtn.addEventListener('click', function() {
    if (!sidePanelClient) {
      var msg = document.getElementById('statusMsg');
      if (msg) {
        msg.textContent = 'Open this add-on inside Google Meet to use the shared stage.';
        setTimeout(function() { msg.textContent = ''; }, 4000);
      }
      return;
    }
    launchBtn.disabled = true;
    launchBtn.textContent = 'Opening...';
    // Use camelCase mainStageUrl as required by the Meet Add-ons SDK
    sidePanelClient.startActivity({ mainStageUrl: MAIN_STAGE_URL })
      .then(function() {
        launchBtn.textContent = '\u2705 Shared Stage Open';
        console.log('[DiceRoller] startActivity succeeded');
        setTimeout(function() {
          launchBtn.disabled = false;
          launchBtn.textContent = '\uD83D\uDCCB Open Shared Stage';
        }, 5000);
      })
      .catch(function(e) {
        console.warn('[DiceRoller] startActivity failed:', e.message);
        launchBtn.disabled = false;
        launchBtn.textContent = '\uD83D\uDCCB Open Shared Stage';
        var msg = document.getElementById('statusMsg');
        if (msg) {
          msg.textContent = 'Could not open shared stage: ' + e.message;
          setTimeout(function() { msg.textContent = ''; }, 5000);
        }
      });
  });
});
