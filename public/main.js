// Homepage: everything scrolls naturally. This shows the loading screen until the
// fonts, images and a light version of the video are all in (the full-quality one then
// loads behind it and fades in), shrinks the logo as the clouds come over it,
// plays the video (looping) while it is on screen, and blurs it as you
// scroll on, for the synopsis to sit on.
const root = document.documentElement;
const logo = document.querySelector(".intro-logo img");
const textTrack = document.querySelector(".cloud-text-track");
const cloudText = document.querySelector(".cloud-text");
const logoHold = document.querySelector(".intro-logo-hold");
const quotes = [...cloudText.querySelectorAll(".quote")];
// The texts' rhythm, in screens of scrolling: the first's middle moment, then one every
// TEXT_EVERY; through the middle they slow to (1 - TEXT_EASE) of the scrolling, over
// about TEXT_SLOW either side.
const TEXT_FIRST = -0.18;
const TEXT_EVERY = 0.75;
const TEXT_EASE = 0.8;
const TEXT_SLOW = 0.2;
const film = document.querySelector(".film");
const stage = film.querySelector(".film-stage");
let video = film.querySelector("video"); // the light clip first, then the full-quality one
const wash = film.querySelector(".film-wash");
const filmStory = film.querySelector(".film-story");
const story = filmStory.querySelector(".story");
const introClouds = document.querySelector(".intro-clouds");
const flow = document.querySelector(".flow");
const introLogo = document.querySelector(".intro-logo");
const cloudTile = document.querySelector(".clouds");
// Clouds nearer than the bank, how much faster than it they move, and where they start:
// puffs behind the texts, with their top at the top of the screen when the bank's edge
// (12% down it) reaches the middle of the screen; thin wisps in front of them, higher
// (by this many screen heights), so they're already up in the sky over the logo when
// the page opens and their shadows fall on it.
const cloudLayers = [
  [document.querySelector(".clouds-mid"), 1.7, 0],
  [document.querySelector(".clouds-veil"), 2.7, -1.05]
].filter(([layer]) => layer); // (a page from before a layer existed still works)
const watch = document.querySelector(".intro-logo .watch");
const logoShade = document.querySelector(".logo-shade img");
const shadedWords = [...document.querySelectorAll(".honours p, .logline p, .quote blockquote")];
const pressShades = [...document.querySelectorAll(".quote .shade")];

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

  // The texts, one after another, each the same: it rises in from below, fading in,
  // slows softly through the middle of the screen (a brief, gentle pause, never a
  // stop), then rises on, fading out, as the next rises in; the last stays in the
  // middle and goes behind the cumulus near the bank's bottom (below). u is how far the track has
  // scrolled past the top of the screen, in screens; each text's middle moment is
  // TEXT_FIRST + its place × TEXT_EVERY. They're fixed to the screen and only this moves
  // them (no fight with the page's own scrolling, so they don't tremble).
  following = false;
  const vh = window.innerHeight;
  const u = (window.scrollY - trackTop) / vh;
  let anyShown = false;
  quotes.forEach((q, i) => {
    const s = TEXT_FIRST + i * TEXT_EVERY - u; // screens of scrolling until its middle moment
    let y = s - TEXT_EASE * TEXT_SLOW * Math.tanh(s / TEXT_SLOW); // where it is: slower near the middle
    // the last (Variety) stays in the middle once there, until the clouds take it
    if (i === quotes.length - 1 && s < 0) y = 0;
    const shown = 1 - ease(range(Math.abs(y), 0.15, 0.3));
    q.style.opacity = shown.toFixed(3);
    q.style.transform = `translate3d(0, ${(y * vh).toFixed(1)}px, 0)`;
    if (shown > 0) anyShown = true;
  });
  cloudText.style.transform = "";
  const y = anyShown ? 0 : vh; // (for the visibility below)

  // ...behind those clouds: masked with clouds-below-mask.webp (opaque down to the
  // cumulus near the bank's bottom), kept on the bank's place and its drift, once the
  // bank's top is above the text; hidden once the cumulus has covered the last quote.
  const bank = introClouds.getBoundingClientRect();
  const textBox = cloudText.getBoundingClientRect();
  const lastBox = quotes[quotes.length - 1].getBoundingClientRect();
  const behind = bank.top < textBox.top;
  cloudText.style.visibility = y < vh && bank.top + 0.92 * bank.height > lastBox.top ? "visible" : "hidden";
  cloudText.style.webkitMaskImage = cloudText.style.maskImage = behind ? "url(clouds-below-mask.webp)" : "";
  if (behind) {
    cloudText.style.webkitMaskRepeat = cloudText.style.maskRepeat = "repeat-x";
    cloudText.style.webkitMaskSize = cloudText.style.maskSize = `auto ${bank.height.toFixed(1)}px`;
    cloudText.style.webkitMaskPosition = cloudText.style.maskPosition =
      `${(cloudTile.getBoundingClientRect().left - textBox.left).toFixed(1)}px ${(bank.top - textBox.top).toFixed(1)}px`;
    if (bank.top + 0.92 * bank.height > textBox.top && bank.top + 0.8 * bank.height < textBox.bottom) following = true;
  }

  // The sky behind the logo moves up, at a quarter of the scrolling (it's far away).
  introLogo.style.setProperty("--sky-y", `${(-0.25 * Math.min(window.scrollY, logoHold.offsetHeight)).toFixed(1)}px`);

  // The nearer clouds; they fade away as the video comes up (gone before its top reaches
  // the middle of the screen).
  const edgeAtMiddle = 0.5 * vh - 0.12 * bank.height;
  const filmUp = film.getBoundingClientRect().top / vh;
  const nearGone = range(filmUp, 0.95, 0.55);
  for (const [layer, speed, lead] of cloudLayers) {
    const ly = speed * (bank.top - edgeAtMiddle) + lead * vh;
    layer.dataset.over = ly < vh && ly + layer.offsetHeight > 0 ? "1" : ""; // its strip is over the screen
    layer.style.visibility = nearGone < 1 && layer.dataset.over ? "visible" : "hidden";
    layer.style.opacity = (1 - nearGone).toFixed(3);
    layer.style.transform = `translate3d(0, ${ly.toFixed(1)}px, 0)`;
  }

  // The logo goes behind the bank (not its button, which stays readable): masked with clouds-mask.webp (clear
  // where the bank has any cloud, even haze), kept on the bank's place and its drift,
  // and in full above the bank's top. Followed frame by frame while the bank's edge is
  // over them (the bank keeps drifting when the page doesn't scroll).
  for (const el of [logo]) {
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

  // The wisps' shadows on the letters: the sun is high up, so each wisp casts its shape
  // well below itself on the screen (clouds-shade.webp has them there already: almost
  // half a screen lower, none behind a wisp), darkening the logo, the texts and the
  // press logos under it; following its drift (frame by frame while the wisps are on
  // screen).
  const veil = document.querySelector(".clouds-veil");
  // (while the strip is over the screen, even once the wisps have faded: their shadows
  // stay until the words go behind the clouds)
  const shades = !!veil && !!veil.dataset.over;
  const shape = shades ? veil.firstElementChild.getBoundingClientRect() : null; // the drifting strip
  const tileH = 10.6 * vh, tileW = 2.4 * vh; // the strip's size (style.css)
  if (logoShade) logoShade.style.visibility = shades ? "visible" : "hidden";
  if (shades) following = true;
  if (shades && logoShade) {
    const r = logoShade.getBoundingClientRect();
    const k = logoShade.offsetWidth ? r.width / logoShade.offsetWidth : 1;
    const own = `${((shape.left - r.left) / k).toFixed(1)}px ${((shape.top - r.top) / k).toFixed(1)}px`;
    const ownSize = `${(tileW / k).toFixed(1)}px ${(tileH / k).toFixed(1)}px`;
    if (logo.style.maskImage) {
      // and only where the logo itself isn't behind the bank
      logoShade.style.webkitMaskImage = logoShade.style.maskImage = "url(clouds-shade.webp), " + logo.style.maskImage;
      logoShade.style.webkitMaskSize = logoShade.style.maskSize = ownSize + ", " + logo.style.maskSize;
      logoShade.style.webkitMaskPosition = logoShade.style.maskPosition = own + ", " + logo.style.maskPosition;
      logoShade.style.webkitMaskRepeat = logoShade.style.maskRepeat = "repeat-x, " + logo.style.maskRepeat;
      logoShade.style.webkitMaskComposite = "source-in, source-over";
      logoShade.style.maskComposite = "intersect, add";
    } else {
      logoShade.style.webkitMaskImage = logoShade.style.maskImage = "url(clouds-shade.webp)";
      logoShade.style.webkitMaskSize = logoShade.style.maskSize = ownSize;
      logoShade.style.webkitMaskPosition = logoShade.style.maskPosition = own;
      logoShade.style.webkitMaskRepeat = logoShade.style.maskRepeat = "repeat-x";
      logoShade.style.webkitMaskComposite = logoShade.style.maskComposite = "";
    }
    logoShade.style.transform = logo.style.transform;
  }
  for (const el of pressShades) {
    el.style.visibility = shades ? "visible" : "hidden";
    if (!shades) continue;
    const r = el.getBoundingClientRect();
    el.style.webkitMaskImage = el.style.maskImage = "url(clouds-shade.webp)";
    el.style.webkitMaskRepeat = el.style.maskRepeat = "repeat-x";
    el.style.webkitMaskSize = el.style.maskSize = `${tileW.toFixed(1)}px ${tileH.toFixed(1)}px`;
    el.style.webkitMaskPosition = el.style.maskPosition =
      `${(shape.left - r.left).toFixed(1)}px ${(shape.top - r.top).toFixed(1)}px`;
  }
  for (const el of shadedWords) {
    if (!shades) { el.style.backgroundSize = "0 0, 100% 100%"; continue; }
    const r = el.getBoundingClientRect();
    el.style.backgroundSize = `${tileW.toFixed(1)}px ${tileH.toFixed(1)}px, 100% 100%`;
    el.style.backgroundPosition = `${(shape.left - r.left).toFixed(1)}px ${(shape.top - r.top).toFixed(1)}px, 0 0`;
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

  // The hand-over from scrolling to blurring: over the last stretch (BLEND, either side
  // of the moment the video fills the screen) the video slows down into place instead
  // of stopping dead, while the blur already begins (not all the way: the synopsis
  // sits on it). No zoom.
  const BLEND = 0.2 * window.innerHeight;
  const t = filmBox.top; // where the video would be, scrolling with the page
  const eased = t >= BLEND ? t : t <= -BLEND ? 0 : (t + BLEND) ** 2 / (4 * BLEND); // where it is
  const lag = eased - Math.max(t, 0); // the stage stops at the top of the screen (sticky)
  const ZOOMED = 0.49 * window.innerHeight; // fully blurred this far past the video filling the screen
  const moved = `translate3d(0, ${lag.toFixed(1)}px, 0)`;
  // it starts to blur a little after it has settled (a tenth of a screen), done at the
  // same point as before
  const blur = ease(range(-t, 0.1 * window.innerHeight, ZOOMED));
  // (both clips, while the full-quality one fades in over the light one)
  // The clouds over the video's top slow down with it, so they settle together (they
  // reach their place, 32vh down, at the same moment it fills the screen).
  introClouds.style.transform = lag ? `translate3d(0, ${lag.toFixed(1)}px, 0)` : "";
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

  // The clouds over the video blur with it, and dissolve as the synopsis comes into focus.
  introClouds.style.filter = blur > 0 ? `blur(${(16 * blur).toFixed(1)}px)` : "";
  introClouds.style.opacity = (1 - shown).toFixed(3);

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
const shade = new Image();
shade.src = "clouds-shade.webp";
const images = [logo, sky, clouds, mid, veil, mask, shade];

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
const BELT_GAP = 27; // the gap after each copy, as in style.css
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
// Phones: the synopsis starts to show (the video's blur at 60%) this far past the
// video filling the screen, × the screen height (with the blur from 0.1 to 0.49).
const STORY_FROM = 0.32;
// A little scrolling room at the very end (× the screen height), with everything in
// place, so the page doesn't stop dead on the last step.
const END_ROOM = 0.25;
function fitStory() {
  fitFilm();
  // The clouds stay over the video to the end (they're let go where the film ends, as
  // the page does), as it stays put.
  const flowBox = flow.getBoundingClientRect();
  flow.style.height = `${(film.getBoundingClientRect().bottom - flowBox.top).toFixed(1)}px`;
}
function fitFilm() {
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
    // room to scroll it up from there until its end is at the bottom (and for the blur
    // to finish, if that's longer)
    const travel = Math.max(STORY_FROM * window.innerHeight + storyStart + storyExtra, 0.49 * window.innerHeight) +
      END_ROOM * window.innerHeight;
    film.style.height = `${stage.clientHeight + travel}px`;
    return;
  }
  // Larger screens: the page ends a little after the synopsis comes fully into focus
  // (the blur done, 0.49 of a screen past the video filling it; then END_ROOM, so it
  // doesn't stop dead); on short screens, the poster and synopsis are scaled down until
  // they fit their screen.
  filmStory.style.transformOrigin = "";
  storyExtra = 0;
  film.style.height = `${stage.clientHeight + (0.49 + END_ROOM) * window.innerHeight}px`;
  const screen = story.parentElement;
  const room = screen.clientHeight - parseFloat(getComputedStyle(screen).paddingTop) - parseFloat(getComputedStyle(screen).paddingBottom);
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
