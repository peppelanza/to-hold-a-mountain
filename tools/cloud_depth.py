"""Makes the extra cloud layers of the homepage. Needs numpy and Pillow.

    python tools/cloud_depth.py public/clouds.webp <out dir>
    cwebp -q 70 -alpha_q 80 -resize 900 0 <out dir>/clouds-mid.png -o public/clouds-mid.webp
    cwebp -q 70 -alpha_q 80 <out dir>/clouds-veil.png -o public/clouds-veil.webp
    cwebp -lossless <out dir>/clouds-mask.png -o public/clouds-mask.webp

- clouds-mid: soft puffs with the bank's own texture, lit from above (lighter tops,
  darker undersides), scattered down a tall strip; behind the texts, in front of the bank
- clouds-veil: large, very thin wisps; in front of the texts
- clouds-mask: where the bank (clouds.webp) has any cloud, even thin haze, this is
  transparent; the logo is masked with it, so it goes behind the clouds instead of
  showing through them
Noise that wraps at the sides (made in frequency space), so the layers can drift
sideways without a seam.
"""
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
rng = np.random.default_rng(11)


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def noise(h, w, scales):
    """Fractal noise in 0..1 that wraps at all edges: white noise, low-passed in frequency space."""
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    total = np.zeros((h, w))
    for scale, weight in scales:
        g = np.exp(-(fx ** 2 + fy ** 2) * (np.pi * scale) ** 2 / 2)
        n = np.real(np.fft.ifft2(np.fft.fft2(rng.standard_normal((h, w))) * g))
        total += weight * (n - n.mean()) / n.std()
    return (total - total.min()) / (total.max() - total.min())


bank = Image.open(src).convert("RGBA")
tex_src = np.asarray(bank.convert("RGB")).astype(np.float32)
tex_src = tex_src[int(tex_src.shape[0] * 0.4):int(tex_src.shape[0] * 0.75)]


def texture(h, w):
    t = np.asarray(Image.fromarray(tex_src.astype(np.uint8)).resize((w, int(tex_src.shape[0] * w / tex_src.shape[1])))).astype(np.float32)
    t = np.concatenate([t, t[::-1]] * (h // (2 * t.shape[0]) + 1), 0)[:h]
    return t.mean(2, keepdims=True)


# Puffs behind the texts.
h, w = 2400, 1200
y = np.linspace(0, 1, h)[:, None]
n = noise(h, w, [(300, 0.7), (115, 0.24), (40, 0.06)])
cover = noise(h, 1, [(300, 1.0)])
thr = 1 - (0.18 + 0.32 * cover)
a = smooth(thr - 0.07, thr + 0.12, n) * smooth(0.0, 0.06, y) * (1 - smooth(0.92, 1.0, y))
lit = np.clip(0.5 + 4.5 * (n - np.roll(n, 40, axis=0)) + 0.8 * (n - thr), 0, 1)[..., None]
rgb = texture(h, w) * (0.6 + 0.8 * lit) * np.array([0.95, 0.99, 1.02])
Image.fromarray(np.dstack([rgb, a[..., None] * 225]).clip(0, 255).astype(np.uint8)).save(f"{out}/clouds-mid.png")

# Thin wisps in front of the texts: large, soft, faint.
h, w = 1600, 800
y = np.linspace(0, 1, h)[:, None]
n = noise(h, w, [(160, 0.75), (60, 0.25)])
a = smooth(0.45, 0.8, n) * smooth(0.0, 0.08, y) * (1 - smooth(0.9, 1.0, y))
rgb = np.full((h, w, 3), [226, 231, 234], np.float32) * (0.85 + 0.15 * n[..., None])
Image.fromarray(np.dstack([rgb, a[..., None] * 90]).clip(0, 255).astype(np.uint8)).save(f"{out}/clouds-veil.png")

# The logo's mask: opaque where the bank is clear sky, transparent where it has cloud.
alpha = np.asarray(bank.getchannel("A")).astype(np.float32) / 255
keep = 1 - smooth(0.03, 0.3, alpha)
m = np.zeros(alpha.shape + (4,), np.uint8)
m[..., 3] = (keep * 255).astype(np.uint8)
Image.fromarray(m).save(f"{out}/clouds-mask.png")
