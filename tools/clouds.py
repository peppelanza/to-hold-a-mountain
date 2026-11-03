"""Cumulus cloud bank layers, rendered as 2.5D: the cloud is a union of spheres
(big billows, smaller ones on their tops, tiny ones on those), lit by the sun from
above-left, with crevices darkened (ambient occlusion), a flat greyer base and wispy
eroded edges. Output: RGBA images 2400×1000 whose solid part spans 52–75% of the
height (where the page puts the video's top edge), melting away below.

    python tools/clouds.py <out_dir>
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

W, H = 2400, 1000
out_dir = sys.argv[1]


def fbm(rng, octaves=6, base=(4, 10), persistence=0.5):
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


def _box(a, k, axis):
    pad = [(0, 0), (0, 0)]
    pad[axis] = (k + 1, k)
    c = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis, dtype=np.float64)
    hi = np.take(c, np.arange(2 * k + 1, c.shape[axis]), axis=axis)
    lo = np.take(c, np.arange(0, c.shape[axis] - 2 * k - 1), axis=axis)
    return ((hi - lo) / (2 * k + 1)).astype(np.float32)


def blur(a, r):
    """Gaussian-like blur in floating point (three box passes per axis)."""
    k = max(1, int(round(r * 0.9)))
    out = a.astype(np.float32)
    for _ in range(3):
        out = _box(_box(out, k, 0), k, 1)
    return out


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def add_sphere(height, cx, cy, r, lift):
    x0, x1 = max(0, int(cx - r)), min(W, int(cx + r) + 1)
    y0, y1 = max(0, int(cy - r)), min(H, int(cy + r) + 1)
    if x0 >= x1 or y0 >= y1:
        return
    ys, xs = np.mgrid[y0:y1, x0:x1]
    d2 = (xs - cx) ** 2 + (ys - cy) ** 2
    h = np.where(d2 < r * r, np.sqrt(np.maximum(r * r - d2, 0)) + lift, -1)
    np.maximum(height[y0:y1, x0:x1], h, out=height[y0:y1, x0:x1])


def layer(name, seed, top, scale, light, shadow, haze, sky):
    rng = np.random.default_rng(seed)
    height = np.full((H, W), -1.0, np.float32)

    # Body: rows of big billows from the top line down past the solid band.
    billows = []
    x = -100
    while x < W + 100:
        r = rng.uniform(110, 190) * scale
        cy = top * H + rng.uniform(-0.06, 0.08) * H + r * 0.6
        billows.append((x, cy, r))
        x += r * rng.uniform(0.9, 1.3)
    for row in range(1, 5):
        for bx, by, br in billows:
            add_sphere(height, bx + rng.uniform(-90, 90), by + row * 120, br * 1.45, 20)
    # Tops: domes on domes, getting smaller.
    sources = billows
    for level, (rmin, rmax, count, lift) in enumerate([(60, 100, 4, 70), (28, 48, 3, 90)]):
        added = []
        for bx, by, br in sources:
            for _ in range(count):
                a = rng.uniform(-np.pi * 0.95, -np.pi * 0.05)  # upper half
                rr = rng.uniform(rmin, rmax) * scale
                cx, cy = bx + np.cos(a) * br * 0.82, by + np.sin(a) * br * 0.82
                add_sphere(height, cx, cy, rr, lift + level * 10)
                added.append((cx, cy, rr))
        sources = added
    for bx, by, br in billows:
        add_sphere(height, bx, by, br, 60)

    inside = height > 0
    n = fbm(rng)
    fine = fbm(rng, octaves=5, base=(24, 60))

    # Surface: the sphere heightfield plus small bumps, its normal lit by the sun.
    h = np.where(inside, height, 0) + (fine - 0.5) * 5 + (n - 0.5) * 26
    h = blur(h, 9)
    gy, gx = np.gradient(h)
    nz = np.ones_like(h) * 2.4
    norm = np.sqrt(gx * gx + gy * gy + nz * nz)
    sun = np.array([-0.45, -0.65, 0.62])  # left, up (image y is down), toward us
    sun = sun / np.linalg.norm(sun)
    lambert = np.clip((-gx * sun[0] - gy * sun[1] + nz * sun[2]) / norm, 0, 1)

    # Crevices between billows get less light; so does the base of the bank.
    ao = np.clip((h - blur(h, 45)) / 110 + 0.82, 0, 1)
    v = np.linspace(0, 1, H)[:, None]
    depth_dark = 1 - 0.55 * smooth(0.4, 0.95, v)
    # Light scattering through thin edges: rims glow a little.
    rim = 1 - smooth(0, 1, blur(inside.astype(np.float32), 10))
    # Lower in the bank the billows blur into one soft mass.
    relief = 1 - 0.65 * smooth(0.35, 0.75, v)
    lit = np.clip((0.42 + 0.58 * (0.7 + (lambert - 0.7) * relief)) * (1 - (1 - ao) * relief) * depth_dark + 0.2 * rim, 0, 1)
    lit = (lit * (1 + 0.12 * (n - 0.5) + 0.06 * (fine - 0.5))) ** 1.25
    # The lower body is one soft mass: smooth away any streaks there.
    soft = smooth(0.4, 0.7, v)
    lit = lit * (1 - soft) + blur(lit, 14) * soft

    light, shadow, sky = (np.array(c, np.float32) for c in (light, shadow, sky))
    rgb = shadow + (light - shadow) * lit[..., None]
    rgb = rgb * (1 - haze) + sky * haze  # distant layers fade toward the sky

    # Edges: soft, eroded into wisps by noise.
    mask = blur(inside.astype(np.float32), 7)
    erosion = smooth(0.2, 0.7, n * 0.6 + fine * 0.4 + blur(inside.astype(np.float32), 18) * 0.5)
    alpha = mask * erosion
    alpha = np.maximum(alpha, smooth(0.5, 0.62, v))  # solid where the video's edge sits
    alpha *= 1 - smooth(0.8, 1.0, v)  # melt into the film's sky below
    rgba = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(f"{out_dir}/{name}.png")


# Colours from the sky photo (slate blue) and the film's overcast sky.
# back: higher, smaller billows, hazier; front: lower, biggest, brightest.
layer("cloud-1", 11, 0.16, 0.8, (214, 220, 225), (88, 104, 120), 0.35, (70, 92, 110))
layer("cloud-2", 23, 0.27, 1.0, (232, 234, 236), (98, 112, 126), 0.15, (90, 110, 125))
layer("cloud-3", 37, 0.38, 1.25, (244, 243, 241), (108, 120, 132), 0.0, (110, 128, 140))


def fog(name, seed, colour):
    """A wide, soft fog bank: thin at the top, thick lower down, wispy throughout.
    Repeats seamlessly sideways so it can drift."""
    rng = np.random.default_rng(seed)
    n = fbm(rng, octaves=5, base=(4, 3), persistence=0.55)  # (rows, columns): wide cells
    wisps = fbm(rng, octaves=4, base=(10, 3), persistence=0.5)  # long sideways wisps
    # Make the left and right edges meet: blend the texture with its mirror near the seam.
    ramp = np.clip(np.abs(np.linspace(-1, 1, W)) * 4 - 3, 0, 1)[None, :]
    n = n * (1 - ramp * 0.5) + n[:, ::-1] * ramp * 0.5
    wisps = wisps * (1 - ramp * 0.5) + wisps[:, ::-1] * ramp * 0.5
    v = np.linspace(0, 1, H)[:, None]
    body = smooth(0.0, 0.75, v)
    alpha = np.clip(body * (0.35 + 0.9 * n) * (0.7 + 0.5 * wisps), 0, 1) * smooth(0.0, 0.35, v)
    rgb = np.broadcast_to(np.array(colour, np.float32), (H, W, 3))
    rgb = rgb * (0.94 + 0.12 * n[..., None])
    rgba = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(f"{out_dir}/{name}.png")


fog("fog-1", 51, (168, 182, 192))
fog("fog-2", 63, (186, 198, 206))
