// Mobile nav toggle
const toggle = document.querySelector(".hamburger");
const menu = document.getElementById("mobileMenu");

if (toggle && menu) {
  toggle.addEventListener("click", () => {
    // Toggle the 'hidden' attribute
    const isHidden = menu.hasAttribute("hidden");
    if (isHidden) {
      menu.removeAttribute("hidden");
      toggle.setAttribute("aria-expanded", "true");
    } else {
      menu.setAttribute("hidden", "");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  // Close menu when clicking a link
  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
        // If it's an anchor on the same page, we want to close.
        // If it's a new page, the page reloads, so it closes anyway.
        // Strictly speaking, we only need to close if we don't navigate away,
        // but creating a "flash" of closing before nav is fine/better.
        menu.setAttribute("hidden", "");
        toggle.setAttribute("aria-expanded", "false");
    });
  });
}

// Footer year (optional, only if element exists)
const yearSpan = document.getElementById("year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}
