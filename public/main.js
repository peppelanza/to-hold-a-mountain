// Homepage: everything scrolls naturally; this only plays the video with the scroll
// while it is on screen (and, on phones, pans across it).
const film = document.querySelector(".film");
const video = film.querySelector("video");

// Phones only: the video fills the screen's height (cropped at the sides) and pans
// across while it plays. 0% = its left edge, 100% = its right edge.
const mobile = window.matchMedia("(max-width: 767px)");
const PAN_FROM = 0;
const PAN_TO = 100;

function update() {
  // 0 when the film section reaches the top of the screen, 1 when it is about to leave.
  const scrollable = film.offsetHeight - window.innerHeight;
  const play = Math.min(1, Math.max(0, -film.getBoundingClientRect().top / scrollable));

  if (video.duration) {
    const t = play * (video.duration - 0.05);
    if (Math.abs(video.currentTime - t) > 0.01) video.currentTime = t;
  }
  video.style.objectPosition = mobile.matches ? `${PAN_FROM + (PAN_TO - PAN_FROM) * play}% 50%` : "";
  ticking = false;
}

let ticking = false;
const requestUpdate = () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(update);
  }
};

// Load the whole clip into memory so every frame is ready to seek to while scrolling.
fetch(video.getAttribute("src"))
  .then((res) => res.blob())
  .then((blob) => { video.src = URL.createObjectURL(blob); })
  .catch(() => {});

window.addEventListener("scroll", requestUpdate, { passive: true });
window.addEventListener("resize", requestUpdate);
video.addEventListener("loadedmetadata", requestUpdate);
update();
