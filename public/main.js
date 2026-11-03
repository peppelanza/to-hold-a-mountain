// The journey section is tall and its stage is pinned; scroll progress p (0 → 1)
// through it drives the sequence. Each step lists the slice of p it runs in:
//   0.04 – 0.18  a thick cloud rises over the logo and hides it
//   0.22 – 0.32  that cloud moves on upward, uncovering the text behind it
//   0.32 – 0.46  the text stays in view
//   0.46 – 0.56  a second thick cloud rises over the text
//   0.54 – 0.7   passing through a close cloud; the cloud bank is there behind it
//   0.78 – 0.95  the cloud bank carries the video up to fill the screen
//   0.78 – 1     scrolling plays the clip
const journey = document.querySelector(".journey");
const sky = document.querySelector(".sky");
const logo = document.querySelector(".logo");
const stormFar = document.querySelector(".storm-far");
const coverA = document.querySelector(".storm-cover-a");
const coverB = document.querySelector(".storm-cover-b");
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
  if (p < 0.74) return lerp(175, 85, ease(range(p, 0.6, 0.74)));
  if (p < 0.78) return lerp(85, 75, range(p, 0.74, 0.78));
  return lerp(75, 0, ease(range(p, 0.78, 0.95)));
}

function update() {
  const scrollable = journey.offsetHeight - window.innerHeight;
  const p = Math.min(1, Math.max(0, -journey.getBoundingClientRect().top / scrollable));

  // Logo and text never fade in view: they are switched only while a thick cloud
  // covers the centre of the screen (at 0.19 and 0.57).
  logo.style.opacity = 1 - range(p, 0.185, 0.195);
  cloudText.style.opacity = range(p, 0.195, 0.205) * (1 - range(p, 0.565, 0.575));

  // The sky photo drifts up slowly behind everything.
  sky.style.transform = `translateY(${-30 * ease(range(p, 0, 0.6))}vh)`;

  // The far storm layer (seen on arrival) rises slowly the whole way, then gives way.
  stormFar.style.transform = `translateY(${-70 * ease(range(p, 0.02, 0.56))}vh)`;
  stormFar.style.opacity = 1 - ease(range(p, 0.56, 0.66));

  // Thick cloud A: rises over the logo, lingers, then moves on up and off the screen,
  // its soft lower edge uncovering the text.
  let a;
  if (p < 0.18) a = lerp(0, -95, ease(range(p, 0.04, 0.18)));
  else if (p < 0.22) a = lerp(-95, -110, range(p, 0.18, 0.22));
  else a = lerp(-110, -235, ease(range(p, 0.22, 0.34)));
  coverA.style.transform = `translateY(${a}vh) scaleX(-1)`;

  // Thick cloud B: rises over the text, then thins as the cloud bank arrives behind it.
  coverB.style.transform = `translateY(${lerp(0, -105, ease(range(p, 0.46, 0.58))) - 25 * range(p, 0.58, 0.7)}vh)`;
  coverB.style.opacity = 1 - ease(range(p, 0.62, 0.7));

  // A close, soft cloud sweeps up across the whole screen: flying through it.
  stormNear.style.transform = `translateY(${-280 * range(p, 0.54, 0.72)}vh)`;
  stormNear.style.opacity = 0.95 * ease(range(p, 0.54, 0.59)) * (1 - ease(range(p, 0.67, 0.72)));

  // Video and its cloud bank rise together; each cloud layer lags or leads a little
  // (parallax) and drifts sideways, and the clip drifts inside its own frame.
  const top = videoTop(p);
  rise.style.transform = `translateY(${top}vh)`;
  cloudLayers.forEach((layer, i) => {
    const depth = parseFloat(layer.dataset.depth);
    const drift = parseFloat(layer.dataset.drift);
    layer.style.transform = `translate(${drift * p}vw, ${top * (depth - 1)}vh)`;
    // Each layer condenses out of the fog a little after the one behind it.
    layer.style.opacity = ease(range(p, 0.56 + i * 0.04, 0.7 + i * 0.04));
  });
  video.style.transform = `translateY(${-0.07 * top}vh)`;

  // Fog: thickens through the storm, drifting sideways; the front layer thins a
  // little once the video fills the screen, leaving a haze over its sky.
  fogBack.style.opacity = ease(range(p, 0.06, 0.45));
  fogBack.style.transform = `translate(${-p * 30}%, ${(1 - ease(range(p, 0.06, 0.5))) * 18}vh)`;
  fogFront.style.opacity = 0.7 * ease(range(p, 0.56, 0.72)) * (1 - 0.4 * ease(range(p, 0.88, 0.98)));
  fogFront.style.transform = `translateX(${-p * 18}%)`;

  // Scrolling plays the clip while it rises and once it fills the screen.
  const play = range(p, 0.78, 1);
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
