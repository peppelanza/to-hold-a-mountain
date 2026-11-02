"""Cloud bank layers: billowy tops, dense middle (covers the video's top edge
at 75% height), soft fade at the bottom into the film's sky. Colours sampled
from the film's overcast sky."""
import sys
import numpy as np
from PIL import Image, ImageFilter

W, H = 2400, 1000
out_dir = sys.argv[1]


def fbm(rng, octaves=7, base=(3, 7), persistence=0.55):
    total = np.zeros((H, W))
    amp, norm = 1.0, 0.0
    gh, gw = base
    for _ in range(octaves):
        grid = rng.random((gh, gw)).astype(np.float32)
        img = Image.fromarray((grid * 255).astype(np.uint8), "L").resize((W, H), Image.BICUBIC)
        total += amp * np.asarray(img, np.float32) / 255
        norm += amp
        amp *= persistence
        gh, gw = gh * 2, gw * 2
    return total / norm


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def blur(a, r):
    img = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8), "L")
    return np.asarray(img.filter(ImageFilter.GaussianBlur(r)), np.float32) / 255


def layer(seed, top, light, shadow, softness):
    rng = np.random.default_rng(seed)
    n = fbm(rng)
    n = (n - n.min()) / (n.max() - n.min())
    v = np.linspace(0, 1, H)[:, None]
    # Larger, slower bumps decide where the cumulus tops rise.
    lumps = fbm(rng, octaves=3, base=(2, 5))
    lumps = (lumps - lumps.min()) / (lumps.max() - lumps.min())
    mid = fbm(rng, octaves=4, base=(5, 12))
    mid = (mid - mid.min()) / (mid.max() - mid.min())
    edge = top + 0.32 * (lumps - 0.5) + 0.14 * (mid - 0.5)
    coverage = smooth(edge, edge + 0.16, v)
    density = coverage * 1.4 + (n - 0.5) * 0.9 - 0.45
    alpha = smooth(0.0, softness, density)
    alpha = np.maximum(alpha, smooth(0.5, 0.64, v))  # solid where the video's edge sits
    alpha *= 1 - smooth(0.82, 1.0, v)  # melt into the film's sky below

    # Light from above: the more cloud above a point, the darker it is;
    # mid-size noise gives the puffs their own rounded shading.
    d = blur(np.clip(density, 0, 1), 12)
    above = np.roll(d, 32, axis=0)
    above[:32] = 0
    lit = 1 - 0.7 * above + 0.45 * (mid - 0.5) + 0.5 * (n - blur(n, 8))
    lit = np.clip(lit, 0, 1) * (1 - 0.3 * smooth(0.5, 1.0, v))
    light, shadow = np.array(light, np.float32), np.array(shadow, np.float32)
    rgb = shadow + (light - shadow) * lit[..., None]
    rgba = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(f"{out_dir}/{seed}.png")


# back: higher, bluer, softer; front: lower, brighter, crisper tops
layer(11, 0.22, (205, 214, 222), (104, 120, 134), 0.55)
layer(23, 0.32, (226, 229, 232), (118, 132, 143), 0.4)
layer(37, 0.42, (238, 239, 240), (126, 138, 148), 0.32)
