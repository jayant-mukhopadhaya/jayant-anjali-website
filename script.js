// ============================================================
// Mobile nav toggle
// ============================================================
const toggle = document.querySelector(".hamburger");
const menu   = document.getElementById("mobileMenu");

if (toggle && menu) {
  toggle.addEventListener("click", () => {
    const isHidden = menu.hasAttribute("hidden");
    if (isHidden) {
      menu.removeAttribute("hidden");
      toggle.setAttribute("aria-expanded", "true");
    } else {
      menu.setAttribute("hidden", "");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      menu.setAttribute("hidden", "");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

// ============================================================
// Motifs: fade in on load, fade out on scroll, back in at top
// ============================================================
const motifLayer = document.querySelector(".motifs");

if (motifLayer) {
  const FADE_START = 60;   // px scrolled before fade begins
  const FADE_END   = 380;  // px scrolled when fully gone

  // Fade in on load (slow, cinematic)
  motifLayer.style.opacity = "0";
  motifLayer.style.transition = "opacity 1.4s ease";

  const doLoadFade = () => {
    requestAnimationFrame(() => {
      motifLayer.style.opacity = "1";
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", doLoadFade);
  } else {
    setTimeout(doLoadFade, 80);
  }

  // Scroll-driven fade (fast transition so it tracks scrolling)
  let scrollTicking = false;

  function updateMotifOpacity() {
    const y = window.scrollY;
    let opacity;
    if (y <= FADE_START) {
      opacity = 1;
    } else if (y >= FADE_END) {
      opacity = 0;
    } else {
      opacity = 1 - (y - FADE_START) / (FADE_END - FADE_START);
    }
    motifLayer.style.transition = "opacity 0.28s ease";
    motifLayer.style.opacity = String(opacity.toFixed(3));
    scrollTicking = false;
  }

  window.addEventListener("scroll", () => {
    if (!scrollTicking) {
      requestAnimationFrame(updateMotifOpacity);
      scrollTicking = true;
    }
  }, { passive: true });
}

// ============================================================
// Scroll fade-in for content sections
// ============================================================
const fadeEls = document.querySelectorAll(".fade-in");

if (fadeEls.length > 0 && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.06, rootMargin: "0px 0px -30px 0px" }
  );
  fadeEls.forEach((el) => observer.observe(el));
} else {
  fadeEls.forEach((el) => el.classList.add("visible"));
}

// ============================================================
// Countdown to the wedding — Nov 21–22, 2026, IST (UTC+5:30)
// Three states:
//   1. before  → live D/H/M/S countdown
//   2. during  → "We're getting married today" (Nov 21 14:00 → Nov 22 22:00 IST)
//   3. after   → "Thank you for celebrating with us"
// ============================================================
(function () {
  var wrap = document.getElementById('countdownWrap');
  var root = document.getElementById('countdown');
  if (!root || !wrap) return;

  // Sat 2026-11-21 14:00 IST = 08:30 UTC
  // Sun 2026-11-22 22:00 IST = 16:30 UTC
  var START = Date.UTC(2026, 10, 21, 8, 30, 0);
  var END   = Date.UTC(2026, 10, 22, 16, 30, 0);

  var cells = {
    days:    root.querySelector('[data-cd="days"]'),
    hours:   root.querySelector('[data-cd="hours"]'),
    minutes: root.querySelector('[data-cd="minutes"]'),
    seconds: root.querySelector('[data-cd="seconds"]')
  };

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function renderMessage(text) {
    // Replace the countdown + tz line with a single styled message
    wrap.innerHTML = '<p class="countdown-message">' + text + '</p>';
  }

  var timer;
  var state = 'before';

  function tick() {
    var now = Date.now();

    if (now >= END && state !== 'after') {
      state = 'after';
      renderMessage("Thank you for celebrating with us.");
      clearInterval(timer);
      return;
    }

    if (now >= START && now < END && state !== 'during') {
      state = 'during';
      renderMessage("We're getting married today.");
      clearInterval(timer);
      // Re-check once every minute in case the page is left open and END passes
      timer = setInterval(tick, 60000);
      return;
    }

    if (state !== 'before') return;

    var diff = START - now;
    if (diff < 0) diff = 0;
    var s = Math.floor(diff / 1000);
    var days  = Math.floor(s / 86400);
    var hours = Math.floor((s % 86400) / 3600);
    var mins  = Math.floor((s % 3600) / 60);
    var secs  = s % 60;
    if (cells.days)    cells.days.textContent    = String(days);
    if (cells.hours)   cells.hours.textContent   = pad(hours);
    if (cells.minutes) cells.minutes.textContent = pad(mins);
    if (cells.seconds) {
      // Snap to gold (transition: 0ms) BEFORE the new digit paints,
      // then remove the class on the next frame so the 0.7s ease back to brown begins.
      cells.seconds.classList.add('countdown-value--pulse');
      cells.seconds.textContent = pad(secs);
      requestAnimationFrame(function () {
        cells.seconds.classList.remove('countdown-value--pulse');
      });
    }
  }

  tick();
  timer = setInterval(tick, 1000);
})();

// ============================================================
// Page TOC — highlight the current section as you scroll (plan page)
// ============================================================
(function () {
  var tocLinks = document.querySelectorAll('.page-toc a');
  if (tocLinks.length === 0 || !('IntersectionObserver' in window)) return;

  var idToLinks = {};
  tocLinks.forEach(function (a) {
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    if (!idToLinks[id]) idToLinks[id] = [];
    idToLinks[id].push(a);
  });

  var sections = Object.keys(idToLinks)
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  if (sections.length === 0) return;

  function setActive(id) {
    tocLinks.forEach(function (a) { a.classList.remove('is-active'); });
    (idToLinks[id] || []).forEach(function (a) { a.classList.add('is-active'); });
  }

  var observer = new IntersectionObserver(function (entries) {
    // Find the topmost section currently intersecting
    var visible = entries
      .filter(function (e) { return e.isIntersecting; })
      .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
    if (visible.length > 0) {
      setActive(visible[0].target.id);
    }
  }, {
    // Activate when the section's top crosses 25% from the top of the viewport
    rootMargin: '-25% 0px -65% 0px',
    threshold: 0
  });

  sections.forEach(function (s) { observer.observe(s); });
})();

// ============================================================
// Gallery rendering (legacy — moments page uses slideshow)
// ============================================================
const galleryContainer = document.getElementById("gallery");
if (galleryContainer && window.galleryImages) {
  window.galleryImages.forEach((imageSrc) => {
    const img = document.createElement("img");
    img.src     = imageSrc;
    img.loading = "lazy";
    img.alt     = "Wedding Moment";
    galleryContainer.appendChild(img);
  });
}
