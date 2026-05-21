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
// Countdown to the wedding — Nov 21, 2026 14:00 IST (UTC+5:30)
// Renders D / H / M / S into [data-cd="..."] cells.
// ============================================================
(function () {
  var root = document.getElementById('countdown');
  if (!root) return;

  // 2026-11-21 14:00:00 IST = 08:30:00 UTC
  var TARGET = Date.UTC(2026, 10, 21, 8, 30, 0);

  var cells = {
    days:    root.querySelector('[data-cd="days"]'),
    hours:   root.querySelector('[data-cd="hours"]'),
    minutes: root.querySelector('[data-cd="minutes"]'),
    seconds: root.querySelector('[data-cd="seconds"]')
  };

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function tick() {
    var diff = TARGET - Date.now();
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
  setInterval(tick, 1000);
})();

// ============================================================
// Cursor-following leopard (home page only, fine pointers)
// ============================================================
(function () {
  var leopard = document.querySelector('.cursor-leopard');
  if (!leopard) return;
  // Skip on touch / coarse pointers
  if (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) {
    return;
  }
  // Honor reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  var mouseX = window.innerWidth / 2;
  var mouseY = window.innerHeight / 2;
  var x = mouseX, y = mouseY;
  var visible = false;

  window.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!visible) {
      visible = true;
      leopard.classList.add('is-visible');
    }
  }, { passive: true });

  document.addEventListener('mouseleave', function () {
    visible = false;
    leopard.classList.remove('is-visible');
  });

  function animate() {
    x += (mouseX - x) * 0.06;
    y += (mouseY - y) * 0.06;
    leopard.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    requestAnimationFrame(animate);
  }
  animate();
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
