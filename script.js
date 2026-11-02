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
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function motionDelay(ms) { return prefersReducedMotion() ? 0 : ms; }
  function scrollToExperience(el, block) {
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: block });
  }

  /* ---------- 0. Private little welcome gate ---------- */
  var passwordGate = document.getElementById('password-gate');
  var passwordForm = document.getElementById('password-form');
  var passwordInput = document.getElementById('site-password');
  var passwordError = document.getElementById('password-error');
  var siteMain = document.querySelector('main');
  var SITE_CODE = '1111';

  passwordInput.focus();
  passwordForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (passwordInput.value !== SITE_CODE) {
      passwordInput.value = '';
      passwordInput.setAttribute('aria-invalid', 'true');
      passwordError.hidden = false;
      passwordInput.focus();
      return;
    }

    passwordInput.removeAttribute('aria-invalid');
    passwordError.hidden = true;
    siteMain.inert = false;
    passwordGate.classList.add('is-unlocked');
    passwordGate.setAttribute('aria-hidden', 'true');
    setTimeout(function () {
      passwordGate.hidden = true;
      document.getElementById('enter-btn').focus({ preventScroll: true });
    }, motionDelay(360));
  });

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
    door2:     document.getElementById('door2-screen'),
    door3:     document.getElementById('door3-screen'),
    door4:     document.getElementById('door4-screen'),
    note1:     document.getElementById('note1-screen'),
    note2:     document.getElementById('note2-screen'),
    note3:     document.getElementById('note3-screen'),
    door5:     document.getElementById('door5-screen'),
    mem1:      document.getElementById('mem1-screen'),
    mem2:      document.getElementById('mem2-screen'),
    mem3:      document.getElementById('mem3-screen'),
    mem4:      document.getElementById('mem4-screen'),
    door6:     document.getElementById('door6-screen'),
    gift1:     document.getElementById('gift1-screen'),
    gift2:     document.getElementById('gift2-screen'),
    gift3:     document.getElementById('gift3-screen'),
    gift4:     document.getElementById('gift4-screen'),
    gift5:     document.getElementById('gift5-screen')
  };
  var current = 'welcome';
  var observers = {};        // one scroll-reveal observer per screen
  var lastGiftBtn = null;    // the gift she last opened on Door 6
  var lastMemBtn = null;     // the memory card she last opened on Door 5
  var lastNoteBtn = null;    // the envelope she last opened on Door 4
  var lastDoorBtn = null;    // so we can return focus to the door she opened

  // 'door…' pages and the Door 4 letter pages ('note…') are sub-screens of the dashboard
  function isDoorScreen(name) { return name.indexOf('door') === 0 || name.indexOf('note') === 0 || name.indexOf('mem') === 0 || name.indexOf('gift') === 0; }

  // Fade out the current screen, fade in the next, then move focus to a target element.
  // Door pages and the dashboard keep their scroll position so she never loses her place.
  function goTo(name, focusEl) {
    if (name === current || !screens[name]) { return; }
    var from = screens[current];
    var to   = screens[name];

    from.classList.remove('is-active');
    from.setAttribute('aria-hidden', 'true');
    from.inert = true;

    if (name === 'letter' || name.indexOf('note') === 0 || name.indexOf('mem') === 0 || name.indexOf('gift') === 0) { to.scrollTop = 0; }
    to.classList.add('is-active');
    to.removeAttribute('aria-hidden');
    to.inert = false;
    current = name;
    document.body.setAttribute('data-mood', (name === 'welcome' || name === 'envelope' || name === 'letter') ? 'day' : 'dusk');

    observeReveals(name);
    if (name === 'door4') { setTimeout(function () { n4Sync(true); }, motionDelay(650)); }
    if (name === 'door6') { setTimeout(function () { g6Sync(true); }, motionDelay(650)); }   // reveal final note if all opened
    if (focusEl) {
      setTimeout(function () { focusEl.focus({ preventScroll: true }); }, motionDelay(420));
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
    setTimeout(function () { envelope.classList.add('emerge'); }, motionDelay(980));    // letter rises clear of the envelope
    setTimeout(function () {                                                 // then the reading screen appears
      goTo('letter', document.getElementById('letter-heading'));
    }, motionDelay(1630));
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
    { n: 3,  date: '2026-11-03', screen: 'door3' },
    { n: 4,  date: '2026-11-04', screen: 'door4' },
    { n: 5,  date: '2026-11-05', screen: 'door5' },
    { n: 6,  date: '2026-11-06', screen: 'door6' },
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
  // TESTING SWITCH: true opens every door so you can test. Set back to false before sending to Michelle!
  var TEST_MODE = false;

  function isUnlocked(door) { return TEST_MODE || kampalaToday() >= door.date; }   // ISO dates compare correctly as text
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
  var doorProgressLabel = document.getElementById('door-progress-label');
  var doorProgressTrack = document.querySelector('.door-progress-track');
  var doorProgressFill = document.getElementById('door-progress-fill');
  var msgTimer = null;

  // Apply locked / open styling and accessible labels to every door
  function refreshDoors() {
    var available = 0;
    doorButtons.forEach(function (btn) {
      var door = getDoor(parseInt(btn.getAttribute('data-door'), 10));
      var open = isUnlocked(door);
      if (open) { available += 1; }
      btn.classList.toggle('is-open', open);
      btn.classList.toggle('is-locked', !open);
      btn.setAttribute('aria-disabled', open ? 'false' : 'true');
      btn.setAttribute('aria-label', open ? 'Door ' + door.n + ', open' : 'Door ' + door.n + ', locked until ' + prettyDate(door.date));
    });
    var progressText = available + ' of ' + doorButtons.length + ' doors available';
    doorProgressLabel.textContent = progressText;
    doorProgressTrack.setAttribute('aria-valuenow', String(available));
    doorProgressTrack.setAttribute('aria-valuetext', progressText);
    doorProgressFill.style.width = (available / doorButtons.length * 100) + '%';
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
      goTo(s, s === 'dashboard' ? lastDoorBtn : (s === 'door4' ? lastNoteBtn : (s === 'door5' ? lastMemBtn : (s === 'door6' ? lastGiftBtn : null))));
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

  /* ---------- 5b. Photos (Day 1 and Door 3 cards) ---------- */
  // Every .photo-frame works with or without its image file. The photo fades in only once it has loaded.
  document.querySelectorAll('.photo-frame').forEach(function (frame) {
    var img = frame.querySelector('img');
    if (!img) { return; }
    img.addEventListener('load',  function () { frame.classList.add('has-photo'); });
    img.addEventListener('error', function () { frame.classList.remove('has-photo'); });
    if (img.complete && img.naturalWidth > 0) { frame.classList.add('has-photo'); }
  });

  /* ---------- 6. Door 3: adventures, wishes, envelope, saved answers ---------- */
  var D3_KEY = 'tmm_door3_v1';
  var ADV_TITLES = {
    dinner:  'Dinner, Then a Swim 🥂',
    driving: 'Your Turn Behind the Wheel 🚗',
    picnic:  'A Whole Day Just for Us 🌅'
  };
  var d3 = {
    advInputs: document.querySelectorAll('.adv-input'),
    wishes:   [document.getElementById('d3-wish1'), document.getElementById('d3-wish2'), document.getElementById('d3-wish3')],
    msg:      document.getElementById('d3-msg'),
    form:     document.getElementById('d3-form'),
    error:    document.getElementById('d3-error'),
    saveBtn:  document.getElementById('d3-save'),
    after:    document.getElementById('d3-after'),
    env:      document.getElementById('d3-envelope'),
    envHint:  document.getElementById('d3-env-hint'),
    final:    document.getElementById('d3-final'),
    share:    document.getElementById('d3-share'),
    summary:  document.getElementById('d3-summary'),
    copyBtn:  document.getElementById('d3-copy'),
    copyMsg:  document.getElementById('d3-copy-msg'),
    pop:      document.getElementById('d3-pop'),
    popText:  document.getElementById('d3-pop-text')
  };
  var d3Saving = false;

  // localStorage can be blocked (private mode, strict settings), so every call is guarded
  function d3Load() {
    try { var raw = localStorage.getItem(D3_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function d3Store(data) {
    try { localStorage.setItem(D3_KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
  }

  // Read what is currently on screen
  function d3Collect() {
    var adv = [];
    d3.advInputs.forEach(function (i) { if (i.checked) { adv.push(i.value); } });
    return {
      adv: adv,
      wishes: d3.wishes.map(function (w) { return w.value.trim(); }),
      msg: d3.msg.value.trim()
    };
  }

  // The plain-text wishlist she can copy and send
  function d3BuildSummary(data) {
    var day = data.savedOn || kampalaToday();
    var lines = ['Our Adventure Wishlist ❤️', 'From Michelle, saved ' + prettyDate(day) + ', ' + day.slice(0, 4), '', 'ADVENTURES I’D LOVE:'];
    if (data.adv.length) {
      data.adv.forEach(function (id) { lines.push('• ' + ADV_TITLES[id]); });
    } else {
      lines.push('• (none picked this time)');
    }
    lines.push('', 'MY THREE WISHES:');
    data.wishes.forEach(function (w, i) { lines.push((i + 1) + '. ' + (w || '(left blank)')); });
    lines.push('', 'MY LITTLE MESSAGE:', data.msg || '(nothing extra this time)');
    return lines.join('\n');
  }

  function d3Fill(data) {
    d3.advInputs.forEach(function (i) { i.checked = data.adv.indexOf(i.value) !== -1; });
    d3.wishes.forEach(function (w, i) { w.value = data.wishes[i] || ''; });
    d3.msg.value = data.msg || '';
    d3.summary.value = d3BuildSummary(data);
  }

  // Open the envelope; `instant` skips the animation (used when restoring saved answers)
  function d3OpenEnvelope(instant) {
    if (d3.env.classList.contains('open')) { return; }
    d3.env.classList.add('open');
    d3.env.setAttribute('aria-expanded', 'true');
    d3.env.setAttribute('aria-label', 'Envelope opened');
    d3.envHint.hidden = true;
    var data = d3Load();
    if (data && !data.opened) { data.opened = true; d3Store(data); }
    if (instant) { d3.final.hidden = false; d3.share.hidden = false; return; }
    setTimeout(function () {
      d3.final.hidden = false;
      d3.share.hidden = false;
      scrollToExperience(d3.final, 'start');
    }, motionDelay(1100));
  }

  d3.env.addEventListener('click', function () { d3OpenEnvelope(false); });
  d3.env.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); d3OpenEnvelope(false); }
  });

  // Hide the validation message as soon as she changes anything
  function d3HideError() { d3.error.hidden = true; }
  d3.form.addEventListener('input', d3HideError);
  document.getElementById('d3-adventures').addEventListener('change', d3HideError);

  d3.saveBtn.addEventListener('click', function () {
    if (d3Saving) { return; }
    var data = d3Collect();

    // Need at least one adventure or one wish
    if (!data.adv.length && !data.wishes.some(Boolean)) {
      d3.error.hidden = false;
      return;
    }
    d3.error.hidden = true;

    var prev = d3Load();
    var firstTime = d3.after.hidden;
    data.savedOn = kampalaToday();
    data.opened = !!(prev && prev.opened);
    var stored = d3Store(data);              // her entries stay on screen either way
    d3.summary.value = d3BuildSummary(data);

    d3Saving = true;
    d3.popText.textContent = stored ? 'Saved, My Michelle' : 'Your wishlist is ready, My Michelle';
    d3.pop.classList.add('show');
    setTimeout(function () {
      d3.pop.classList.remove('show');
      d3.after.hidden = false;
      if (data.opened) { d3.env.classList.remove('open'); d3.env.classList.add('open'); d3.final.hidden = false; d3.share.hidden = false; d3.envHint.hidden = true; }
      d3.after.scrollIntoView({ behavior: 'smooth', block: 'start' });
      d3Saving = false;
    }, motionDelay(2000));
  });

  // Copy the wishlist (clipboard first, then a fallback, then manual copy from the visible box)
  function d3FallbackCopy() {
    try {
      d3.summary.focus(); d3.summary.select(); d3.summary.setSelectionRange(0, 99999);
      return document.execCommand('copy');
    } catch (e) { return false; }
  }
  function d3CopyDone(ok) {
    d3.copyMsg.textContent = ok
      ? 'Copied ❤️ Now paste it into a message and send it to me.'
      : 'I couldn’t copy it automatically. Tap the box above, select all, copy it, and send it to me ❤️';
    d3.copyMsg.hidden = false;
  }
  d3.copyBtn.addEventListener('click', function () {
    var text = d3.summary.value;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { d3CopyDone(true); }, function () { d3CopyDone(d3FallbackCopy()); });
    } else {
      d3CopyDone(d3FallbackCopy());
    }
  });
  d3.summary.addEventListener('focus', function () { d3.summary.select(); });

  // Restore saved answers (same browser): everything she wrote is still here
  (function d3Restore() {
    var data = d3Load();
    if (!data || !data.adv || !data.wishes) { return; }
    d3Fill(data);
    d3.after.hidden = false;
    if (data.opened) { d3OpenEnvelope(true); }
  })();

  /* ---------- 7. Door 4: three envelopes, three letters ---------- */
  var N4_KEY = 'tmm_door4_v1';
  var n4Envs = document.querySelectorAll('.n4-env');
  var n4Progress = document.getElementById('n4-progress');
  var n4Final = document.getElementById('n4-final');
  var n4Busy = false;                         // blocks double taps during the opening animation

  // Which notes (1 to 3) she has opened. Kept in memory too, so a blocked localStorage never breaks anything.
  var n4Read = (function () {
    try {
      var arr = JSON.parse(localStorage.getItem(N4_KEY));
      return Array.isArray(arr) ? arr.filter(function (n) { return n === 1 || n === 2 || n === 3; }) : [];
    } catch (e) { return []; }
  })();
  function n4Store() { try { localStorage.setItem(N4_KEY, JSON.stringify(n4Read)); } catch (e) {} }

  // Update the opened badges, the progress line and (once all three are read) the final message
  function n4Sync(animate) {
    n4Envs.forEach(function (btn) {
      btn.classList.toggle('is-read', n4Read.indexOf(parseInt(btn.getAttribute('data-note'), 10)) !== -1);
    });
    var count = n4Read.length;
    n4Progress.textContent = count + ' of 3 notes opened';
    n4Progress.classList.toggle('all', count === 3);
    if (count === 3 && n4Final.hidden) {
      n4Final.hidden = false;
      if (animate) { scrollToExperience(n4Final, 'center'); }
    }
  }

  // Tap an envelope: it opens, then the dedicated letter page fades in
  document.getElementById('n4-envs').addEventListener('click', function (e) {
    var btn = e.target.closest('.n4-env');
    if (!btn || n4Busy) { return; }
    n4Busy = true;
    var id = parseInt(btn.getAttribute('data-note'), 10);
    lastNoteBtn = btn;
    btn.classList.add('is-opening');
    if (n4Read.indexOf(id) === -1) { n4Read.push(id); n4Store(); }
    setTimeout(function () {
      goTo('note' + id, document.getElementById('note' + id + '-heading'));
      histPush('note' + id);
      btn.classList.remove('is-opening');
      n4Sync(false);          // badge and progress update behind the letter; final message waits until she is back
      setTimeout(function () { n4Busy = false; }, motionDelay(700));
    }, motionDelay(1200));
  });

  // "Back to the envelopes" (top and bottom of every letter)
  function n4Back() {
    if (history.state && history.state.s && history.state.s.indexOf('note') === 0) { history.back(); }
    else { goTo('door4', lastNoteBtn); }
  }
  document.querySelectorAll('[data-back-env]').forEach(function (b) { b.addEventListener('click', n4Back); });

  n4Sync(false);

  /* ---------- 8. Door 5: four memories ---------- */
  var m5Busy = false;     // blocks double taps so the view is only opened once

  document.getElementById('m5-cards').addEventListener('click', function (e) {
    var card = e.target.closest('.m5-card');
    if (!card || m5Busy) { return; }
    m5Busy = true;
    var id = card.getAttribute('data-mem');
    lastMemBtn = card;
    goTo('mem' + id, document.getElementById('mem' + id + '-heading'));
    histPush('mem' + id);
    setTimeout(function () { m5Busy = false; }, motionDelay(800));
  });

  // "Back to our memories" (top and bottom of every memory page)
  function m5Back() {
    if (history.state && history.state.s && history.state.s.indexOf('mem') === 0) { history.back(); }
    else { goTo('door5', lastMemBtn); }
  }
  document.querySelectorAll('[data-back-mem]').forEach(function (b) { b.addEventListener('click', m5Back); });

  /* ---------- 9. Door 6: five gift boxes, five letters ---------- */
  var G6_KEY = 'tmm_door6_v1';
  var g6Gifts = document.querySelectorAll('.g6-gift');
  var g6Progress = document.getElementById('g6-progress');
  var g6Final = document.getElementById('g6-final');
  var g6Busy = false;                          // blocks double taps during the opening animation

  // Which gifts (1 to 5) she has unwrapped. Also kept in memory, so blocked storage never breaks anything.
  var g6Read = (function () {
    try {
      var arr = JSON.parse(localStorage.getItem(G6_KEY));
      return Array.isArray(arr) ? arr.filter(function (n) { return n >= 1 && n <= 5; }) : [];
    } catch (e) { return []; }
  })();
  function g6Store() { try { localStorage.setItem(G6_KEY, JSON.stringify(g6Read)); } catch (e) {} }

  // Update the unwrapped badges, the progress line and (once all five are read) the final message
  function g6Sync(animate) {
    g6Gifts.forEach(function (btn) {
      btn.classList.toggle('is-read', g6Read.indexOf(parseInt(btn.getAttribute('data-gift'), 10)) !== -1);
    });
    var count = g6Read.length;
    g6Progress.textContent = count + ' of 5 gifts unwrapped';
    g6Progress.classList.toggle('all', count === 5);
    if (count === 5 && g6Final.hidden) {
      g6Final.hidden = false;
      if (animate) { scrollToExperience(g6Final, 'center'); }
    }
  }

  // Tap a gift: the lid lifts, then its own letter page fades in (Gift 05 takes a little longer)
  document.getElementById('g6-gifts').addEventListener('click', function (e) {
    var btn = e.target.closest('.g6-gift');
    if (!btn || g6Busy) { return; }
    g6Busy = true;
    var id = parseInt(btn.getAttribute('data-gift'), 10);
    lastGiftBtn = btn;
    btn.classList.add('is-opening');
    if (g6Read.indexOf(id) === -1) { g6Read.push(id); g6Store(); }
    setTimeout(function () {
      goTo('gift' + id, document.getElementById('gift' + id + '-heading'));
      histPush('gift' + id);
      btn.classList.remove('is-opening');
      g6Sync(false);          // badge and progress update behind the letter; final message waits until she is back
      setTimeout(function () { g6Busy = false; }, motionDelay(700));
    }, motionDelay(id === 5 ? 1700 : 1100));
  });

  // "Back to my gifts" (top and bottom of every letter)
  function g6Back() {
    if (history.state && history.state.s && history.state.s.indexOf('gift') === 0) { history.back(); }
    else { goTo('door6', lastGiftBtn); }
  }
  document.querySelectorAll('[data-back-gift]').forEach(function (b) { b.addEventListener('click', g6Back); });

  g6Sync(false);

  histReplace('welcome');
})();
