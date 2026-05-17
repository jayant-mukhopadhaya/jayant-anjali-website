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
