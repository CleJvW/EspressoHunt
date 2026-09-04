"""Generate app icons for "Rate my coffee".

Run:  python tools/make_icons.py
Outputs PNGs into ./icons
"""
from PIL import Image, ImageDraw
import math
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

CREME = (243, 233, 219)
COFFEE = (79, 55, 41)
COFFEE_DARK = (58, 40, 30)
ACCENT = (194, 138, 78)


def rounded(size, radius_ratio=0.0):
    """Base image. radius 0 => full-bleed square (iOS masks it itself)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if radius_ratio > 0:
        r = int(size * radius_ratio)
        d.rounded_rectangle([0, 0, size, size], radius=r, fill=COFFEE)
    else:
        d.rectangle([0, 0, size, size], fill=COFFEE)
    return img, d


def draw_cup(d, size):
    cx = size * 0.5
    cup_w = size * 0.46
    cup_h = size * 0.34
    top = size * 0.34
    left = cx - cup_w / 2
    right = cx + cup_w / 2
    bottom = top + cup_h

    # saucer
    d.ellipse([cx - cup_w * 0.78, bottom + size * 0.02,
               cx + cup_w * 0.78, bottom + size * 0.14], fill=CREME)

    # handle
    hw = size * 0.16
    d.ellipse([right - size * 0.02, top + cup_h * 0.12,
               right - size * 0.02 + hw, top + cup_h * 0.12 + hw],
              outline=CREME, width=int(size * 0.035))

    # cup body (rounded rect tapering look via rounded rectangle)
    d.rounded_rectangle([left, top, right, bottom],
                        radius=int(size * 0.06), fill=CREME)

    # coffee surface
    inset = size * 0.045
    d.ellipse([left + inset, top + inset * 0.4,
               right - inset, top + inset * 2.6], fill=COFFEE_DARK)

    # steam
    d.line([cx - size * 0.02, top - size * 0.14, cx - size * 0.02, top - size * 0.02],
           fill=CREME, width=int(size * 0.022))
    d.line([cx + size * 0.06, top - size * 0.16, cx + size * 0.06, top - size * 0.03],
           fill=CREME, width=int(size * 0.022))

    # star badge on the saucer
    _star(d, (cx, bottom + size * 0.075), size * 0.072, ACCENT)


def _star(d, center, r, fill):
    cx, cy = center
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rad = r if i % 2 == 0 else r * 0.45
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    d.polygon(pts, fill=fill)


def make(size, radius_ratio, name):
    img, d = rounded(size, radius_ratio)
    draw_cup(d, size)
    img.save(os.path.join(OUT, name))
    print("wrote", name)


make(192, 0.0, "icon-192.png")
make(512, 0.0, "icon-512.png")
make(512, 0.0, "icon-512-maskable.png")  # full-bleed works as maskable
make(180, 0.0, "apple-touch-icon.png")
make(32, 0.18, "favicon-32.png")
