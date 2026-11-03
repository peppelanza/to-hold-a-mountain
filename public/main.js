// The journey section is tall and its stage is pinned; scroll progress p (0 → 1)
// through it drives the sequence. Each step lists the slice of p it runs in:
//   0    – 0.1   logo fades; storm clouds already low on the screen
//   0.02 – 0.48  rising through the storm photo layers, fog thickening, text in the sky
//   0.34 – 0.58  passing through a close cloud; the cloud bank is there behind it
//   0.62 – 0.9   the cloud bank carries the video up to fill the screen
//   0.62 – 1     scrolling plays the clip
const journey = document.querySelector(".journey");
const sky = document.querySelector(".sky");
const logo = document.querySelector(".logo");
const stormFar = document.querySelector(".storm-far");
const stormMid = document.querySelector(".storm-mid");
const stormNear = document.querySelector(".storm-near");
const rise = document.querySelector(".rise");
const cloudLayers = [...document.querySelectorAll(".cloud-layer")];
const cloudText = document.querySelector(".cloud-text");
const fogBack = document.querySelector(".fog-back");
const fogFront = document.querySelector(".fog-front");
const video = document.querySelector("video");

// Phones only: the video fills the screen's height (cropped at the sides) and pans
// across while it plays. 0% = its left edge, 100% = its right edge.
const mobile = window.matchMedia("(max-width: 767px)");
const PAN_FROM = 0;
const PAN_TO = 100;

// 0 before a, 1 after b, linear in between.
const range = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

// Where the video's top edge is (vh from the top of the screen) at progress p:
// the cloud bank rises into view, lingers, then carries the video up to fill the screen.
function videoTop(p) {
  if (p < 0.5) return lerp(175, 85, ease(range(p, 0.3, 0.5)));
  if (p < 0.62) return lerp(85, 75, range(p, 0.5, 0.62));
  return lerp(75, 0, ease(range(p, 0.62, 0.9)));
}

function update() {
  const scrollable = journey.offsetHeight - window.innerHeight;
  const p = Math.min(1, Math.max(0, -journey.getBoundingClientRect().top / scrollable));

  // Logo: rises and fades as soon as scrolling starts.
  const logoOut = ease(range(p, 0, 0.1));
  logo.style.opacity = 1 - logoOut;
  logo.style.transform = `translateY(${-12 * logoOut}vh) scale(${1 - 0.05 * logoOut})`;

  // The sky photo drifts up slowly behind everything.
  sky.style.transform = `translateY(${-30 * ease(range(p, 0, 0.5))}vh)`;

  // Storm photo layers: the far one (seen on arrival) rises slowly, the mirrored one
  // behind it faster (parallax); both give way to the cloud bank.
  stormFar.style.transform = `translateY(${-70 * ease(range(p, 0.02, 0.42))}vh)`;
  stormFar.style.opacity = 1 - ease(range(p, 0.42, 0.56));
  stormMid.style.transform = `translateY(${-150 * ease(range(p, 0.1, 0.48))}vh) scaleX(-1)`;
  stormMid.style.opacity = 0.9 * ease(range(p, 0.1, 0.2)) * (1 - ease(range(p, 0.44, 0.56)));

  // A close, soft cloud sweeps up across the whole screen: flying through it.
  stormNear.style.transform = `translateY(${-280 * range(p, 0.34, 0.58)}vh)`;
  stormNear.style.opacity = 0.95 * ease(range(p, 0.34, 0.4)) * (1 - ease(range(p, 0.52, 0.58)));

  // Video and its cloud bank rise together; each cloud layer lags or leads a little
  // (parallax) and drifts sideways, and the clip drifts inside its own frame.
  const top = videoTop(p);
  rise.style.transform = `translateY(${top}vh)`;
  cloudLayers.forEach((layer, i) => {
    const depth = parseFloat(layer.dataset.depth);
    const drift = parseFloat(layer.dataset.drift);
    layer.style.transform = `translate(${drift * p}vw, ${top * (depth - 1)}vh)`;
    // Each layer condenses out of the fog a little after the one behind it.
    layer.style.opacity = ease(range(p, 0.32 + i * 0.04, 0.5 + i * 0.04));
  });
  video.style.transform = `translateY(${-0.07 * top}vh)`;

  // Fog: thickens through the storm, drifting sideways; the front layer thins a
  // little once the video fills the screen, leaving a haze over its sky.
  fogBack.style.opacity = ease(range(p, 0.06, 0.35));
  fogBack.style.transform = `translate(${-p * 30}%, ${(1 - ease(range(p, 0.06, 0.4))) * 18}vh)`;
  fogFront.style.opacity = 0.7 * ease(range(p, 0.34, 0.52)) * (1 - 0.4 * ease(range(p, 0.75, 0.95)));
  fogFront.style.transform = `translateX(${-p * 18}%)`;

  // Text in the sky, above the storm clouds.
  const textIn = ease(range(p, 0.12, 0.18));
  const textOut = ease(range(p, 0.3, 0.36));
  cloudText.style.opacity = textIn * (1 - textOut);
  cloudText.style.transform = `translateY(${(1 - textIn) * 4 - textOut * 6}vh)`;

  // Scrolling plays the clip while it rises and once it fills the screen.
  const play = range(p, 0.62, 1);
  if (video.duration) {
    const t = play * (video.duration - 0.05);
    if (Math.abs(video.currentTime - t) > 0.01) video.currentTime = t;
  }
  video.style.objectPosition = mobile.matches ? `${lerp(PAN_FROM, PAN_TO, play)}% 50%` : "";

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
