"""Makes public/clouds.webp from the storm cloud photo. Needs numpy and Pillow.

    python tools/clouds.py <photo> <out.png>
    cwebp -q 80 -alpha_q 88 <out.png> -o public/clouds.webp

- keeps the cloudy part of the photo (its "transparent" top is a printed checkerboard)
- top edge: shaped by the clouds themselves, the bright haze goes first and the darker
  cloud forms stay, so a real cloud edge passes in front of the logo
- a touch of the sky photo's slate; lower down, softened toward the film's overcast sky
- the thick middle is extended with flipped, cross-faded copies (more room to scroll)
- the bottom fades out where the video starts
- its sides join seamlessly, so the page can drift it sideways without end
"""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


photo = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
c = photo[int(photo.shape[0] * 0.34):]
H, W = c.shape[:2]
v = np.linspace(0, 1, H)[:, None]
lum = c.mean(2) / 255

# Top edge: transparent where the photo is bright haze, solid where there is cloud
# form; fully solid from 32% down. A short ramp at the very top avoids a line.
form = smooth(0.86, 0.66, lum)
alpha = np.maximum(form, smooth(0.14, 0.32, v)) * smooth(0.0, 0.05, v)
alpha *= 1 - smooth(0.8, 1.0, v)  # soft fade, within the 45vh where the clouds lie over the video: solid above its top edge

rgb = c * np.array([0.84, 0.89, 0.93], np.float32)
# Lower down, the film's overcast sky: light blue-grey, low contrast.
target = np.array([150, 161, 167], np.float32)
soft = target + ((lum - lum[int(H * 0.45):].mean()) * 255 * 0.45)[..., None] * np.array([1, 1.02, 1.04])
k = smooth(0.3, 0.55, v)[..., None]
rgb = rgb * (1 - k) + soft * k
im = np.dstack([rgb, alpha[..., None] * 255 if alpha.ndim == 2 else alpha * 255]).clip(0, 255)


def join(top, bottom, overlap):
    w = np.linspace(0, 1, overlap)[:, None, None]
    w = w * w * (3 - 2 * w)
    return np.concatenate([top[:-overlap], top[-overlap:] * (1 - w) + bottom[:overlap] * w, bottom[overlap:]], 0)


r = lambda f: int(f * H)
out = im[:r(0.72)]
for seg in (im[r(0.42):r(0.74), ::-1], im[r(0.40):r(0.72)], im[r(0.44):r(0.76), ::-1]):
    out = join(out, seg, r(0.12))
out = join(out, im[r(0.44):], r(0.12))

# Seamless sideways, so it can drift without end: the last 30% of the width is
# cross-faded into the first 30%, and the image ends where that blend begins, so its
# right edge runs straight on into its left edge.
b = int(W * 0.3)
w = np.linspace(0, 1, b)[None, :, None]
w = w * w * (3 - 2 * w)
tile = out[:, : W - b].copy()
tile[:, :b] = out[:, :b] * w + out[:, W - b:] * (1 - w)
Image.fromarray(tile.clip(0, 255).astype(np.uint8), "RGBA").save(dst)
print(f"tile {tile.shape[1]}×{tile.shape[0]}, width/height {tile.shape[1] / tile.shape[0]:.4f}")
