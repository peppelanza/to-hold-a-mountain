"""Makes the extra cloud layers of the homepage. Needs numpy and Pillow.

    python tools/cloud_depth.py public/clouds.webp <out dir> 5   (5: the seed in use)
    cwebp -q 70 -alpha_q 80 -resize 900 0 <out dir>/clouds-mid.png -o public/clouds-mid.webp
    cwebp -q 70 -alpha_q 80 <out dir>/clouds-veil.png -o public/clouds-veil.webp
    cwebp -q 70 -alpha_q 70 <out dir>/clouds-shade.png -o public/clouds-shade.webp
    cwebp -lossless <out dir>/clouds-mask.png -o public/clouds-mask.webp
    cwebp -lossless <out dir>/clouds-below-mask.png -o public/clouds-below-mask.webp

- clouds-mid: soft puffs with the bank's own texture, lit from above (lighter tops,
  darker undersides), scattered down a tall strip; behind the texts, in front of the bank
- clouds-veil: large see-through wisps, lit from above; in front of the texts
- clouds-shade: the wisps' shapes, dark: their shadows on the logo and the texts
- clouds-mask: where the bank (clouds.webp) has any cloud, even thin haze, this is
  transparent; the logo is masked with it, so it goes behind the clouds instead of
  showing through them
- clouds-below-mask: opaque down to the cumulus near the bottom of the bank; the last
  quote is masked with it, so it goes behind those clouds as they rise
Noise that wraps at the sides (made in frequency space), so the layers can drift
sideways without a seam.
"""
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
rng = np.random.default_rng(int(sys.argv[3]) if len(sys.argv) > 3 else 5)


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


# Puffs behind the texts: thresholded noise, soft, lit from above.
h, w = 2400, 1200
y = np.linspace(0, 1, h)[:, None]
n = noise(h, w, [(300, 0.7), (115, 0.24), (40, 0.06)])
cover = noise(h, 1, [(300, 1.0)])
thr = 1 - (0.18 + 0.3 * cover)
a = smooth(thr - 0.07, thr + 0.12, n) * smooth(0.0, 0.06, y) * (1 - smooth(0.92, 1.0, y))
lit = np.clip(0.5 + 4.5 * (n - np.roll(n, 40, axis=0)) + 0.8 * (n - thr), 0, 1)[..., None]
rgb = texture(h, w) * (0.6 + 0.8 * lit) * np.array([0.95, 0.99, 1.02])
Image.fromarray(np.dstack([rgb, a[..., None] * 225]).clip(0, 255).astype(np.uint8)).save(f"{out}/clouds-mid.png")

# Wisps in front of the texts: one long strip (7.6 screens, 333 px a screen), drifting
# up the page; smallish (a fifth of the screen or so, so there's sky between a wisp and
# its shadow), soft, see-through but clearly there, light on top and greyer underneath.
# Where they are is planned against what passes under them (main.js places the strip):
# - 0.15 to 0.6 screens down the strip: a group, high above the logo as the page opens,
#   whose shadows sweep across it; 0.6 to 1.5: none, the logo's own stretch, so it's
#   never covered;
# - 4.6 to 5.8: a group above the last quote (Variety) and its logo, for their shadows;
# - elsewhere, scattered.
PER = 333  # px a screen
h, w = int(7.6 * PER), 800
y = np.linspace(0, 1, h)[:, None]
at = np.arange(h)[:, None] / PER  # screens down the strip
n = noise(h, w, [(60, 0.7), (22, 0.22), (8, 0.08)])
dense = smooth(0.1, 0.2, at) * (1 - smooth(0.55, 0.62, at)) + smooth(4.5, 4.6, at) * (1 - smooth(5.8, 5.9, at))
clear = smooth(0.58, 0.64, at) * (1 - smooth(1.45, 1.55, at))
lift = 0.3 * clear - 0.05 * dense  # higher threshold: fewer wisps; lower: more
# Some wisps soft, almost a gradient, others with a crisper edge.
edge = 0.03 + 0.17 * noise(h, w, [(220, 1.0)])
a = smooth(0.68 + lift - edge, 0.68 + lift + edge, n) * smooth(0.0, 0.02, y) * (1 - smooth(0.97, 1.0, y))
lit = np.clip(0.5 + 6.0 * (n - np.roll(n, 14, axis=0)), 0, 1)[..., None]
rgb = np.array([178, 186, 192], np.float32) + np.array([70, 66, 60], np.float32) * lit  # whiter than the bank behind, so they show
Image.fromarray(np.dstack([rgb, a[..., None] * 190]).clip(0, 255).astype(np.uint8)).save(f"{out}/clouds-veil.png")
# Their shadows on the letters, as from a high sun: each wisp exactly, its shape and
# its soft or crisp edge, cast 0.6 of a screen lower, gently dark, and none where a
# wisp is in front: a cloud, sky, then the letters darkened in its shape.
shade = np.roll(a, int(0.6 * PER), axis=0) * (1 - smooth(0.05, 0.4, a))
Image.fromarray(np.dstack([np.full((h, w, 3), [26, 28, 24], np.float32), shade[..., None] * 105]).astype(np.uint8)).save(f"{out}/clouds-shade.png")

# The logo's mask: opaque where the bank is clear sky, transparent where it has cloud.
# Not from the bank's see-through-ness alone: at its top that thickens evenly downward,
# so the logo would go in a straight line. The darker cloud forms count for more, and
# billowy noise varies it, so the logo goes behind lumps of cloud at different heights.
alpha = np.asarray(bank.getchannel("A")).astype(np.float32) / 255
lum = np.asarray(bank.convert("L")).astype(np.float32) / 255
lit = lum[alpha > 0.9]
form = smooth(np.percentile(lit, 80), np.percentile(lit, 25), lum)  # 1 on the darker forms
H0, W0 = alpha.shape
lumps = noise(H0, W0, [(W0 * 0.1, 0.65), (W0 * 0.035, 0.25), (W0 * 0.012, 0.1)])
score = alpha + 0.55 * (form - 0.5) * (alpha > 0.02) + 0.9 * (lumps - 0.5)
keep = 1 - smooth(0.22, 0.55, score) * smooth(0.06, 0.25, alpha)  # a soft edge: letters melt into the cloud (thin haze hides nothing)
m = np.zeros(alpha.shape + (4,), np.uint8)
m[..., 3] = (keep * 255).astype(np.uint8)
Image.fromarray(m).save(f"{out}/clouds-mask.png")

# The texts' mask: opaque down to the top of the cumulus near the bottom of the bank
# (traced by hand from it, at 1072 px + these, wrapping at the sides), transparent
# below; the last quote is masked with it, so it goes behind those clouds as they rise.
H, W = alpha.shape
pts = [(0, 520), (30, 490), (60, 480), (110, 465), (170, 470), (220, 455), (270, 450),
       (300, 440), (340, 436), (380, 445), (420, 460), (470, 470), (520, 490), (560, 505),
       (600, 520), (640, 535), (680, 530), (717, 520)]
edge = 1072 + np.interp(np.arange(W), [p[0] for p in pts], [p[1] for p in pts])
edge = edge + 10 * (noise(1, W, [(W * 0.03, 0.7), (W * 0.012, 0.3)])[0] - 0.5)
ys = np.arange(H)[:, None]
keep = 1 - smooth(-6, 6, ys - edge[None, :])
m = np.zeros((H, W, 4), np.uint8)
m[..., 3] = (keep * 255).astype(np.uint8)
Image.fromarray(m).save(f"{out}/clouds-below-mask.png")
