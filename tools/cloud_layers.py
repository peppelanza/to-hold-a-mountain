"""Makes the near cloud layer (public/clouds-near.webp) and gives the main clouds a
billowing top edge (public/clouds.webp, from the plain version). Needs numpy and Pillow.

    python tools/cloud_layers.py tools/clouds-plain.webp <out dir>
    cwebp -q 80 -alpha_q 88 <out dir>/clouds.png -o public/clouds.webp
    cwebp -q 78 -alpha_q 85 <out dir>/clouds-near.png -o public/clouds-near.webp

- noise that wraps at the sides (made in frequency space), so both still drift sideways
  without a seam
- clouds.webp: the band where the clouds begin gets lumps of cloud reaching up, so they
  cover the logo a piece at a time
- clouds-near.webp: separate puffs, lit from above (lighter tops, darker undersides),
  scattered down a tall strip; it passes in front of the logo and the texts
"""
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
rng = np.random.default_rng(7)


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
    total = (total - total.min()) / (total.max() - total.min())
    return total


# Main clouds: a billowing top edge, like the top of a cumulus bank: overlapping round
# billows of different sizes along the width (wrapping at the sides), filled with the
# cloud texture from a little further down.
im = np.asarray(Image.open(src).convert("RGBA")).astype(np.float32)
H, W = im.shape[:2]
ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
base = 0.115 * H  # where the solid cloud used to start
top = np.full(W, base + 6.0)
cols = np.arange(W, dtype=np.float32)


def billow(cx, cy, r):
    dx = np.minimum(np.abs(cols - cx), W - np.abs(cols - cx))
    inside = dx < r
    top[inside] = np.minimum(top[inside], cy - np.sqrt(r * r - dx[inside] ** 2))


# big billows side by side, overlapping; then smaller ones piled on their tops
for cx in np.linspace(0, W, 12, endpoint=False) + rng.uniform(0, 60):
    billow(cx % W, base + rng.uniform(10, 45), rng.uniform(48, 92))
for r_lo, r_hi, count in ((18, 38, 26), (7, 16, 40)):
    for _ in range(count):
        cx = rng.uniform(0, W)
        r = rng.uniform(r_lo, r_hi)
        # its middle no higher than the bank where its sides land, so it sits on the
        # bank (no straight sides)
        sides = top[np.r_[int(cx - r) % W, int(cx + r) % W]].max()
        billow(cx, sides + rng.uniform(0.0, 0.25) * r, r)
fine = noise(H, W, [(W * 0.02, 0.7), (W * 0.008, 0.3)])
edge_alpha = smooth(-5, 7, ys - top[None, :] + 14 * (fine - 0.5))
shift = int(0.1 * H)
upper = ys < base + 0.1 * H
# above and around the old edge, the texture from a little further down, blending back
# into the original below it
moved = np.roll(im[..., :3], -shift, axis=0)
k = smooth(base + 0.02 * H, base + 0.09 * H, ys)[..., None]
rgb = moved * (1 - k) + im[..., :3] * k
# billow tops a little lighter, as if lit from above
light = smooth(14, 0, ys - top[None, :]) * upper
rgb = rgb + (np.array([228, 233, 236]) - rgb) * (0.25 * light)[..., None]
alpha = im[..., 3] / 255
alpha = np.where(ys < base + 0.06 * H, edge_alpha, np.maximum(alpha, edge_alpha * upper))
im = np.dstack([rgb, alpha[..., None] * 255])
Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(f"{out}/clouds.png")

# Near layer: soft, mostly see-through puffs with the photo's cloud texture, lit from
# above, scattered down a tall strip.
h, w = 2400, 1200
y = np.linspace(0, 1, h)[:, None]
n = noise(h, w, [(320, 0.7), (120, 0.24), (40, 0.06)])
cover = noise(h, 1, [(300, 1.0)])
thr = 1 - (0.2 + 0.35 * cover)
a = smooth(thr - 0.07, thr + 0.12, n)
a *= smooth(0.0, 0.06, y) * (1 - smooth(0.9, 1.0, y))
tex = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
tex = tex[int(tex.shape[0] * 0.4):int(tex.shape[0] * 0.75)]
tex = np.asarray(Image.fromarray(tex.astype(np.uint8)).resize((w, int(tex.shape[0] * w / tex.shape[1])))).astype(np.float32)
tex = np.concatenate([tex, tex[::-1]] * (h // (2 * tex.shape[0]) + 1), 0)[:h]
lum = tex.mean(2, keepdims=True)
lit = np.clip(0.5 + 4.5 * (n - np.roll(n, 40, axis=0)) + 0.8 * (n - thr), 0, 1)[..., None]
rgb = lum * (0.6 + 0.8 * lit) * np.array([0.95, 0.99, 1.02])  # brighter tops, darker undersides: they stand out from the bank behind
Image.fromarray(np.dstack([rgb, a[..., None] * 215]).clip(0, 255).astype(np.uint8)).save(f"{out}/clouds-near.png")
