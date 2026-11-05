"""Opens soft gaps in the cloud bank, where the blue behind it shows (style.css puts a
blue sky behind the bank's thick part). Needs numpy and Pillow.

    python tools/cloud_gaps.py tools/clouds-solid.webp <out dir>
    cwebp -q 80 -alpha_q 88 <out dir>/clouds.png -o public/clouds.webp

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

n = noise(H, W, [((45, 110), 0.75), ((16, 34), 0.25)])  # blobs wider than tall
band = smooth(0.2, 0.26, v) * (1 - smooth(0.74, 0.8, v))
fine = noise(H, W, [((6, 10), 0.6), ((2.5, 4), 0.4)])  # wispy, broken edges
gap = smooth(0.58, 0.9, n + 0.18 * (fine - 0.5)) * band
im[..., 3] *= 1 - 0.8 * gap
Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(f"{out}/clouds.png")
