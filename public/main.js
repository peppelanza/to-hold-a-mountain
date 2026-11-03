// Homepage: everything scrolls naturally. This shows the loading screen until the
// fonts, images and video are all in, shrinks the logo as the clouds come over it,
// and plays the video with the scroll while it is on screen (and, on phones, pans it).
const root = document.documentElement;
const logo = document.querySelector(".intro-logo img");
const textTrack = document.querySelector(".cloud-text-track");
const cloudText = textTrack.querySelector(".cloud-text");
const quotes = [...cloudText.querySelectorAll(".quote")];
const TEXT_HOLD = 0.9; // screens of scrolling the quotes stay in the centre
const film = document.querySelector(".film");
const video = film.querySelector("video");
const wash = film.querySelector(".film-wash");
const filmStory = film.querySelector(".film-story");
const story = filmStory.querySelector(".story");
const introClouds = document.querySelector(".intro-clouds");

// 0 before a, 1 after b, linear in between.
const range = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const ease = (t) => t * t * (3 - 2 * t);

// Phones only: the video fills the screen's height (cropped at the sides) and pans
// across while it plays. 0% = its left edge, 100% = its right edge.
const mobile = window.matchMedia("(max-width: 767px)");
const PAN_FROM = 0;
const PAN_TO = 70; // ends where the rider is, rather than at the far right edge

function update() {
  // Logo: full size on arrival, 90% by the time the clouds cover it (94vh of scrolling).
  const covered = Math.min(1, window.scrollY / (0.94 * window.innerHeight));
  logo.style.transform = `scale(${1 - 0.1 * covered})`;

  // Text: rides up with the clouds, slows to a stop in the centre of the screen, holds,
  // then speeds up again and moves on. u is how far the track has scrolled past the
  // top of the screen; the text stays back by an amount that grows and shrinks
  // smoothly (no sudden stop or start).
  const vh = window.innerHeight;
  const u = -textTrack.getBoundingClientRect().top;
  const soft = 0.12 * vh; // how gently it slows down and speeds up
  const smoothStep = (x) => (x > 20 * soft ? x : soft * Math.log1p(Math.exp(x / soft))); // smooth max(0, x)
  const behind = u - (smoothStep(u - TEXT_HOLD * vh) - smoothStep(-u));
  cloudText.style.transform = `translateY(${behind}px)`;

  // Halfway through the pause the first quote fades out as the second fades in.
  const swap = ease(Math.min(1, Math.max(0, (u - 0.35 * TEXT_HOLD * vh) / (0.3 * TEXT_HOLD * vh))));
  quotes[0].style.opacity = 1 - swap;
  quotes[0].style.transform = `translateY(${-12 * swap}px)`;
  quotes[1].style.opacity = swap;
  quotes[1].style.transform = `translateY(${12 * (1 - swap)}px)`;

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
  const into = ease(range(play, 0.74, 0.94)); // only toward the end: fully blurred into the lake at 0.94
  video.style.transform = `scale(${1 + 1.8 * into})`;
  video.style.filter = into > 0 ? `blur(${30 * into}px)` : "";
  wash.style.opacity = ease(range(play, 0.84, 0.94));

  // As the lake blurs out, the poster and synopsis come into focus in place, from a
  // blur, and stay to be read until the end of the page.
  const shown = ease(range(play, 0.86, 0.98));
  filmStory.style.opacity = shown;
  filmStory.style.filter = shown < 1 ? `blur(${16 * (1 - shown)}px)` : "";
  filmStory.classList.toggle("shown", shown > 0.5);

  // The clouds over the top of the video (held there by CSS) lift up and away as the
  // video zooms into the lake.
  const away = ease(range(play, 0.7, 0.9));
  introClouds.style.transform = away > 0 ? `translateY(${-70 * away}vh)` : "";
  introClouds.style.opacity = 1 - ease(range(play, 0.74, 0.9));
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
// The sky and the clouds are CSS backgrounds: load them here to know when they are in.
const sky = new Image();
sky.src = "sky.webp";
const clouds = new Image();
clouds.src = "clouds.webp";
const images = [logo, sky, clouds];

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
// On short screens, scale the poster and synopsis down until they fit.
function fitStory() {
  story.style.transform = "";
  const room = filmStory.clientHeight - parseFloat(getComputedStyle(filmStory).paddingTop) - parseFloat(getComputedStyle(filmStory).paddingBottom);
  const need = story.offsetHeight;
  if (need > room) story.style.transform = `scale(${room / need})`;
}
fitStory();
window.addEventListener("resize", fitStory);
document.fonts && document.fonts.ready.then(fitStory);

window.addEventListener("resize", requestUpdate);
video.addEventListener("loadedmetadata", requestUpdate);
update();
