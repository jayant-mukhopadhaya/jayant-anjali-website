// ============================================================
// THE INVITATION — "Two Suns"
//
// Ported from the Claude Design component of the same name. One
// value — t, from 0 to 1 — drives everything:
//
//   t  ->  hour of the weekend   (CLOCK)
//   hour -> the sun's height     (sine between sunrise and sunset)
//   height -> the colour of the sky   (SKY)
//
// Everything else follows: the ink flips from deep red to cream
// when the sky goes dark, cards fade in over the hours they
// actually happen, and the rail fills as the weekend passes.
//
// The CLOCK, SKY and EVENTS numbers are the design's own and are
// carried over unchanged. Content (names, dress codes, the card
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
    [0, 12], [0.08, 16], [0.22, 17.5], [0.365, 19.5], [0.47, 24],
    [0.55, 29], [0.665, 34], [0.86, 42.5], [1.0, 50]
  ];

  // Sun height -> [top of sky, bottom of sky]. The light of the day is the
  // only thing the background does: no sun, no moon, no stars, no clouds.
  var SKY = [
    [-0.40, [14, 17, 30], [24, 22, 33]],
    [-0.18, [22, 28, 52], [58, 38, 46]],
    [-0.06, [46, 56, 92], [150, 74, 58]],
    [0.01, [86, 102, 138], [222, 130, 74]],
    [0.09, [116, 138, 172], [236, 172, 106]],
    [0.30, [140, 166, 194], [235, 208, 162]],
    [0.65, [146, 174, 202], [232, 218, 188]],
    [1.00, [136, 166, 198], [226, 214, 184]]
  ];

  // Artwork ratios are the images' true dimensions, so nothing is stretched.
  var EVENTS = [
    { id: 'act1', t0: 0.01, t1: 0.15, hIn: 12.4, hOut: 17.5, ratio: 2000 / 1400,
      img: 'assets/invite/mapusa.jpg', back: 'assets/invite/mapusa_back.jpg' },
    { id: 'act2', t0: 0.29, t1: 0.44, hIn: 19, hOut: 23, ratio: 2000 / 1404,
      img: 'assets/invite/aiburo.jpg', back: 'assets/invite/aiburo_back.jpg' },
    // the ceremony is the centrepiece, so its card runs larger than the rest
    { id: 'wedding', t0: 0.59, t1: 0.74, hIn: 31, hOut: 37, ratio: 2000 / 2800, portrait: true, grow: 1.12,
      img: 'assets/invite/wedding.jpg', back: null },
    { id: 'party', t0: 0.79, t1: 0.93, hIn: 40, hOut: 48, ratio: 2000 / 1384,
      img: 'assets/invite/afterparty.jpg', back: null }
  ];

  var DRESS_IMG = 'assets/invite/dress_code.jpg';
  var DRESS_RATIO = 2000 / 1404;
  var ACCENT = '#d8c08a';

  var state = { t: 0, dragging: false, started: false, moved: 0, flipped: {}, dress: false };

  // ----------------------------------------------------------
  // Elements
  // ----------------------------------------------------------

  var sky = root.querySelector('.invite-sky');
  var haze = root.querySelector('.invite-haze');
  var dayLabel = document.getElementById('inviteDay');
  var timeLabel = document.getElementById('inviteTime');
  var clock = root.querySelector('.invite-clock');
  var rail = root.querySelector('.invite-rail');
  var railFill = root.querySelector('.invite-rail-fill');
  var intro = root.querySelector('.invite-intro');
  var introInner = root.querySelector('.invite-intro-inner');
  var outro = root.querySelector('.invite-outro');
  var dress = root.querySelector('.invite-dress');
  var dressCard = root.querySelector('.invite-dress-card');
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

  function skyAt(alt) {
    for (var i = 0; i < SKY.length - 1; i++) {
      if (alt <= SKY[i + 1][0]) {
        var p = clamp((alt - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]), 0, 1);
        return {
          top: mix(SKY[i][1], SKY[i + 1][1], p),
          bottom: mix(SKY[i][2], SKY[i + 1][2], p)
        };
      }
    }
    var last = SKY[SKY.length - 1];
    return { top: last[1], bottom: last[2] };
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
    // the dress card belongs to the very end; leaving the end closes it
    if (state.dress && state.t <= 0.955) state.dress = false;
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

  // Artwork is only fetched as its card approaches, so opening the
  // invitation costs one image, not seven.
  function ensureImages(v) {
    if (v.loaded) return;
    v.loaded = true;
    v.front.style.backgroundImage = 'url(' + v.img + ')';
    if (v.back) v.backEl.style.backgroundImage = 'url(' + v.back + ')';
  }

  var dressLoaded = false;

  function ensureDress() {
    if (dressLoaded) return;
    dressLoaded = true;
    dressCard.style.backgroundImage = 'url(' + DRESS_IMG + ')';
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  function render() {
    var t = state.t;
    var H = hourAt(t);
    var hd = ((H % 24) + 24) % 24;
    var day2 = H >= 24;

    var RISE = 6.6, SET = 18.3;
    var sunAlt = Math.sin(Math.PI * (hd - RISE) / (SET - RISE));
    var up = sunAlt > 0;
    var s = skyAt(clamp(sunAlt, -0.4, 1));
    var night = clamp(-sunAlt * 3.2, 0, 1);
    var low = up ? clamp(1 - sunAlt / 0.22, 0, 1) : 1;

    // Ink follows the sky: deep red by day, cream once it darkens.
    var lum = (0.299 * s.bottom[0] + 0.587 * s.bottom[1] + 0.114 * s.bottom[2]) / 255;
    var bright = lum > 0.56;
    var ink = bright ? '#751015' : '#f2e6cc';
    var inkSoft = bright ? 'rgba(117,16,21,0.62)' : 'rgba(242,230,204,0.66)';
    var rule = bright ? 'rgba(117,16,21,0.22)' : 'rgba(242,230,204,0.22)';
    var ruleStrong = bright ? 'rgba(117,16,21,0.5)' : 'rgba(242,230,204,0.55)';

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
    sky.style.background = 'linear-gradient(' + rgb(s.top) + ' 0%, ' + rgb(s.top) + ' 22%, ' +
      rgb(s.bottom) + ' 78%, ' + rgb(mix(s.bottom, [0, 0, 0], 0.1)) + ' 100%)';
    haze.style.background = 'linear-gradient(to top, rgba(' + s.bottom.join(',') + ',0.85) 0%, ' +
      'rgba(255,206,146,' + (low * 0.26 * (up ? 1 : 0.35)) + ') 36%, rgba(255,206,146,0) 100%)';

    var hh = Math.floor(hd);
    var mm = Math.floor((hd % 1) * 60);
    dayLabel.textContent = day2 ? 'Sunday 22 November' : 'Saturday 21 November';
    timeLabel.textContent = (((hh + 11) % 12) + 1) + ':' + String(mm).padStart(2, '0') +
      ' ' + (hh >= 12 ? 'PM' : 'AM');
    clock.style.opacity = 0.76 * (1 - clamp((t - 0.955) / 0.028, 0, 1));

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

      // A card fills whatever the viewport spares it, portrait cards being
      // the taller and narrower of the two. `grow` lets one card run larger
      // than the design's default; the extra cap then keeps it from crowding
      // the dress-code line beneath it on short screens.
      var grow = v.grow || 1;
      var maxW = Math.min((v.portrait ? 775 : 1012) * grow, vw - sideGutter * 2);
      var maxH = clamp((vh * 0.84 - (v.portrait ? 110 : 200)) * grow, 160, 875);
      if (grow > 1) maxH = Math.min(maxH, vh * 0.86 - 48);
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
        v.hint.textContent = flipped ? 'Tap to go back' : 'Tap to read more';
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

    // ---- dress code ----
    var dressOn = state.dress && t > 0.955;
    if (dressOn) {
      ensureDress();
      var dw = Math.min(vw * 0.92, vh * 0.78 * DRESS_RATIO, 1100);
      dressCard.style.width = dw + 'px';
      dressCard.style.height = (dw / DRESS_RATIO) + 'px';
      dress.removeAttribute('hidden');
    } else {
      dress.setAttribute('hidden', '');
    }
  }

  // ----------------------------------------------------------
  // Gestures
  // ----------------------------------------------------------

  var startY = 0, startT = 0;

  root.addEventListener('pointerdown', function (e) {
    if (raf) cancelAnimationFrame(raf);
    startY = e.clientY;
    startT = state.t;
    state.dragging = true;
    state.moved = 0;
    root.classList.add('is-dragging');
  });

  root.addEventListener('pointermove', function (e) {
    if (!state.dragging) return;
    var dy = startY - e.clientY;
    state.moved = Math.max(state.moved, Math.abs(dy));
    set(startT + dy / (window.innerHeight * 1.15), Math.abs(dy) > 6);
  });

  function endDrag() {
    if (!state.dragging) return;
    state.dragging = false;
    root.classList.remove('is-dragging');
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
    var nearest = function (dir) {
      var marks = EVENTS.map(function (v) { return (v.t0 + v.t1) / 2; });
      var pool = marks.filter(function (m) {
        return dir > 0 ? m > state.t + 0.02 : m < state.t - 0.02;
      });
      if (!pool.length) return dir > 0 ? 1 : 0;
      return dir > 0 ? Math.min.apply(null, pool) : Math.max.apply(null, pool);
    };
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown' || k === ' ') {
      e.preventDefault(); glide(nearest(1));
    } else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') {
      e.preventDefault(); glide(nearest(-1));
    } else if (k === 'Home') {
      e.preventDefault(); glide(0);
    } else if (k === 'End') {
      e.preventDefault(); glide(1);
    } else if (k === 'Escape' && state.dress) {
      state.dress = false; schedule();
    }
  });

  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);

  // ----------------------------------------------------------
  // Controls
  // ----------------------------------------------------------

  EVENTS.forEach(function (v) {
    if (!v.back) return;
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
    v.dot.addEventListener('pointerup', function () {
      if (state.moved < 8) glide((v.t0 + v.t1) / 2);
    });
    v.dot.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); glide((v.t0 + v.t1) / 2); }
    });
  });

  // dots for cards without a flip side still navigate
  EVENTS.forEach(function (v) {
    if (v.back) return;
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

  root.querySelector('[data-action="dress"]').addEventListener('click', function () {
    if (state.moved >= 8) return;
    state.dress = true;
    schedule();
  });

  dress.addEventListener('pointerup', function () {
    state.dress = false;
    schedule();
  });

  // the overlay swallows gestures so the timeline doesn't move behind it
  ['pointerdown', 'pointermove', 'wheel'].forEach(function (type) {
    dress.addEventListener(type, function (e) {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
  });

  render();
})();
