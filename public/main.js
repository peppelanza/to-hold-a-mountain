// Parallax: each [data-speed] element moves down by (scroll × (1 - speed)),
// so low speeds lag behind (feel far away) and high speeds move with the page.
const layers = [...document.querySelectorAll("[data-speed]")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let ticking = false;

function update() {
  const y = window.scrollY;
  for (const el of layers) {
    const speed = parseFloat(el.dataset.speed);
    el.style.transform = reduceMotion.matches ? "" : `translate3d(0, ${y * (1 - speed)}px, 0)`;
  }
  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(update);
  }
}, { passive: true });

update();
