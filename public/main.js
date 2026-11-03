// The journey section is tall and its stage is pinned; scroll progress p (0 → 1)
// through it drives the sequence. Each step lists the slice of p it runs in.
const journey = document.querySelector(".journey");
const sky = document.querySelector(".sky");
const logo = document.querySelector(".logo");
const rise = document.querySelector(".rise");
const cloudLayers = [...document.querySelectorAll(".cloud-layer")];
const cloudText = document.querySelector(".cloud-text");
const fogBack = document.querySelector(".fog-back");
const fogFront = document.querySelector(".fog-front");
const video = document.querySelector("video");

// 0 before a, 1 after b, linear in between.
const range = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

// Where the video's top edge is (vh from the top of the screen) at progress p:
// clouds rise into view, linger under the text, then carry the video up to fill the screen.
function videoTop(p) {
  if (p < 0.3) return lerp(175, 85, ease(range(p, 0.03, 0.3)));
  if (p < 0.42) return lerp(85, 75, range(p, 0.3, 0.42));
  return lerp(75, 0, ease(range(p, 0.42, 0.85)));
}

function update() {
  const scrollable = journey.offsetHeight - window.innerHeight;
  const p = Math.min(1, Math.max(0, -journey.getBoundingClientRect().top / scrollable));

  // Logo: rises and fades as soon as scrolling starts.
  const logoOut = ease(range(p, 0, 0.12));
  logo.style.opacity = 1 - logoOut;
  logo.style.transform = `translateY(${-12 * logoOut}vh) scale(${1 - 0.05 * logoOut})`;

  // The sky photo drifts up slowly behind everything.
  sky.style.transform = `translateY(${-28 * ease(range(p, 0, 0.6))}vh)`;

  // Video and its cloud bank rise together; each cloud layer lags or leads a little
  // (parallax) and drifts sideways, and the clip drifts inside its own frame.
  const top = videoTop(p);
  rise.style.transform = `translateY(${top}vh)`;
  cloudLayers.forEach((layer, i) => {
    const depth = parseFloat(layer.dataset.depth);
    const drift = parseFloat(layer.dataset.drift);
    layer.style.transform = `translate(${drift * p}vw, ${top * (depth - 1)}vh)`;
    // Each layer condenses out of the fog a little after the one behind it.
    layer.style.opacity = ease(range(p, 0.05 + i * 0.05, 0.27 + i * 0.05));
  });

  // Fog: thickens first, drifting sideways; the front layer thins a little once the
  // video fills the screen, leaving a haze over its sky.
  fogBack.style.opacity = ease(range(p, 0, 0.22));
  fogBack.style.transform = `translate(${-p * 30}%, ${(1 - ease(range(p, 0, 0.3))) * 18}vh)`;
  fogFront.style.opacity = 0.7 * ease(range(p, 0.08, 0.3)) * (1 - 0.4 * ease(range(p, 0.6, 0.9)));
  fogFront.style.transform = `translateX(${-p * 18}%)`;
  video.style.transform = `translateY(${-0.07 * top}vh)`;

  // Text in the sky above the clouds.
  const textIn = ease(range(p, 0.16, 0.24));
  const textOut = ease(range(p, 0.38, 0.46));
  cloudText.style.opacity = textIn * (1 - textOut);
  cloudText.style.transform = `translateY(${(1 - textIn) * 4 - textOut * 6}vh)`;

  // Scrolling plays the clip while it rises and once it fills the screen.
  if (video.duration) {
    const t = range(p, 0.42, 1) * (video.duration - 0.05);
    if (Math.abs(video.currentTime - t) > 0.01) video.currentTime = t;
  }

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
