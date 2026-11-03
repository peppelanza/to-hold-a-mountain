"""Makes public/clouds.webp from the storm cloud photo whose "transparent" top is a
checkerboard printed into the picture: finds the checkerboard by its pattern, makes
it transparent, paints out the outline left around the clouds, softens the edge and
fades the bottom (where the video starts). Needs numpy, scipy and Pillow.

    python tools/clouds_cutout.py <photo> <out.png>
    cwebp -q 82 -alpha_q 90 <out.png> -o public/clouds.webp
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

src, dst = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
g = a.mean(2)
H, W = g.shape

# Checkerboard: about half its pixels are the darker squares (~242), with sharp
# edges between squares, and it is bright overall. Soft cloud is none of these.
squares = ((g >= 237) & (g <= 248)).astype(np.float32)
share = nd.uniform_filter(squares, 25)
edges = nd.uniform_filter(np.abs(np.diff(g, axis=1, append=g[:, -1:])) + np.abs(np.diff(g, axis=0, append=g[-1:])), 25)
checker = (share > 0.25) & (share < 0.8) & (edges > 1.2) & (nd.uniform_filter(g, 25) > 243)
checker = nd.binary_closing(checker, iterations=6)
lab, n = nd.label(checker)
sizes = nd.sum(checker, lab, range(1, n + 1))
sky = np.zeros_like(checker)
for i, size in enumerate(sizes, 1):
    if size > 5000 and np.any(lab[:60] == i):  # big areas reaching the top
        sky |= lab == i
sky = nd.binary_fill_holes(sky)
cut = nd.binary_dilation(sky, iterations=8)  # includes the drawn outline

# Leftovers of the outline: small grey specks on the white cloud near the edge.
band = nd.binary_dilation(cut, iterations=110) & ~cut
for limit, max_size in ((246, 600), (225, 80)):
    dark = band & (g < limit)
    lab, n = nd.label(dark)
    sizes = nd.sum(dark, lab, range(1, n + 1))
    small = nd.binary_dilation(np.isin(lab, np.where(sizes < max_size)[0] + 1), iterations=3)
    a[small] = 253
    g = a.mean(2)
# Any dot still clearly darker than its surroundings there.
dots = nd.binary_dilation(band & (nd.median_filter(g, 11) - g > 10), iterations=2)
a[dots] = 253

# Soft, slightly irregular edge; bottom melts away into the video.
rng = np.random.default_rng(5)
noise = nd.gaussian_filter(rng.random((H, W)).astype(np.float32), 6)
noise = (noise - noise.min()) / (noise.max() - noise.min())
soft = nd.gaussian_filter(cut.astype(np.float32), 9)
alpha = np.clip(1 - soft * 1.6 + (noise - 0.5) * 0.5 * (soft > 0.02) * (soft < 0.9), 0, 1)
alpha[nd.binary_erosion(cut, iterations=6)] = 0
v = np.linspace(0, 1, H)[:, None]
t = np.clip((v - 0.8) / 0.2, 0, 1)
alpha *= 1 - t * t * (3 - 2 * t)

rgb = a * np.array([0.9, 0.93, 0.96], np.float32)  # a touch of the slate sky
Image.fromarray(np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8), "RGBA").save(dst)
