// The journey section is tall and its stage is pinned; scroll progress p (0 → 1)
// through it drives the sequence. Each step lists the slice of p it runs in:
//   0.03 – 0.2   flying into the storm clouds: they grow closer, the mist thickens
//                until it fills the screen and the logo is lost inside it
//   0.25 – 0.33  the mist in front thins; the text surfaces inside the cloud
//   0.33 – 0.48  the text stays
//   0.48 – 0.58  the mist closes in again and the text is gone
//   0.62 – 0.86  coming out of the cloud's base: the mist lifts away and the video
//                appears beneath, mist lingering at the top
//   0.62 – 1     scrolling plays the clip
const journey = document.querySelector(".journey");
const sky = document.querySelector(".sky");
const storm = document.querySelector(".storm");
const logo = document.querySelector(".logo");
const videoWrap = document.querySelector(".video-wrap");
const video = videoWrap.querySelector("video");
const mistBack = document.querySelector(".mist-back");
const mistFront = document.querySelector(".mist-front");
const mistTextures = [...document.querySelectorAll(".mist-tex")];
const cloudText = document.querySelector(".cloud-text");

// Phones only: the video fills the screen's height (cropped at the sides) and pans
// across while it plays. 0% = its left edge, 100% = its right edge.
const mobile = window.matchMedia("(max-width: 767px)");
const PAN_FROM = 0;
const PAN_TO = 100;

// 0 before a, 1 after b, linear in between.
const range = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

// How thick the mist in front of the text is: closes in, thins for the text, closes again.
function frontMist(p) {
  if (p < 0.25) return ease(range(p, 0.08, 0.2));
  if (p < 0.48) return lerp(1, 0.1, ease(range(p, 0.25, 0.33)));
  return lerp(0.1, 1, ease(range(p, 0.48, 0.58)));
}

function update() {
  const scrollable = journey.offsetHeight - window.innerHeight;
  const p = Math.min(1, Math.max(0, -journey.getBoundingClientRect().top / scrollable));

  // The sky photo drifts up slowly.
  sky.style.transform = `translateY(${-20 * ease(range(p, 0, 0.3))}vh)`;

  // Flying into the storm clouds: they rise and grow, filling the view.
  const into = ease(range(p, 0.02, 0.24));
  storm.style.transform = `translateY(${-30 * into}vh) scale(${1 + 1.6 * into})`;

  // Mist: the back one fills the screen; the front one, over the text, breathes.
  mistBack.style.opacity = ease(range(p, 0.05, 0.2));
  mistFront.style.opacity = frontMist(p);
  mistTextures.forEach((tex, i) => {
    tex.style.transform = `translateX(${-p * (20 + i * 9)}%)`;
  });

  // Logo, text and video are only ever switched while the mist hides them completely.
  logo.style.opacity = 1 - range(p, 0.2, 0.21);
  cloudText.style.opacity = range(p, 0.21, 0.22) * (1 - range(p, 0.585, 0.595));
  videoWrap.style.opacity = range(p, 0.3, 0.31);

  // Coming out of the cloud's base: the mist (soft lower edge) lifts away upward and
  // the video settles into place beneath it.
  const out = ease(range(p, 0.62, 0.86));
  const lift = -118 * out;
  mistBack.style.transform = `translateY(${lift}vh)`;
  mistFront.style.transform = `translateY(${lift * 1.08}vh)`;
  videoWrap.style.transform = `translateY(${(1 - out) * 10}vh) scale(${1.12 - 0.12 * out})`;

  // Scrolling plays the clip.
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
