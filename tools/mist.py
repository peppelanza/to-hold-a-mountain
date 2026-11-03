"""Mist textures for the inside of the cloud on the homepage (mist-1.webp, mist-2.webp):
even, all-over soft patches with no top or bottom, mirrored sideways and downward so
they repeat without a seam. Needs numpy and Pillow.

    python tools/mist.py <out_dir>
    cwebp -q 55 -alpha_q 65 -resize 1600 0 <out_dir>/mist-1.png -o public/mist-1.webp
"""
import sys
import numpy as np
from PIL import Image

W, H = 2400, 1000
out_dir = sys.argv[1]


def fbm(rng, octaves, base, persistence):
    """Layered value noise; base is the coarsest grid as (rows, columns)."""
    total, amp, norm = np.zeros((H, W), np.float32), 1.0, 0.0
    gh, gw = base
    for _ in range(octaves):
        grid = rng.random((gh, gw)).astype(np.float32)
        img = Image.fromarray((grid * 255).astype(np.uint8), "L").resize((W, H), Image.BICUBIC)
        total += amp * np.asarray(img, np.float32) / 255
        norm += amp
        amp *= persistence
        gh, gw = gh * 2, gw * 2
    t = total / norm
    return (t - t.min()) / (t.max() - t.min())


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def mist(name, seed, base, colour, lo, hi):
    rng = np.random.default_rng(seed)
    n = fbm(rng, octaves=5, base=base, persistence=0.55)
    alpha = lo + (hi - lo) * smooth(0.2, 0.8, n)
    rgb = np.broadcast_to(np.array(colour, np.float32), (H, W, 3)) * (0.9 + 0.2 * n[..., None])
    rgba = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
    # Mirrored sideways and downward, so every join matches when it repeats.
    rgba = np.hstack([rgba, rgba[:, ::-1]])
    rgba = np.vstack([rgba, rgba[::-1]])
    Image.fromarray(rgba, "RGBA").save(f"{out_dir}/{name}.png")


mist("mist-1", 71, (3, 4), (150, 162, 172), 0.0, 0.85)   # big soft patches
mist("mist-2", 83, (8, 3), (178, 188, 196), 0.0, 0.6)    # long sideways wisps
