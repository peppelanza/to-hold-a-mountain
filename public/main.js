// The journey section is tall and its stage is pinned; scroll progress p (0 → 1)
// through it drives the sequence. Each step lists the slice of p it runs in.
const journey = document.querySelector(".journey");
const logo = document.querySelector(".logo");
const clouds = [...document.querySelectorAll(".cloud")];
const cloudText = document.querySelector(".cloud-text");
const videoWrap = document.querySelector(".video-wrap");
const video = videoWrap.querySelector("video");

// 0 before a, 1 after b, linear in between.
const range = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const ease = (t) => t * t * (3 - 2 * t);

function update() {
  const scrollable = journey.offsetHeight - window.innerHeight;
  const p = Math.min(1, Math.max(0, -journey.getBoundingClientRect().top / scrollable));

  // Logo: rises and fades as soon as scrolling starts.
  const logoOut = ease(range(p, 0, 0.12));
  logo.style.opacity = 1 - logoOut;
  logo.style.transform = `translateY(${-12 * logoOut}vh) scale(${1 - 0.05 * logoOut})`;

  // Clouds: drift up from below (deeper ones faster), then part sideways and fade.
  const cloudsIn = ease(range(p, 0.04, 0.3));
  const cloudsOut = ease(range(p, 0.44, 0.6));
  for (const cloud of clouds) {
    const depth = parseFloat(cloud.dataset.depth);
    const dir = cloud.dataset.side === "left" ? -1 : 1;
    const y = (1 - cloudsIn) * 90 * depth - range(p, 0.3, 0.44) * 6 * depth;
    const x = cloudsOut * 70 * dir;
    cloud.style.opacity = cloudsIn * (1 - cloudsOut);
    cloud.style.transform = `translate(${x}vw, ${y}vh) scale(${1 + cloudsOut * 0.5})`;
  }

  // Text among the clouds.
  const textIn = ease(range(p, 0.2, 0.27));
  const textOut = ease(range(p, 0.38, 0.45));
  cloudText.style.opacity = textIn * (1 - textOut);
  cloudText.style.transform = `translateY(${(1 - textIn) * 4 - textOut * 4}vh)`;

  // Video: appears behind the parting clouds, then scrolling plays it.
  const videoIn = ease(range(p, 0.46, 0.62));
  videoWrap.style.opacity = videoIn;
  videoWrap.style.transform = `scale(${1.15 - 0.15 * videoIn})`;
  if (video.duration) {
    const t = range(p, 0.55, 1) * (video.duration - 0.05);
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
