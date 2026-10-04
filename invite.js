// ============================================================
// THE INVITATION — "Two Suns"
//
// Ported from the Claude Design component of the same name. One
// value — t, from 0 to 1 — drives everything:
//
//   t  ->  hour of the weekend   (CLOCK)
//   hour -> which event is on    (EVENTS' hIn / hOut)
//   event -> the colour of the field   (FIELD)
//
// Everything else follows: each event holds its own flat colour
// for its hours and blends into the next in the gap between them,
// the ink flips from deep red to cream as the field darkens, cards
// fade in over the hours they actually happen, and the rail fills
// as the weekend passes.
//
// The CLOCK, FIELD and EVENTS numbers are the design's own ("Two
// Suns - Solid Colors"), carried over with its default colour
// picks baked in. Content (names, dress codes, the card
// transcripts) lives in invite.html; only timing and artwork are
// here.
// ============================================================

(function () {
  'use strict';

  var root = document.getElementById('invite');
  if (!root) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // t -> hour. Hours run past 24 into Sunday (24 = midnight, 42.5 = 6:30 PM Sunday).
  var CLOCK = [
    [0, 12], [0.08, 15.5], [0.22, 17.5], [0.365, 19.5], [0.47, 24],
    [0.55, 29], [0.665, 33], [0.86, 41], [1.0, 50]
  ];

  // The field behind the cards: one flat colour per event, no sun, moon,
  // stars or clouds. The opening sits on linen; the close returns to the
  // original night sky, the one place a gradient survives.
  var FIELD = {
    open: [238, 228, 210],   // linen
    end: { top: [14, 17, 30], bottom: [24, 22, 33] }
  };

  // Artwork ratios are the images' true dimensions, so nothing is stretched.
  var EVENTS = [
    { id: 'act1', t0: 0.01, t1: 0.15, hIn: 12.4, hOut: 17.5, ratio: 2000 / 1400,
      color: [40, 127, 63],    // sage
      img: 'assets/invite/mapusa.jpg', back: 'assets/invite/mapusa_back.jpg' },
    { id: 'act2', t0: 0.29, t1: 0.44, hIn: 19, hOut: 23, ratio: 2000 / 1404,
      color: [51, 0, 0],       // #330000
      img: 'assets/invite/aiburo.jpg', back: 'assets/invite/aiburo_back.jpg' },
    { id: 'wedding', t0: 0.59, t1: 0.74, hIn: 31, hOut: 37, ratio: 2000 / 1404,
      color: [56, 24, 52],     // aubergine
      img: 'assets/invite/wedding.jpg', back: 'assets/invite/wedding_back.jpg' },
    { id: 'party', t0: 0.79, t1: 0.93, hIn: 40, hOut: 48, ratio: 2000 / 1384,
      color: [27, 3, 3],       // coffee bean
      img: 'assets/invite/sundowner.jpg', back: 'assets/invite/sundowner_back.jpg' }
  ];

  // The schedule card comes in two shapes: wide for landscape screens,
  // tall for phones held upright, where the wide card's text is too small.
  var GLANCE = {
    wide: { img: 'assets/invite/schedule.jpg', ratio: 2000 / 1404, fill: 0.78 },
    tall: { img: 'assets/invite/schedule_portrait.jpg', ratio: 1000 / 2147, fill: 0.82 }
  };
  var ACCENT = '#d8c08a';

  var state = { t: 0, dragging: false, started: false, moved: 0, flipped: {}, glance: false };

  // ----------------------------------------------------------
  // Elements
  // ----------------------------------------------------------

  var sky = root.querySelector('.invite-sky');
  var dayLabel = document.getElementById('inviteDay');
  var timeLabel = document.getElementById('inviteTime');
  var clock = root.querySelector('.invite-clock');
  var rail = root.querySelector('.invite-rail');
  var railFill = root.querySelector('.invite-rail-fill');
  var intro = root.querySelector('.invite-intro');
  var introInner = root.querySelector('.invite-intro-inner');
  var outro = root.querySelector('.invite-outro');
  var glance = root.querySelector('.invite-glance');
  var glanceCard = root.querySelector('.invite-glance-card');
  var menu = document.getElementById('mobileMenu');

  EVENTS.forEach(function (v) {
    v.el = root.querySelector('[data-event="' + v.id + '"]');
    v.card = v.el.querySelector('.invite-card');
    v.flipper = v.el.querySelector('.invite-flipper');
    v.front = v.el.querySelector('.invite-face--front');
    v.backEl = v.el.querySelector('.invite-face--back');
    v.hint = v.el.querySelector('.invite-fliphint');
    v.text = v.el.querySelector('.invite-text');
    v.dot = rail.querySelector('[data-dot="' + v.id + '"]');
    v.loaded = false;
  });

  // ----------------------------------------------------------
  // Maths
  // ----------------------------------------------------------

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function hourAt(t) {
    for (var i = 0; i < CLOCK.length - 1; i++) {
      if (t <= CLOCK[i + 1][0]) {
        var p = (t - CLOCK[i][0]) / (CLOCK[i + 1][0] - CLOCK[i][0]);
        return CLOCK[i][1] + (CLOCK[i + 1][1] - CLOCK[i][1]) * clamp(p, 0, 1);
      }
    }
    return CLOCK[CLOCK.length - 1][1];
  }

  function tAtHour(H) {
    for (var i = 0; i < CLOCK.length - 1; i++) {
      if (H <= CLOCK[i + 1][1]) {
        var p = (H - CLOCK[i][1]) / (CLOCK[i + 1][1] - CLOCK[i][1]);
        return CLOCK[i][0] + (CLOCK[i + 1][0] - CLOCK[i][0]) * clamp(p, 0, 1);
      }
    }
    return 1;
  }

  // Each event holds its colour from hIn to hOut and blends to the next
  // through the gap between them. The last one lets go a little early so
  // the night sky is fully in before the closing words arrive.
  var fieldKeys = (function () {
    var flat = function (c) { return { top: c, bottom: c }; };
    var keys = [[0, flat(FIELD.open)]];
    EVENTS.forEach(function (v, i) {
      var last = i === EVENTS.length - 1;
      var tOut = tAtHour(v.hOut);
      keys.push([tAtHour(v.hIn), flat(v.color)]);
      keys.push([last ? Math.min(tOut, 0.935) : tOut, flat(v.color)]);
    });
    keys.push([0.965, FIELD.end], [1, FIELD.end]);
    return keys;
  })();

  function fieldAt(t) {
    for (var i = 0; i < fieldKeys.length - 1; i++) {
      if (t <= fieldKeys[i + 1][0]) {
        var span = fieldKeys[i + 1][0] - fieldKeys[i][0];
        var k = span > 0 ? clamp((t - fieldKeys[i][0]) / span, 0, 1) : 1;
        k = k * k * (3 - 2 * k);
        var a = fieldKeys[i][1], b = fieldKeys[i + 1][1];
        return { top: mix(a.top, b.top, k), bottom: mix(a.bottom, b.bottom, k) };
      }
    }
    return FIELD.end;
  }

  function mix(a, b, p) {
    return a.map(function (v, k) { return Math.round(v + (b[k] - v) * p); });
  }

  function rgb(c) { return 'rgb(' + c.join(',') + ')'; }

  // ----------------------------------------------------------
  // State
  // ----------------------------------------------------------

  var frame = null;

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(function () { frame = null; render(); });
  }

  function set(t, mark) {
    state.t = clamp(t, 0, 1);
    if (mark && !state.started) {
      state.started = true;
      root.classList.add('has-started');
    }
    // the schedule card belongs to the very end; leaving the end closes it
    if (state.glance && state.t <= 0.955) state.glance = false;
    schedule();
  }

  var raf = null;

  function glide(target) {
    if (raf) cancelAnimationFrame(raf);
    if (reduceMotion) { set(target, true); return; }
    var from = state.t;
    var start = performance.now();
    var dur = 900 + Math.abs(target - from) * 700;
    var step = function (now) {
      var p = Math.min(1, (now - start) / dur);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      set(from + (target - from) * e, true);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  // A touch release: start at the finger's own speed (v0, in t per ms)
  // and ease to rest on the target. Constant deceleration takes 2D/v0 ms;
  // the time is held to a sensible range and the curve is a Hermite ease
  // whose opening slope is the finger's, capped so it never overshoots.
  function glideFrom(target, v0) {
    if (raf) cancelAnimationFrame(raf);
    var from = state.t;
    var dist = target - from;
    if (reduceMotion || Math.abs(dist) < 0.0005) { set(target, true); return; }
    var speed = Math.max(0, v0 * (dist > 0 ? 1 : -1));
    var dur = speed > 0 ? 2 * Math.abs(dist) / speed : 0;
    if (!(dur >= 260)) dur = speed > 0 ? 260 : 320 + Math.abs(dist) * 1500;
    dur = Math.min(dur, 1100);
    var m0 = Math.min(speed * dur / Math.abs(dist), 3);
    var start = performance.now();
    var step = function (now) {
      var p = Math.min(1, (now - start) / dur);
      var e = (-2 * p * p * p + 3 * p * p) + m0 * (p * p * p - 2 * p * p + p);
      set(from + dist * e, true);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  // Artwork is only fetched as its card approaches, so opening the
  // invitation costs one image, not nine.
  function ensureImages(v) {
    if (v.loaded) return;
    v.loaded = true;
    v.front.style.backgroundImage = 'url(' + v.img + ')';
    if (v.back) v.backEl.style.backgroundImage = 'url(' + v.back + ')';
  }

  var glanceShown = null;

  function ensureGlance(g) {
    if (glanceShown === g) return;
    glanceShown = g;
    glanceCard.style.backgroundImage = 'url(' + g.img + ')';
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  function render() {
    var t = state.t;
    var H = hourAt(t);
    var hd = ((H % 24) + 24) % 24;
    var day2 = H >= 24;

    // the sun no longer paints the sky, but it still deepens the card shadows at night
    var RISE = 6.6, SET = 18.3;
    var sunAlt = Math.sin(Math.PI * (hd - RISE) / (SET - RISE));
    var night = clamp(-sunAlt * 3.2, 0, 1);
    var s = fieldAt(t);

    // Ink follows the field: solid deep red on light colours, cream on dark.
    var lum = (0.299 * s.bottom[0] + 0.587 * s.bottom[1] + 0.114 * s.bottom[2]) / 255;
    var bright = lum > 0.56;
    var ink = bright ? '#751015' : '#f2e6cc';
    var inkSoft = bright ? '#751015' : 'rgba(242,230,204,0.66)';
    var rule = bright ? 'rgba(117,16,21,0.4)' : 'rgba(242,230,204,0.22)';
    var ruleStrong = bright ? 'rgba(117,16,21,0.4)' : 'rgba(242,230,204,0.45)';
    var dotRing = bright ? 'rgba(117,16,21,0.85)' : 'rgba(242,230,204,0.55)';
    root.classList.toggle('is-light', bright);

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var narrow = vw < 620;

    var railRight = Math.min(46, Math.max(18, vw * 0.03));

    // Labels shrink by wrapping onto 2 then 3 lines before they give up
    // and become dots; below that the rail disappears entirely.
    var tiers = [190, 112, 78];
    var labelWidth = 0, railMode = 'none', sideGutter = 20;
    for (var i = 0; i < tiers.length; i++) {
      var gutter = railRight + tiers[i] + 25;
      if (vw - 2 * gutter >= 560) {
        labelWidth = tiers[i];
        railMode = 'labels';
        sideGutter = gutter;
        break;
      }
    }
    var dotGutter = railRight + 24;
    if (railMode === 'none' && vw - 2 * dotGutter >= 300) {
      railMode = 'dots';
      sideGutter = dotGutter;
    }

    root.style.setProperty('--inv-ink', ink);
    root.style.setProperty('--inv-ink-soft', inkSoft);
    root.style.setProperty('--inv-rule', rule);
    root.style.setProperty('--inv-rule-strong', ruleStrong);
    root.style.setProperty('--inv-dot-ring', dotRing);
    root.style.setProperty('--inv-accent', ACCENT);
    root.style.setProperty('--inv-gutter', sideGutter + 'px');
    root.style.setProperty('--inv-rail-right', railRight + 'px');
    root.style.setProperty('--inv-card-shadow', (0.3 + night * 0.28).toFixed(3));

    // the menu button rides the same palette
    document.documentElement.style.setProperty('--inv-ink', ink);
    document.documentElement.style.setProperty('--inv-rule-strong', ruleStrong);
    document.documentElement.style.setProperty(
      '--inv-chrome-bg',
      bright ? 'rgba(249,248,218,0.36)' : 'rgba(20,10,12,0.34)'
    );

    root.style.background = rgb(s.bottom);
    sky.style.background = 'linear-gradient(' + rgb(s.top) + ', ' + rgb(s.bottom) + ')';

    var hh = Math.floor(hd);
    var mm = Math.floor((hd % 1) * 60);
    dayLabel.textContent = day2 ? 'Sunday 22 November' : 'Saturday 21 November';
    timeLabel.textContent = (((hh + 11) % 12) + 1) + ':' + String(mm).padStart(2, '0') +
      ' ' + (hh >= 12 ? 'PM' : 'AM');
    // the clock waits for the weekend to begin and bows out before the close
    clock.style.opacity = (1 - clamp((t - 0.955) / 0.028, 0, 1)) *
      (state.started ? clamp((t - 0.004) / 0.02, 0, 1) : 0);

    // ---- cards ----
    EVENTS.forEach(function (v, idx) {
      var mid = (v.t0 + v.t1) / 2;
      var half = (v.t1 - v.t0) / 2;
      var d = (t - mid) / (half + 0.075);
      var edgeFade = Math.max(
        clamp((0.008 - t) / 0.008, 0, 1),
        clamp((t - 0.948) / 0.03, 0, 1)
      );

      // One card hands off to the next: the gap between them is split evenly,
      // so the outgoing card lands on zero exactly where the incoming one starts.
      var prev = EVENTS[idx - 1], next = EVENTS[idx + 1];
      var tIn = tAtHour(v.hIn), tOut = tAtHour(v.hOut);
      var inFrom = prev ? (tAtHour(prev.hOut) + tIn) / 2 : 0.004;
      var outTo = next ? (tOut + tAtHour(next.hIn)) / 2 : 0.972;
      var win = Math.min(
        clamp((t - inFrom) / Math.max(0.02, tIn - inFrom), 0, 1),
        1 - clamp((t - tOut) / Math.max(0.02, outTo - tOut), 0, 1)
      );
      var vis = state.started ? win * (1 - edgeFade) : 0;
      var on = vis > 0.01;
      var smooth = vis * vis * (3 - 2 * vis);

      if (on || Math.abs(t - mid) < 0.25) ensureImages(v);

      // Leaving a card resets it, so the front always greets you.
      if (smooth < 0.35 && state.flipped[v.id]) state.flipped[v.id] = false;
      var flipped = !!(v.back && state.flipped[v.id]);
      var live = !!v.back && on && smooth > 0.7;

      // A card fills whatever the viewport spares it, leaving room for the
      // dress-code lines beneath.
      var maxW = Math.min(1012, vw - sideGutter * 2);
      var maxH = clamp(vh * 0.84 - 200, 160, 875);
      var w = Math.round(Math.min(maxW, maxH * v.ratio));

      v.el.style.opacity = smooth;
      v.el.style.visibility = on ? 'visible' : 'hidden';
      v.card.style.transform = 'translateY(' + (d * -46) + 'px) scale(' + (0.955 + smooth * 0.045) + ')';
      v.flipper.style.width = w + 'px';
      v.flipper.style.height = Math.round(w / v.ratio) + 'px';
      v.flipper.style.transform = 'rotateY(' + (flipped ? 180 : 0) + 'deg)';
      v.flipper.style.pointerEvents = live ? 'auto' : 'none';
      v.text.style.transform = 'translateY(' + (d * -16) + 'px)';

      if (v.hint) {
        v.hint.textContent = flipped ? 'Tap to go back' : 'Tap for details';
        v.hint.style.transform = 'translateY(' + (d * -30) + 'px)';
        v.hint.style.pointerEvents = live ? 'auto' : 'none';
        v.hint.setAttribute('aria-expanded', flipped ? 'true' : 'false');
      }

      var active = t >= v.t0 - 0.03 && t <= v.t1 + 0.03;
      v.dot.classList.toggle('is-active', active);
      v.dot.setAttribute('aria-current', active ? 'true' : 'false');
    });

    // ---- rail ----
    rail.setAttribute('data-mode', railMode);
    var railOpacity = 1 - clamp((t - 0.945) / 0.03, 0, 1);
    rail.style.opacity = railOpacity;
    rail.style.pointerEvents = t > 0.96 ? 'none' : 'auto';
    // once faded out it leaves the tab order too
    rail.style.visibility = railOpacity > 0.01 ? 'visible' : 'hidden';
    railFill.style.height = (t * 100) + '%';
    EVENTS.forEach(function (v) {
      var label = v.dot.querySelector('.invite-dot-label');
      if (label) label.style.maxWidth = labelWidth + 'px';
    });

    // ---- intro / outro ----
    var introOn = !state.started || t < 0.008;
    intro.style.opacity = !state.started ? 1 : clamp((0.008 - t) / 0.008, 0, 1);
    intro.style.pointerEvents = (!state.started || t < 0.003) ? 'auto' : 'none';
    intro.style.visibility = introOn ? 'visible' : 'hidden';
    intro.setAttribute('aria-hidden', introOn ? 'false' : 'true');

    var outroOn = state.started && t > 0.955;
    outro.style.opacity = outroOn ? clamp((t - 0.955) / 0.022, 0, 1) : 0;
    outro.style.pointerEvents = t > 0.972 ? 'auto' : 'none';
    outro.style.visibility = outroOn ? 'visible' : 'hidden';
    outro.setAttribute('aria-hidden', outroOn ? 'false' : 'true');

    // ---- schedule at a glance ----
    var glanceOn = state.glance && t > 0.955;
    if (glanceOn) {
      var g = vw < vh ? GLANCE.tall : GLANCE.wide;
      ensureGlance(g);
      var gw = Math.min(vw * 0.92, vh * g.fill * g.ratio, 1100);
      glanceCard.style.width = gw + 'px';
      glanceCard.style.height = (gw / g.ratio) + 'px';
      glance.removeAttribute('hidden');
    } else {
      glance.setAttribute('hidden', '');
    }
  }

  // ----------------------------------------------------------
  // Gestures
  // ----------------------------------------------------------

  // The resting points: the opening, each event card fully in view, and
  // the close. The arrow keys step between them, and so does a flick.
  var STOPS = [0].concat(EVENTS.map(function (v) { return (v.t0 + v.t1) / 2; }), [1]);

  function nextStop(t, dir) {
    var pool = STOPS.filter(function (m) {
      return dir > 0 ? m > t + 0.02 : m < t - 0.02;
    });
    if (!pool.length) return dir > 0 ? 1 : 0;
    return dir > 0 ? Math.min.apply(null, pool) : Math.max.apply(null, pool);
  }

  function nearestStop(t) {
    return STOPS.reduce(function (a, b) { return Math.abs(b - t) < Math.abs(a - t) ? b : a; });
  }

  // A touch gesture moves at most one event: it is held between the
  // resting points either side of where it began.
  var startY = 0, startT = 0, samples = [], touchy = false, lo = 0, hi = 1;
  var DRAG_SCALE = 1.15;

  root.addEventListener('pointerdown', function (e) {
    if (raf) cancelAnimationFrame(raf);
    startY = e.clientY;
    startT = state.t;
    samples = [{ y: e.clientY, time: e.timeStamp }];
    touchy = e.pointerType !== 'mouse';
    lo = nextStop(startT, -1);
    hi = nextStop(startT, 1);
    state.dragging = true;
    state.moved = 0;
    root.classList.add('is-dragging');
  });

  root.addEventListener('pointermove', function (e) {
    if (!state.dragging) return;
    var dy = startY - e.clientY;
    state.moved = Math.max(state.moved, Math.abs(dy));
    samples.push({ y: e.clientY, time: e.timeStamp });
    while (samples.length > 2 && e.timeStamp - samples[0].time > 100) samples.shift();
    var t = startT + dy / (window.innerHeight * DRAG_SCALE);
    if (touchy) t = clamp(t, lo, hi);
    set(t, Math.abs(dy) > 6);
  });

  // Finger speed over the last ~100ms, in px/ms; positive moves forward.
  function flickSpeed(e) {
    var first = samples[0];
    if (!first) return 0;
    var dt = e.timeStamp - first.time;
    if (dt <= 0 || dt > 150) return 0;
    return (first.y - e.clientY) / dt;
  }

  function endDrag(e) {
    if (!state.dragging) return;
    state.dragging = false;
    root.classList.remove('is-dragging');
    // On touch, letting go settles on a resting point at the finger's
    // speed: a flick goes on to the next one in its direction, like an
    // arrow key, and a slow drag settles on whichever is closest. Either
    // way it stays within one event of where it began. Taps (under 8px)
    // are left alone.
    if (e && e.type === 'pointerup' && touchy && state.moved >= 8) {
      var v = flickSpeed(e);
      var target = Math.abs(v) > 0.25 ? (v > 0 ? hi : lo) : nearestStop(state.t);
      glideFrom(target, v / (window.innerHeight * DRAG_SCALE));
      return;
    }
    schedule();
  }

  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', endDrag);

  root.addEventListener('wheel', function (e) {
    e.preventDefault();
    if (raf) cancelAnimationFrame(raf);
    set(state.t + e.deltaY / 2600, true);
  }, { passive: false });

  function menuOpen() { return menu && !menu.hasAttribute('hidden'); }

  window.addEventListener('keydown', function (e) {
    if (menuOpen()) return;
    var k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown' || k === ' ') {
      e.preventDefault(); glide(nextStop(state.t, 1));
    } else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') {
      e.preventDefault(); glide(nextStop(state.t, -1));
    } else if (k === 'Home') {
      e.preventDefault(); glide(0);
    } else if (k === 'End') {
      e.preventDefault(); glide(1);
    } else if (k === 'Escape' && state.glance) {
      state.glance = false; schedule();
    }
  });

  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);

  // ----------------------------------------------------------
  // Controls
  // ----------------------------------------------------------

  EVENTS.forEach(function (v) {
    if (v.back) {
      var flip = function () {
        if (state.moved >= 8) return;
        state.flipped[v.id] = !state.flipped[v.id];
        schedule();
      };
      v.flipper.addEventListener('pointerup', flip);
      if (v.hint) {
        v.hint.addEventListener('click', flip);
        v.flipper.classList.add('is-flippable');
      }
    }
    v.dot.addEventListener('pointerup', function () {
      if (state.moved < 8) glide((v.t0 + v.t1) / 2);
    });
    v.dot.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); glide((v.t0 + v.t1) / 2); }
    });
  });

  root.querySelector('[data-action="begin"]').addEventListener('click', function () {
    glide(0.09);
  });

  root.querySelector('[data-action="top"]').addEventListener('click', function () {
    glide(0);
  });

  root.querySelector('[data-action="glance"]').addEventListener('click', function () {
    if (state.moved >= 8) return;
    state.glance = true;
    schedule();
  });

  glance.addEventListener('pointerup', function () {
    state.glance = false;
    schedule();
  });

  // the overlay swallows gestures so the timeline doesn't move behind it
  ['pointerdown', 'pointermove', 'wheel'].forEach(function (type) {
    glance.addEventListener(type, function (e) {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
  });

  render();
})();
