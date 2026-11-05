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
# The top edge in billows: rounded cloud tops at different heights, soft or crisper,
# instead of the source's even band of haze (the logo, masked by the bank, went behind
# that in a straight line). Above them only the loose clouds stay: what stands out of
# the haze (which is even along each row, its median), so no band is left either.
tops = noise(H, W, [((40, 90), 0.7), ((14, 30), 0.3)])
field = (v - 0.17) / 0.045 + 2.4 * (tops - 0.5)
top = smooth(-0.7, 0.7, field)
a0 = im[..., 3] / 255
haze = np.median(a0, axis=1, keepdims=True)
loose = np.clip((a0 - haze) / np.maximum(1 - haze, 1e-3), 0, 1)
# (only up in the open sky: lower, out of the thickening haze, they'd end flat)
loose *= 1 - smooth(-0.6, 0.6, (v - 0.12) / 0.012 + 2.4 * (noise(H, W, [((30, 60), 1.0)]) - 0.5))
im[..., 3] = 255 * (top * a0 + (1 - top) * loose)
im[..., 3] *= smooth(0.02, 0.035, v)  # (no specks along the very top)

# The bottom squeezed down: the source's fade (93% to the end) into the last 5%, so the
# bank is still thick where the video's top lies under it (36vh above the bank's bottom,
# style.css) and its edge doesn't show, and a little below it; then it thins out over the video's sky.
# (tools/cloud_depth.py moves its hand-traced cumulus line the same way: SQUEEZE.)
SQUEEZE = ([0, 0.8, 0.95, 1], [0, 0.8, 0.93, 1])  # rows out, rows of the source
rows = np.interp(np.linspace(0, 1, H), *SQUEEZE) * (H - 1)
lo = np.floor(rows).astype(int); hi = np.minimum(lo + 1, H - 1); f = (rows - lo)[:, None, None]
im = im[lo] * (1 - f) + im[hi] * f
Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(f"{out}/clouds.png")
