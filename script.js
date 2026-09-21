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
// Collapsible sections (plan page) — open the target <details>
// when a link points at it, or when the page loads with that #hash
// ============================================================
(function () {
  var collapsibles = document.querySelectorAll('.section-collapse');
  if (collapsibles.length === 0) return;

  function openById(id) {
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS' && !el.open) {
      el.open = true;
    }
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function () {
      openById(a.getAttribute('href').slice(1));
    });
  });

  window.addEventListener('hashchange', function () {
    openById(window.location.hash.slice(1));
  });

  if (window.location.hash) {
    openById(window.location.hash.slice(1));
  }

  // Per-section "Collapse" button at the bottom of each section —
  // closes it and scrolls back up to its heading
  document.addEventListener('click', function (e) {
    var closeBtn = e.target.closest('.section-collapse-close');
    if (!closeBtn) return;
    var details = closeBtn.closest('details.section-collapse');
    if (!details) return;
    details.open = false;
    var summary = details.querySelector('summary');
    if (summary) summary.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
})();
