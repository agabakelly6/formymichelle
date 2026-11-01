/* =========================================================
   To My Michelle: stages 1 to 3
   1) Countdown to 11 Nov 2026 (East Africa Time, UTC+3)
   2) Screen navigation (with browser Back support)
   3) Envelope opening animation
   4) Doors: Kampala-date unlock logic + door pages
   5) Scroll reveals + Day 1 photo handling
   ========================================================= */
(function () {
  'use strict';

  function pad(n) { return String(n).padStart(2, '0'); }

  /* ---------- 1. Countdown ---------- */
  // Midnight at the start of 11 November 2026 in Kampala (+03:00)
  var TARGET = new Date('2026-11-11T00:00:00+03:00').getTime();

  var els = {
    days:    document.getElementById('cd-days'),
    hours:   document.getElementById('cd-hours'),
    minutes: document.getElementById('cd-minutes'),
    seconds: document.getElementById('cd-seconds'),
    wrap:    document.getElementById('countdown-wrap'),
    note:    document.getElementById('birthday-note')
  };
  var timerId = null;

  function tick() {
    var diff = TARGET - Date.now();

    // Birthday has arrived: swap countdown for the birthday message
    if (diff <= 0) {
      els.wrap.hidden = true;
      els.note.hidden = false;
      clearInterval(timerId);
      return;
    }

    var total = Math.floor(diff / 1000);
    els.days.textContent    = pad(Math.floor(total / 86400));
    els.hours.textContent   = pad(Math.floor((total % 86400) / 3600));
    els.minutes.textContent = pad(Math.floor((total % 3600) / 60));
    els.seconds.textContent = pad(total % 60);
  }

  tick();
  timerId = setInterval(tick, 1000);

  /* ---------- 2. Screen navigation ---------- */
  var screens = {
    welcome:   document.getElementById('welcome'),
    envelope:  document.getElementById('envelope-screen'),
    letter:    document.getElementById('letter-screen'),
    dashboard: document.getElementById('dashboard-screen'),
    door1:     document.getElementById('door1-screen'),
    door2:     document.getElementById('door2-screen')
  };
  var current = 'welcome';
  var observers = {};        // one scroll-reveal observer per screen
  var lastDoorBtn = null;    // so we can return focus to the door she opened

  function isDoorScreen(name) { return name.indexOf('door') === 0; }

  // Fade out the current screen, fade in the next, then move focus to a target element.
  // Door pages and the dashboard keep their scroll position so she never loses her place.
  function goTo(name, focusEl) {
    if (name === current || !screens[name]) { return; }
    var from = screens[current];
    var to   = screens[name];

    from.classList.remove('is-active');
    from.setAttribute('aria-hidden', 'true');
    from.inert = true;

    if (name === 'letter') { to.scrollTop = 0; }
    to.classList.add('is-active');
    to.removeAttribute('aria-hidden');
    to.inert = false;
    current = name;

    observeReveals(name);
    if (focusEl) {
      setTimeout(function () { focusEl.focus({ preventScroll: true }); }, 500);
    }
  }

  // History helpers (wrapped: some browsers restrict these on file:// pages)
  function histReplace(name) { try { history.replaceState({ s: name }, ''); } catch (e) {} }
  function histPush(name)    { try { history.pushState({ s: name }, ''); }    catch (e) {} }

  var enterBtn    = document.getElementById('enter-btn');
  var openBtn     = document.getElementById('open-btn');
  var continueBtn = document.getElementById('continue-btn');
  var envelope    = document.getElementById('envelope');

  // Welcome → Envelope
  enterBtn.addEventListener('click', function () { goTo('envelope', openBtn); });

  /* ---------- 3. Envelope → Letter ---------- */
  var opened = false;

  openBtn.addEventListener('click', function () {
    if (opened) { return; }          // guard against double taps
    opened = true;
    openBtn.disabled = true;

    envelope.classList.add('open');                                         // flap lifts, letter slides up
    setTimeout(function () { envelope.classList.add('emerge'); }, 1300);    // letter rises clear of the envelope
    setTimeout(function () {                                                 // then the reading screen appears
      goTo('letter', document.getElementById('letter-heading'));
    }, 2100);
  });

  /* ---------- Letter → Dashboard ---------- */
  continueBtn.addEventListener('click', function () {
    refreshDoors();
    goTo('dashboard', document.getElementById('dash-heading'));
    histReplace('dashboard');
  });

  /* ---------- 4. Doors ---------- */
  // One entry per door. `date` is the Kampala calendar day it unlocks (midnight, UTC+3).
  // `screen` is the id used in `screens` above; leave it null until that door's page exists.
  // To add Door 3: set screen: 'door3' here, add a #door3-screen section in index.html,
  // and add `door3: document.getElementById('door3-screen')` to `screens`.
  var DOORS = [
    { n: 1,  date: '2026-11-01', screen: 'door1' },
    { n: 2,  date: '2026-11-02', screen: 'door2' },
    { n: 3,  date: '2026-11-03', screen: null },
    { n: 4,  date: '2026-11-04', screen: null },
    { n: 5,  date: '2026-11-05', screen: null },
    { n: 6,  date: '2026-11-06', screen: null },
    { n: 7,  date: '2026-11-07', screen: null },
    { n: 8,  date: '2026-11-08', screen: null },
    { n: 9,  date: '2026-11-09', screen: null },
    { n: 10, date: '2026-11-10', screen: null },
    { n: 11, date: '2026-11-11', screen: null }
  ];
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // Today's date in Kampala as 'YYYY-MM-DD'. Kampala is a fixed UTC+3 (no daylight saving),
  // so shifting the clock by 3 hours gives the Kampala date whatever the device timezone is.
  function kampalaToday() {
    return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
  }
  function isUnlocked(door) { return kampalaToday() >= door.date; }   // ISO dates compare correctly as text
  function daysUntil(door) {
    return Math.round((Date.parse(door.date + 'T00:00:00Z') - Date.parse(kampalaToday() + 'T00:00:00Z')) / 86400000);
  }
  function prettyDate(iso) {
    var p = iso.split('-');
    return MONTHS[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10);
  }
  function getDoor(n) { return DOORS[n - 1]; }

  var doorButtons = document.querySelectorAll('.door');
  var doorList = document.querySelector('.doors');
  var doorMsg  = document.getElementById('door-msg');
  var msgTimer = null;

  // Apply locked / open styling and accessible labels to every door
  function refreshDoors() {
    doorButtons.forEach(function (btn) {
      var door = getDoor(parseInt(btn.getAttribute('data-door'), 10));
      var open = isUnlocked(door);
      btn.classList.toggle('is-open', open);
      btn.classList.toggle('is-locked', !open);
      btn.setAttribute('aria-disabled', open ? 'false' : 'true');
      btn.setAttribute('aria-label', open ? 'Door ' + door.n + ', open' : 'Door ' + door.n + ', locked until ' + prettyDate(door.date));
    });
  }

  function showDoorMessage(text) {
    doorMsg.textContent = text;
    doorMsg.hidden = false;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(function () { doorMsg.hidden = true; }, 6000);
  }

  // One delegated listener for all doors
  doorList.addEventListener('click', function (e) {
    var btn = e.target.closest('.door');
    if (!btn) { return; }
    var door = getDoor(parseInt(btn.getAttribute('data-door'), 10));

    if (!isUnlocked(door)) {
      var d = daysUntil(door);
      showDoorMessage(d === 1
        ? 'Door ' + door.n + ' opens tomorrow, at midnight Kampala time. Almost there, My Michelle ❤️'
        : 'Door ' + door.n + ' opens on ' + prettyDate(door.date) + ', at midnight Kampala time. A little patience, My Michelle ❤️');
      return;
    }
    if (!door.screen || !screens[door.screen]) {
      showDoorMessage('This door is still being prepared with love. Check back soon ❤️');
      return;
    }
    doorMsg.hidden = true;
    lastDoorBtn = btn;
    goTo(door.screen, screens[door.screen].querySelector('h2'));
    histPush(door.screen);
  });

  // Re-check every 30s (and when the tab wakes up) so midnight unlocks happen without a refresh
  setInterval(refreshDoors, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { refreshDoors(); } });
  refreshDoors();

  /* ---------- Back to the dashboard ---------- */
  function backToDashboard() {
    if (history.state && history.state.s && isDoorScreen(history.state.s)) {
      history.back();                       // popstate handler below does the rest
    } else {
      goTo('dashboard', lastDoorBtn);
    }
  }
  document.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', backToDashboard); });

  // Phone Back button / swipe: from a door page go to the dashboard, not out of the site
  window.addEventListener('popstate', function (e) {
    if (current !== 'dashboard' && !isDoorScreen(current)) { return; }
    var s = e.state && e.state.s;
    if (s && screens[s] && (s === 'dashboard' || isDoorScreen(s))) {
      goTo(s, s === 'dashboard' ? lastDoorBtn : null);
    } else if (isDoorScreen(current)) {
      goTo('dashboard', lastDoorBtn);
    }
  });

  /* ---------- 5a. Scroll reveals ---------- */
  // Elements with .reveal fade in once as they scroll into view, then stay visible.
  function observeReveals(name) {
    var screen = screens[name];
    var items = screen.querySelectorAll('.reveal:not(.seen)');
    if (!items.length) { return; }
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('seen'); });
      return;
    }
    if (observers[name]) { observers[name].disconnect(); }
    observers[name] = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('seen'); obs.unobserve(en.target); }
      });
    }, { root: screen, threshold: 0.12 });
    items.forEach(function (el) { observers[name].observe(el); });
  }

  /* ---------- 5b. Day 1 photo ---------- */
  // The page works with or without assets/day1.jpg. The photo fades in only once it has loaded.
  var frame = document.getElementById('day1-frame');
  var photo = frame.querySelector('img');
  photo.addEventListener('load',  function () { frame.classList.add('has-photo'); });
  photo.addEventListener('error', function () { frame.classList.remove('has-photo'); });
  if (photo.complete && photo.naturalWidth > 0) { frame.classList.add('has-photo'); }

  histReplace('welcome');
})();
