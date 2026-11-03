// Homepage: everything scrolls naturally. This shows the loading screen until the
// fonts, images and video are all in, shrinks the logo as the clouds come over it,
// and plays the video with the scroll while it is on screen (and, on phones, pans it).
const root = document.documentElement;
const logo = document.querySelector(".intro-logo img");
const clouds = document.querySelector(".clouds");
const film = document.querySelector(".film");
const video = film.querySelector("video");
const wash = film.querySelector(".film-wash");

// 0 before a, 1 after b, linear in between.
const range = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const ease = (t) => t * t * (3 - 2 * t);

// Phones only: the video fills the screen's height (cropped at the sides) and pans
// across while it plays. 0% = its left edge, 100% = its right edge.
const mobile = window.matchMedia("(max-width: 767px)");
const PAN_FROM = 0;
const PAN_TO = 100;

function update() {
  // Logo: full size on arrival, 90% by the time the clouds cover it (94vh of scrolling).
  const covered = Math.min(1, window.scrollY / (0.94 * window.innerHeight));
  logo.style.transform = `scale(${1 - 0.1 * covered})`;

  // 0 when the film section reaches the top of the screen, 1 when it is about to leave.
  const scrollable = film.offsetHeight - window.innerHeight;
  const play = Math.min(1, Math.max(0, -film.getBoundingClientRect().top / scrollable));

  if (video.duration) {
    const t = play * (video.duration - 0.05);
    if (Math.abs(video.currentTime - t) > 0.01) video.currentTime = t;
  }
  video.style.objectPosition = mobile.matches ? `${PAN_FROM + (PAN_TO - PAN_FROM) * play}% 50%` : "";

  // Second half: zoom into the lake (bottom centre) and blur, until the lake's colour
  // fills the screen and the section below carries it on.
  const into = ease(range(play, 0.5, 1));
  video.style.transform = `scale(${1 + 1.8 * into})`;
  video.style.filter = into > 0 ? `blur(${30 * into}px)` : "";
  wash.style.opacity = 0.95 * ease(range(play, 0.7, 1));
  ticking = false;
}

let ticking = false;
const requestUpdate = () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(update);
  }
};

// ---------- Loading ----------
const bar = document.querySelector(".loader-bar span");
const pct = document.querySelector(".loader-pct");
let videoShare = 0; // 0 → 1, by bytes received
let imagesDone = 0;
const sky = new Image();
sky.src = "sky.webp";
const images = [logo, clouds, sky];

function showProgress() {
  const p = 0.75 * videoShare + 0.25 * (imagesDone / images.length);
  bar.style.transform = `scaleX(${p})`;
  pct.textContent = `${Math.round(p * 100)}%`;
}

function imageReady(img) {
  return new Promise((resolve) => {
    const done = () => { imagesDone++; showProgress(); resolve(); };
    if (img.complete) done();
    else { img.addEventListener("load", done, { once: true }); img.addEventListener("error", done, { once: true }); }
  });
}

// The whole clip, read piece by piece to show progress, then kept in memory so every
// frame is ready to seek to while scrolling.
async function loadVideo() {
  try {
    const res = await fetch(video.getAttribute("src"));
    const total = Number(res.headers.get("content-length")) || 0;
    let blob;
    if (res.body && total) {
      const reader = res.body.getReader();
      const parts = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        received += value.length;
        videoShare = received / total;
        showProgress();
      }
      blob = new Blob(parts, { type: "video/mp4" });
    } else {
      blob = await res.blob();
    }
    video.src = URL.createObjectURL(blob);
  } catch (err) { /* the video keeps its normal source */ }
  videoShare = 1;
  showProgress();
}

function reveal() {
  if (!root.classList.contains("loading")) return;
  window.scrollTo(0, 0);
  bar.style.transform = "scaleX(1)";
  pct.textContent = "100%";
  setTimeout(() => {
    root.classList.remove("loading");
    root.classList.add("revealing");
    setTimeout(() => { root.classList.replace("revealing", "loaded"); }, 1000);
  }, 350);
}

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
Promise.all([
  loadVideo(),
  ...images.map(imageReady),
  document.fonts ? document.fonts.ready : null,
]).then(reveal);
setTimeout(reveal, 20000); // never keep people waiting forever on a slow connection

window.addEventListener("scroll", requestUpdate, { passive: true });
window.addEventListener("resize", requestUpdate);
video.addEventListener("loadedmetadata", requestUpdate);
update();
