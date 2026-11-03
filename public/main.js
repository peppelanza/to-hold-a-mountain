// Homepage: everything scrolls naturally. This shows the loading screen until the
// fonts, images and video are all in, shrinks the logo as the clouds come over it,
// plays the video (looping) while it is on screen, and zooms it into the lake as you
// scroll on (on phones it also pans across with the rider).
const root = document.documentElement;
const logo = document.querySelector(".intro-logo img");
const textTrack = document.querySelector(".cloud-text-track");
const cloudText = document.querySelector(".cloud-text");
const logoHold = document.querySelector(".intro-logo-hold");
const quotes = [...cloudText.querySelectorAll(".quote")];
const TEXT_HOLD = 1.2; // screens of scrolling the logline and quotes stay in the centre
// Where (in screens of scrolling into the pause) each text gives way to the next, and
// where the last one fades as it leaves, so both press quotes get the same time.
const TEXT_SWAPS = [0.3, 0.85];
const TEXT_OUT = 1.3;
const FADE = 0.14;
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

// Where the text's stretch starts on the page (the clouds' position before they are
// held over the video), measured on load and when the window changes size.
let trackTop = 0;
function measure() {
  const cloudsTop = logoHold.getBoundingClientRect().top + window.scrollY + logoHold.offsetHeight +
    parseFloat(getComputedStyle(introClouds).marginTop);
  trackTop = cloudsTop + textTrack.offsetTop;
}

function update() {
  // Logo: full size on arrival, 90% by the time the clouds cover it (94vh of scrolling).
  const covered = Math.min(1, window.scrollY / (0.94 * window.innerHeight));
  logo.style.transform = `scale(${1 - 0.1 * covered})`;

  // Text: rides up with the clouds, slows to a stop in the centre of the screen, holds,
  // then speeds up again and moves on. u is how far the track has scrolled past the
  // top of the screen; the text stays back by an amount that grows and shrinks
  // smoothly (no sudden stop or start).
  // The text is fixed to the screen and only this moves it (no fight with the page's
  // own scrolling, so it doesn't tremble).
  const vh = window.innerHeight;
  const u = window.scrollY - trackTop;
  const soft = 0.12 * vh; // how gently it slows down and speeds up
  const smoothStep = (x) => (x > 20 * soft ? x : soft * Math.log1p(Math.exp(x / soft))); // smooth max(0, x)
  const y = -(smoothStep(u - TEXT_HOLD * vh) - smoothStep(-u));
  cloudText.style.visibility = Math.abs(y) < vh ? "visible" : "hidden";
  cloudText.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;

  // Each text fades out as the next fades in; the last fades out as it moves away.
  const at = (screens) => ease(range(u / vh, screens - FADE / 2, screens + FADE / 2));
  quotes.forEach((q, i) => {
    const fadeIn = i === 0 ? 1 : at(TEXT_SWAPS[i - 1]);
    const fadeOut = i < TEXT_SWAPS.length ? at(TEXT_SWAPS[i]) : ease(range(u / vh, TEXT_OUT, TEXT_OUT + 0.15));
    q.style.opacity = fadeIn * (1 - fadeOut);
    q.style.transform = `translateY(${12 * (1 - fadeIn) - 12 * fadeOut}px)`;
  });

  // The video plays (looping) while it's on screen and pauses when it isn't.
  const filmBox = film.getBoundingClientRect();
  const onScreen = filmBox.top < window.innerHeight && filmBox.bottom > 0;
  // (Not waiting for a frame first: iPhones load none until they're asked to play.)
  if (onScreen && video.paused) video.play().catch(() => {});
  else if (!onScreen && !video.paused) video.pause();

  // 0 when the film section reaches the top of the screen, 1 when it is about to leave.
  const scrollable = film.offsetHeight - window.innerHeight;
  const play = Math.min(1, Math.max(0, -film.getBoundingClientRect().top / scrollable));


  // Second half: zoom into the lake (bottom centre) and blur, until the lake's colour
  // fills the screen and the section below carries it on.
  const into = ease(range(play, 0, 0.39)); // starts as soon as the video fills the screen; fully blurred at 0.39
  video.style.transform = `scale(${1 + 1.8 * into})`;
  const blur = range(into, 0.5, 1); // the blur waits until the zoom is halfway in
  video.style.filter = blur > 0 ? `blur(${30 * blur}px)` : "";
  wash.style.opacity = ease(range(play, 0.25, 0.39));

  // As the lake blurs out, the poster and synopsis come into focus in place, from a
  // blur, and stay to be read until the end of the page.
  const shown = ease(range(play, 0.31, 0.5));
  filmStory.style.opacity = shown;
  filmStory.style.filter = shown < 1 ? `blur(${16 * (1 - shown)}px)` : "";
  filmStory.classList.toggle("shown", shown > 0.5);

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

// The whole clip, read piece by piece to show progress, so it's in the browser's cache
// when the page opens. The video keeps its normal address (iPhones don't reliably
// play a copy held in memory).
async function loadVideo() {
  try {
    const res = await fetch(video.getAttribute("src"));
    const total = Number(res.headers.get("content-length")) || 0;
    if (res.body && total) {
      const reader = res.body.getReader();
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
        videoShare = received / total;
        showProgress();
      }
    } else {
      await res.blob();
    }
  } catch (err) { /* the video loads on its own */ }
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


// Phones: the crop pans across with the rider, following the clip's own time.
function pan() {
  video.style.objectPosition = mobile.matches && video.duration
    ? `${PAN_FROM + (PAN_TO - PAN_FROM) * (video.currentTime / video.duration)}% 50%` : "";
  if (!video.paused) requestAnimationFrame(pan);
}
video.addEventListener("play", () => requestAnimationFrame(pan));
video.addEventListener("loadeddata", requestUpdate); // start it if it's already on screen

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

window.addEventListener("resize", () => { measure(); requestUpdate(); });
video.addEventListener("loadedmetadata", requestUpdate);
measure();
update();
