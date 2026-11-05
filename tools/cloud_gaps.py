"""Shapes the cloud bank: an uneven top edge, two clouds on their own above it, and soft
gaps where the blue behind it shows (style.css puts a blue sky behind the bank's thick
part). Needs numpy and Pillow.

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
from PIL import Image, ImageFilter

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

# The top edge: not level. The bank's outline (not its texture) is moved up or down
# column by column (by up to 5% of the height, smoothly, a few rises and dips across
# the width); where it now reaches higher, it's filled with cloud from further down.
low = im[np.clip(np.arange(H) + int(0.18 * H), 0, H - 1)][..., :3]
rise = noise(1, W, [((1, W * 0.18), 0.75), ((1, W * 0.07), 0.25)])[0]
rise = (rise - 0.5) * 2 * 0.05 * H
rows = np.clip(np.arange(H)[:, None] + rise[None, :] * (1 - smooth(0.25, 0.4, v)), 0, H - 1)
cols = np.arange(W)[None, :]
a0 = im[..., 3].copy()
a1 = a0[np.round(rows).astype(int), cols]
more = np.clip((a1 - a0) / 255, 0, 1)[..., None]
im[..., :3] = im[..., :3] * (1 - more) + low * more
im[..., 3] = a1

# Two clouds on their own, higher up, at about the logo's height as the bank comes:
# lumpy, lit from above, with the bank's own cloud in them.
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
lumpy = noise(H, W, [((28, 34), 0.7), ((10, 12), 0.3)])
for cx, cy, rx, ry in ((0.22, 0.06, 0.15, 0.03), (0.69, 0.045, 0.12, 0.024)):
    dx = np.abs(xx / W - cx)
    dx = np.minimum(dx, 1 - dx) / rx
    d = np.sqrt(dx ** 2 + ((yy / H - cy) / ry) ** 2)
    blob = smooth(0.36, 0.7, lumpy * 0.55 + (1 - d) * 0.6)
    blob = np.asarray(Image.fromarray((blob * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))).astype(np.float32) / 255
    lit = np.clip(0.92 + 0.9 * (blob - np.roll(blob, 18, axis=0)), 0.8, 1.06)[..., None]
    new = blob * 235 > im[..., 3]
    im[..., :3] = np.where(new[..., None], np.clip(low * lit, 0, 255), im[..., :3])
    im[..., 3] = np.maximum(im[..., 3], blob * 235)

n = noise(H, W, [((45, 110), 0.75), ((16, 34), 0.25)])  # blobs wider than tall
band = smooth(0.2, 0.26, v) * (1 - smooth(0.74, 0.8, v))
fine = noise(H, W, [((6, 10), 0.6), ((2.5, 4), 0.4)])  # wispy, broken edges
gap = smooth(0.58, 0.9, n + 0.18 * (fine - 0.5)) * band
im[..., 3] *= 1 - 0.8 * gap
Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(f"{out}/clouds.png")
