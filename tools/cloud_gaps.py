"""Shapes the cloud bank: two more clouds on their own high above it (copies of its own,
on a strip of their own, clouds-high), and soft gaps where the blue behind it shows (style.css puts a blue sky behind the bank's thick
part). Needs numpy and Pillow.

    python tools/cloud_gaps.py tools/clouds-solid.webp <out dir>
    cwebp -q 80 -alpha_q 88 <out dir>/clouds.png -o public/clouds.webp
    cwebp -q 80 -alpha_q 88 <out dir>/clouds-high.png -o public/clouds-high.webp

then run tools/cloud_depth.py again (its masks and textures are made from the bank).

- the gaps: thin patches, wider than tall, between 22% and 78% down the bank (clear of
  its top edge, over the logo, and of the billows near its bottom, which the last
  quote goes behind); not holes: the cloud thins to a haze there
- noise that wraps at the sides, so the bank still drifts sideways without a seam
"""
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
rng = np.random.default_rng(3)


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def noise(h, w, scales):
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    total = np.zeros((h, w))
    for (sy, sx), weight in scales:
        g = np.exp(-((fx * sx) ** 2 + (fy * sy) ** 2) * np.pi ** 2 / 2)
        n = np.real(np.fft.ifft2(np.fft.fft2(rng.standard_normal((h, w))) * g))
        total += weight * (n - n.mean()) / n.std()
    return (total - total.min()) / (total.max() - total.min())


im = np.asarray(Image.open(src).convert("RGBA")).astype(np.float32)
H, W = im.shape[:2]
v = np.linspace(0, 1, H)[:, None]

# A couple more clouds on their own, high up: copies (mirrored) of the bank's own two
# floating clouds, placed elsewhere along the width. Only the cloud itself is copied (not the thin haze around
# it), its edges feathered.
def patch(r0, r1, c0, c1):
    p = im[int(r0 * H):int(r1 * H), int(c0 * W):int(c1 * W)].copy()
    h, w = p.shape[:2]
    fy = smooth(0, 25, np.arange(h)) * smooth(0, 25, h - 1 - np.arange(h))
    fx = smooth(0, 25, np.arange(w)) * smooth(0, 25, w - 1 - np.arange(w))
    a = p[..., 3] / 255
    p[..., 3] = 255 * a * smooth(0.12, 0.45, a) * fy[:, None] * fx[None, :]  # the cloud, not the haze around it
    return p[:, ::-1]


def place(p, r, c):
    h, w = p.shape[:2]
    y0, x0 = int(r * H), int(c * W)
    h = min(h, im.shape[0] - y0)
    p = p[:h]
    for dx in range(w):  # (wrapping at the sides)
        x = (x0 + dx) % W
        a = p[:, dx, 3:4] / 255
        im[y0:y0 + h, x, :3] = p[:, dx, :3] * a + im[y0:y0 + h, x, :3] * (1 - a)
        im[y0:y0 + h, x, 3] = np.maximum(im[y0:y0 + h, x, 3], p[:, dx, 3])


big = patch(0.062, 0.111, 0.36, 0.68)
small = patch(0.05, 0.092, 0.82, 0.99)
# They go on a strip of their own that sits on top of the bank (12% of its height,
# style.css), well above its edge: up around the logo as the page opens.
bank = im
im = np.zeros((int(0.12 * H), W, 4), np.float32)
place(big, 0.045, 0.62)
place(small, 0.0, 0.08)
Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(f"{out}/clouds-high.png")
im = bank

n = noise(H, W, [((45, 110), 0.75), ((16, 34), 0.25)])  # blobs wider than tall
band = smooth(0.2, 0.26, v) * (1 - smooth(0.74, 0.8, v))
fine = noise(H, W, [((6, 10), 0.6), ((2.5, 4), 0.4)])  # wispy, broken edges
gap = smooth(0.58, 0.9, n + 0.18 * (fine - 0.5)) * band
im[..., 3] *= 1 - 0.8 * gap
Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(f"{out}/clouds.png")
