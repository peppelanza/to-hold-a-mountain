// Homepage: everything scrolls naturally. This shows the loading screen until the
// fonts, images and a light version of the video are all in (the full-quality one then
// loads behind it and fades in), shrinks the logo as the clouds come over it,
// plays the video (looping) while it is on screen, and zooms it in and blurs it as you
// scroll on, for the synopsis to sit on.
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
const stage = film.querySelector(".film-stage");
let video = film.querySelector("video"); // the light clip first, then the full-quality one
const wash = film.querySelector(".film-wash");
const filmStory = film.querySelector(".film-story");
const story = filmStory.querySelector(".story");
const introClouds = document.querySelector(".intro-clouds");
const introLogo = document.querySelector(".intro-logo");
const cloudTile = document.querySelector(".clouds");
// Clouds nearer than the bank, and how much faster than it they move: puffs behind the
// texts, thin wisps in front of them. Their tops are at the top of the screen when the
// bank's edge (12% down it) reaches the middle of the screen.
const cloudLayers = [[document.querySelector(".clouds-mid"), 1.3], [document.querySelector(".clouds-veil"), 1.7]];
const watch = document.querySelector(".intro-logo .watch");

// 0 before a, 1 after b, linear in between.
const range = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const ease = (t) => t * t * (3 - 2 * t);

// Where the text's stretch starts on the page (the clouds' position before they are
// held over the video), measured on load and when the window changes size.
let trackTop = 0;
function measure() {
  const cloudsTop = logoHold.getBoundingClientRect().top + window.scrollY + logoHold.offsetHeight +
    parseFloat(getComputedStyle(introClouds).marginTop);
  trackTop = cloudsTop + textTrack.offsetTop;
  // Phones: the laurels above the logo's lettering by as much as the trailer button is
  // below it, where the logo is before any scrolling. (The phone logo's glow is 74/1411
  // of its width on each side; the lettering fills the rest.)
  const glow = logo.offsetWidth * 74 / 1411;
  const lettersTop = logo.offsetTop + glow;
  const lettersBottom = logo.offsetTop + logo.offsetHeight - glow;
  const space = watch.offsetTop - lettersBottom;
  belt.style.top = `${lettersTop - space - belt.offsetHeight}px`;
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

  // The sky behind the logo moves up slowly (it's far away), slower than the clouds.
  introLogo.style.setProperty("--sky-y", `${(-0.12 * Math.min(window.scrollY, logoHold.offsetHeight)).toFixed(1)}px`);

  // The nearer clouds.
  const bank = introClouds.getBoundingClientRect();
  const edgeAtMiddle = 0.5 * vh - 0.12 * bank.height;
  for (const [layer, speed] of cloudLayers) {
    const ly = speed * (bank.top - edgeAtMiddle);
    layer.style.visibility = ly < vh && ly + layer.offsetHeight > 0 ? "visible" : "hidden";
    layer.style.transform = `translate3d(0, ${ly.toFixed(1)}px, 0)`;
  }

  // The logo and its button go behind the bank: masked with clouds-mask.webp (clear
  // where the bank has any cloud, even haze), kept on the bank's place and its drift,
  // and in full above the bank's top. Followed frame by frame while the bank's edge is
  // over them (the bank keeps drifting when the page doesn't scroll).
  following = false;
  for (const el of [logo, watch]) {
    const r = el.getBoundingClientRect();
    const k = el.offsetWidth ? r.width / el.offsetWidth : 1; // the logo's own shrinking
    const my = (bank.top - r.top) / k;
    if (my > el.offsetHeight) {
      el.style.webkitMaskImage = el.style.maskImage = "";
      continue;
    }
    if (my > -0.25 * bank.height / k) following = true;
    el.style.webkitMaskImage = el.style.maskImage = "linear-gradient(#000, #000), url(clouds-mask.webp)";
    el.style.webkitMaskRepeat = el.style.maskRepeat = "no-repeat, repeat-x";
    el.style.webkitMaskSize = el.style.maskSize = `100% ${Math.max(0, my).toFixed(1)}px, auto ${(bank.height / k).toFixed(1)}px`;
    el.style.webkitMaskPosition = el.style.maskPosition =
      `0 0, ${((cloudTile.getBoundingClientRect().left - r.left) / k).toFixed(1)}px ${my.toFixed(1)}px`;
  }

  // The video plays (looping) while it's on screen and pauses when it isn't.
  const filmBox = film.getBoundingClientRect();
  const onScreen = filmBox.top < window.innerHeight && filmBox.bottom > 0;
  // (Not waiting for a frame first: iPhones load none until they're asked to play.) Both
  // clips while the full-quality one fades in; not that one while it's still loading.
  for (const v of stage.querySelectorAll("video")) {
    if (v.dataset.loading) continue;
    if (onScreen && v.paused) v.play().catch(() => {});
    else if (!onScreen && !v.paused) v.pause();
  }

  // The hand-over from scrolling to zooming: over the last stretch (BLEND, either side
  // of the moment the video fills the screen) the video slows down into place instead
  // of stopping dead, while the zoom (straight in, from the centre) already begins. The
  // zoom grows the video past its edges, so it always covers the space the slowing leaves.
  // Halfway into the zoom it starts to blur, not all the way: the synopsis sits on it.
  const BLEND = 0.2 * window.innerHeight;
  const t = filmBox.top; // where the video would be, scrolling with the page
  const eased = t >= BLEND ? t : t <= -BLEND ? 0 : (t + BLEND) ** 2 / (4 * BLEND); // where it is
  const lag = eased - Math.max(t, 0); // the stage stops at the top of the screen (sticky)
  const ZOOMED = 0.49 * window.innerHeight; // fully zoomed this far past the video filling the screen
  const into = ease(range(BLEND - t, 0, BLEND + ZOOMED));
  const moved = `translate3d(0, ${lag.toFixed(1)}px, 0) scale(${1 + 0.6 * into})`;
  const blur = range(into, 0.5, 1);
  // (both clips, while the full-quality one fades in over the light one)
  for (const v of stage.querySelectorAll("video")) {
    v.style.transform = moved;
    v.style.filter = blur > 0 ? `blur(${16 * blur}px)` : "";
  }
  wash.style.opacity = ease(blur);

  // Over the last steps of the video's blur, the poster and synopsis come into focus in
  // place, growing slightly from a blur (a cross-blur: one goes soft as the other sharpens, ending
  // together), and stay to be read until the end of the page.
  // Phones: the same, with the poster a little below the middle of the screen, and from
  // the moment it starts to show, scrolling moves it all up, like the rest of a page,
  // over the video, which stays put.
  const shown = ease(range(blur, 0.6, 1));
  if (phone.matches) {
    const y = Math.max(-storyExtra, storyStart - Math.max(0, -t - STORY_FROM * window.innerHeight));
    filmStory.style.opacity = shown;
    filmStory.style.filter = shown < 1 ? `blur(${16 * (1 - shown)}px)` : "";
    filmStory.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)` +
      (shown < 1 ? ` scale(${0.88 + 0.12 * shown})` : "");
  } else {
    filmStory.style.opacity = shown;
    filmStory.style.filter = shown < 1 ? `blur(${16 * (1 - shown)}px)` : "";
    filmStory.style.transform = shown < 1 ? `scale(${0.88 + 0.12 * shown})` : ""; // and zooms in as it sharpens
  }
  filmStory.classList.toggle("shown", shown > 0.5);

  // Safari's bands around its address bar (iPhone) take the page's colour; it follows
  // what's at the top of the screen: the sky, the clouds (their thick part, until they
  // have scrolled away), the video, then the blurred video behind the synopsis.
  const cloudsBox = introClouds.getBoundingClientRect();
  const cloudsAtTop = cloudsBox.top + 0.28 * cloudsBox.height <= 0 && cloudsBox.top + 0.84 * cloudsBox.height > 0;
  const tone = shown > 0.5 ? "#454941"
    : cloudsAtTop ? "#9ea9ae"
    : cloudsBox.top + 0.28 * cloudsBox.height > 0 ? "#939ca2"
    : "#8f9ea5";
  if (tone !== pageTone) root.style.setProperty("--page", (pageTone = tone));

  ticking = false;
  if (following && root.classList.contains("loaded")) requestUpdate();
}

let pageTone = "";
let following = false; // the logo's mask is following the drifting bank
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
const mid = new Image();
mid.src = "clouds-mid.webp";
const veil = new Image();
veil.src = "clouds-veil.webp";
const mask = new Image();
mask.src = "clouds-mask.webp";
const images = [logo, sky, clouds, mid, veil, mask];

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

// The whole light clip (under 1 MB), read piece by piece to show progress, so it's in
// the browser's cache when the page opens. The video keeps its normal address (iPhones don't reliably
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

// Once the page is in, the full-quality clip loads behind the light one (playing,
// muted and unseen: iPhones load nothing until asked to play). When it can play
// through, it's put in step with the light one and fades in over it.
function loadFullVideo() {
  const full = video.cloneNode();
  full.removeAttribute("poster");
  full.src = "bg2.mp4";
  full.preload = "auto";
  full.muted = true;
  full.style.opacity = "0";
  full.dataset.loading = "1";
  video.after(full);
  full.play().catch(() => {});
  full.addEventListener("canplaythrough", () => {
    full.addEventListener("seeked", () => {
      delete full.dataset.loading; // from now on it plays and pauses with the light one
      if (video.paused) full.pause();
      else full.play().catch(() => {});
      full.style.transition = "opacity 0.8s ease";
      full.style.opacity = "1";
      setTimeout(() => {
        const light = video;
        video = full;
        light.remove();
        full.style.transition = "";
        requestUpdate();
      }, 900);
    }, { once: true });
    full.currentTime = video.currentTime;
  }, { once: true });
}

function reveal() {
  if (!root.classList.contains("loading")) return;
  window.scrollTo(0, 0);
  bar.style.transform = "scaleX(1)";
  pct.textContent = "100%";
  setTimeout(() => {
    root.classList.remove("loading");
    root.classList.add("revealing");
    loadFullVideo();
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


video.addEventListener("loadeddata", requestUpdate); // start it if it's already on screen

window.addEventListener("scroll", requestUpdate, { passive: true });
// Phones: the laurels above the logo drift right to left for ever, one copy following
// the other. A finger can drag them either way; let go, and they glide on with the
// throw, easing back into the steady drift.
const belt = document.querySelector(".logo-laurels");
const track = belt.querySelector(".laurel-track");
const DRIFT = -24; // px per second, to the left
const BELT_GAP = 18; // the gap after each copy, as in style.css
let beltX = 0, beltV = DRIFT, beltLast = 0, drag = null;
function beltStep(now) {
  const dt = Math.min(0.05, (now - (beltLast || now)) / 1000);
  beltLast = now;
  const w = track.firstElementChild.offsetWidth + BELT_GAP; // one copy and its gap
  if (w > BELT_GAP && belt.offsetParent) {
    if (!drag) {
      beltV += (DRIFT - beltV) * Math.min(1, dt * 1.5);
      beltX += beltV * dt;
    }
    beltX = ((beltX % w) + w) % w - w; // always between one copy to the left and none
    track.style.transform = `translate3d(${beltX.toFixed(1)}px, 0, 0)`;
  }
  requestAnimationFrame(beltStep);
}
requestAnimationFrame(beltStep);
belt.addEventListener("pointerdown", (e) => {
  drag = { x: e.clientX, from: beltX, t: e.timeStamp, lastX: e.clientX };
  belt.setPointerCapture(e.pointerId);
});
belt.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dt = (e.timeStamp - drag.t) / 1000;
  if (dt > 0) beltV = Math.max(-1500, Math.min(1500, (e.clientX - drag.lastX) / dt)); // the throw, if let go now
  drag.t = e.timeStamp;
  drag.lastX = e.clientX;
  beltX = drag.from + (e.clientX - drag.x);
});
const letGo = () => { drag = null; };
belt.addEventListener("pointerup", letGo);
belt.addEventListener("pointercancel", letGo);

// Larger screens: on short ones, scale the poster and synopsis down until they fit.
// Phones: they stack and scroll instead, so the film section gets the extra length.
const phone = window.matchMedia("(max-width: 767px)");
// Phones: the video starts 2 seconds in the first time; it then loops whole, as on
// larger screens (the poster is that 2-second frame).
const PHONE_START = 2;
if (phone.matches) {
  video.poster = "bg2-poster-mobile.webp";
  const toStart = () => { if (video.currentTime < PHONE_START) video.currentTime = PHONE_START; };
  if (video.readyState >= 1) toStart();
  else video.addEventListener("loadedmetadata", toStart, { once: true });
}
let storyExtra = 0; // how much taller than the screen the stacked synopsis is
let storyStart = 0; // phones: how far down it sits as it starts to show
// Phones: the synopsis starts to show (the video's blur at 60%, so its zoom at 0.8)
// this far past the video filling the screen, × the screen height.
const STORY_FROM = 0.29;
function fitStory() {
  story.style.transform = "";
  if (phone.matches) {
    // the poster's middle at 68% of the screen as it starts to show; it zooms in around
    // that middle
    const poster = story.querySelector(".poster");
    const middle = poster.offsetTop + poster.offsetHeight / 2;
    // (measured against the screen above Safari's bars; the stage reaches under them)
    const view = document.documentElement.clientHeight;
    storyStart = Math.max(0, 0.68 * view - middle);
    filmStory.style.transformOrigin = `50% ${middle}px`;
    storyExtra = Math.max(0, filmStory.offsetHeight - view);
    // room to scroll it up from there until its end is at the bottom (and for the zoom
    // to finish, if that's longer)
    const travel = Math.max(STORY_FROM * window.innerHeight + storyStart + storyExtra, 0.49 * window.innerHeight);
    film.style.height = `${stage.clientHeight + travel}px`;
    return;
  }
  filmStory.style.transformOrigin = "";
  storyExtra = 0;
  film.style.height = "";
  const room = filmStory.clientHeight - parseFloat(getComputedStyle(filmStory).paddingTop) - parseFloat(getComputedStyle(filmStory).paddingBottom);
  const need = story.offsetHeight;
  if (need > room) story.style.transform = `scale(${room / need})`;
}
fitStory();
window.addEventListener("resize", fitStory);
document.fonts && document.fonts.ready.then(() => { fitStory(); requestUpdate(); });

window.addEventListener("resize", () => { measure(); requestUpdate(); });
video.addEventListener("loadedmetadata", requestUpdate);
measure();
update();
