/**
 * main-stage.js
 * Meet add-on main stage: listens to Firebase Realtime Database and shows shared rolls.
 */

const CLOUD_PROJECT_NUMBER = '183167958875';

const firebaseConfig = {
  apiKey: "AIzaSyCcydiLjfC48SRKEeaqbgvsOYqlqBDB1Zo",
  authDomain: "meet-dice-roller-4508d.firebaseapp.com",
  databaseURL: "https://meet-dice-roller-4508d-default-rtdb.firebaseio.com",
  projectId: "meet-dice-roller-4508d",
  storageBucket: "meet-dice-roller-4508d.firebasestorage.app",
  messagingSenderId: "13711318374",
  appId: "1:13711318374:web:87e12390c0a81b5a71fca7"
};

let meetingId = 'default-room';
let knownKeys = new Set();

// Initialize Firebase and start listening
import('https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js').then(({ initializeApp }) => {
  import('https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js').then(({ getDatabase, ref, onChildAdded, query, limitToLast }) => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    startListening(db, ref, onChildAdded, query, limitToLast);
  });
});

async function getSessionMeetingId() {
  try {
    const session = await window.meet.addon.createAddonSession({
      cloudProjectNumber: CLOUD_PROJECT_NUMBER,
    });
    const info = await session.getMeetingInfo();
    if (info && info.meeting && info.meeting.meetingCode) {
      return info.meeting.meetingCode.replace(/-/g, '');
    }
  } catch (e) {
    console.warn('Could not get meeting info', e);
  }
  return 'default-room';
}

function startListening(db, ref, onChildAdded, query, limitToLast) {
  getSessionMeetingId().then(id => {
    meetingId = id;
    document.getElementById('meeting-id').textContent = meetingId;

    const rollsRef = query(ref(db, 'rolls/' + meetingId), limitToLast(50));

    onChildAdded(rollsRef, (snapshot) => {
      const key = snapshot.key;
      if (knownKeys.has(key)) return;
      knownKeys.add(key);

      const data = snapshot.val();
      if (data && data.text) {
        addRollToDisplay(data.text, data.timestamp);
      }
    });
  });
}

function addRollToDisplay(text, timestamp) {
  const list = document.getElementById('roll-list');
  const li = document.createElement('li');
  li.className = 'roll-entry';
  const time = timestamp ? new Date(timestamp).toLocaleTimeString() : '';
  li.innerHTML = `<span class="roll-time">${time}</span> <span class="roll-text">${text}</span>`;
  list.insertBefore(li, list.firstChild);

  // Keep only last 30 entries
  while (list.children.length > 30) {
    list.removeChild(list.lastChild);
  }

  // Flash animation
  li.classList.add('new-roll');
  setTimeout(() => li.classList.remove('new-roll'), 2000);
}

document.addEventListener('DOMContentLoaded', () => {
  // Meeting id display placeholder
  const mid = document.getElementById('meeting-id');
  if (mid) mid.textContent = 'connecting...';
});
