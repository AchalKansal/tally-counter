"""
Generates all Play Store assets and APK mipmap icons for Tally Counter.

Outputs
-------
store-assets/
  icon-512.png              Play Store high-res icon
  feature-graphic.png       1024x500 banner shown at top of listing
  icon-playstore.png        Same as icon-512 (some tools expect this name)

tally-counter-app/src/main/res/
  mipmap-mdpi/    ic_launcher.png + ic_launcher_round.png   (48px)
  mipmap-hdpi/    …                                          (72px)
  mipmap-xhdpi/   …                                          (96px)
  mipmap-xxhdpi/  …                                          (144px)
  mipmap-xxxhdpi/ …                                          (192px)
"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

# ── Palette ───────────────────────────────────────────────────────────────────
BG_DARK   = (22,  56,  22)   # #163816  deep forest green
BG_MID    = (30,  72,  30)   # #1e481e  mid green (gradient)
WHITE     = (255, 255, 255)
GOLD      = (245, 200,  66)  # #f5c842  warm gold
GREEN_ACC = ( 52, 199,  89)  # #34c759  iOS-green accent
TEXT_MUTE = (160, 210, 160)  # soft green for subtitle

FONT_BOLD = "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf"
FONT_REG  = "/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf"
FONT_MED  = "/usr/share/fonts/truetype/ubuntu/Ubuntu-M.ttf"

BASE = os.path.dirname(os.path.abspath(__file__))
RES  = os.path.join(BASE, "tally-counter-app", "src", "main", "res")
STORE = os.path.join(BASE, "store-assets")


# ── Helpers ───────────────────────────────────────────────────────────────────

def grad_bg(draw, w, h, top_color, bot_color):
    """Vertical gradient fill."""
    for y in range(h):
        t = y / h
        r = int(top_color[0] + (bot_color[0] - top_color[0]) * t)
        g = int(top_color[1] + (bot_color[1] - top_color[1]) * t)
        b = int(top_color[2] + (bot_color[2] - top_color[2]) * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))


def draw_tally(draw, cx, cy, size,
               stroke_w=None, color_bars=WHITE, color_cross=GOLD):
    """
    Draw a tally-mark group centred at (cx, cy).
    size  — bounding box side length
    """
    if stroke_w is None:
        stroke_w = max(2, int(size * 0.055))

    bar_h    = size * 0.58
    gap      = size * 0.145          # space between bar centres
    n_bars   = 4
    total_w  = gap * (n_bars - 1)
    x0       = cx - total_w / 2     # centre of leftmost bar

    # Four vertical bars
    for i in range(n_bars):
        bx = x0 + i * gap
        draw.line(
            [(bx, cy - bar_h / 2), (bx, cy + bar_h / 2)],
            fill=color_bars, width=stroke_w,
        )

    # Diagonal strike (slightly wider padding than bars)
    pad  = size * 0.22
    sx   = cx - size / 2 + pad * 0.3
    ex   = cx + size / 2 - pad * 0.3
    sy   = cy + bar_h * 0.38
    ey   = cy - bar_h * 0.38
    # slightly thicker for visibility
    cw   = max(stroke_w, int(stroke_w * 1.15))
    draw.line([(sx, sy), (ex, ey)], fill=color_cross, width=cw)


def circle_mask(size):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size, size], fill=255)
    return mask


def rounded_mask(size, radius_frac=0.22):
    mask = Image.new("L", (size, size), 0)
    r = int(size * radius_frac)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size, size], radius=r, fill=255)
    return mask


# ── App icon ──────────────────────────────────────────────────────────────────

def make_icon_square(size):
    img  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Gradient background (rounded square will be masked later)
    grad_bg(draw, size, size, BG_MID, BG_DARK)

    # Tally marks centred
    draw_tally(draw, size / 2, size / 2, size * 0.72)

    # Soft inner glow ring at edge (optional — subtle)
    r = size // 2 - 4
    for thickness in range(3, 0, -1):
        alpha = 30 - thickness * 8
        draw.ellipse(
            [size // 2 - r, size // 2 - r, size // 2 + r, size // 2 + r],
            outline=(255, 255, 255, alpha), width=thickness,
        )

    return img


def make_icon_png(size, shape="square"):
    """Returns a PNG-ready RGBA image with rounded-square or circle shape."""
    raw  = make_icon_square(size)
    mask = circle_mask(size) if shape == "circle" else rounded_mask(size)
    out  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(raw, mask=mask)
    return out


# ── Feature graphic ───────────────────────────────────────────────────────────

def make_feature_graphic():
    W, H = 1024, 500
    img  = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    # Diagonal-split background: dark green left → slightly lighter right
    grad_bg(draw, W, H, (20, 50, 20), (35, 80, 35))

    # Subtle dot-grid texture overlay (very faint)
    for gy in range(0, H, 24):
        for gx in range(0, W, 24):
            draw.ellipse([gx, gy, gx + 2, gy + 2], fill=(255, 255, 255, 15))

    # ── Left panel: large icon illustration ───────────────────────────────────
    icon_size = 280
    icon_cx   = 230
    icon_cy   = H // 2 - 10

    # Soft glow behind icon
    for r in range(160, 80, -10):
        alpha = int(18 * (1 - r / 160))
        draw.ellipse(
            [icon_cx - r, icon_cy - r, icon_cx + r, icon_cy + r],
            fill=(52, 199, 89, alpha),
        )

    # Rounded square card
    card_half = icon_size // 2
    draw.rounded_rectangle(
        [icon_cx - card_half, icon_cy - card_half,
         icon_cx + card_half, icon_cy + card_half],
        radius=int(icon_size * 0.2),
        fill=BG_DARK,
    )

    # Tally marks on the card
    draw_tally(draw, icon_cx, icon_cy, icon_size * 0.72,
               stroke_w=int(icon_size * 0.052))

    # ── Right panel: text ─────────────────────────────────────────────────────
    tx = 490  # left edge of text block

    try:
        f_title    = ImageFont.truetype(FONT_BOLD, 72)
        f_sub      = ImageFont.truetype(FONT_MED,  32)
        f_body     = ImageFont.truetype(FONT_REG,  26)
    except Exception:
        f_title = f_sub = f_body = ImageFont.load_default()

    # App name
    draw.text((tx, 100), "Tally Counter", font=f_title, fill=WHITE)

    # Tagline
    draw.text((tx, 192), "Simple. Fast. Offline.", font=f_sub, fill=TEXT_MUTE)

    # Divider line
    draw.line([(tx, 242), (tx + 430, 242)], fill=GOLD, width=2)

    # Feature bullets
    bullets = [
        ("⬤", GREEN_ACC, "Multiple named counters"),
        ("⬤", GOLD,      "Target goals + progress ring"),
        ("⬤", GREEN_ACC, "Session history & themes"),
        ("⬤", GOLD,      "100% offline — no account"),
    ]
    by = 264
    for dot, dot_color, text in bullets:
        draw.text((tx,      by), dot,  font=f_body, fill=dot_color)
        draw.text((tx + 28, by), text, font=f_body, fill=WHITE)
        by += 44

    # Small badge bottom-right
    try:
        f_badge = ImageFont.truetype(FONT_MED, 20)
    except Exception:
        f_badge = ImageFont.load_default()
    draw.rounded_rectangle([tx, 460, tx + 200, 490], radius=14, fill=(0, 0, 0, 80))
    draw.text((tx + 12, 464), "Free  ·  No ads  ·  Offline", font=f_badge, fill=TEXT_MUTE)

    return img


# ── Save helpers ──────────────────────────────────────────────────────────────

def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG", optimize=True)
    kb = os.path.getsize(path) // 1024
    print(f"  ✓  {os.path.relpath(path, BASE)}  ({kb} KB)")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n── Generating Play Store assets ─────────────────────────────────────")

    # Play Store icon (512x512 — rounded square, no transparent bg required)
    icon512 = make_icon_png(512, shape="square")
    # Play Store requires opaque PNG for the icon — flatten onto white... actually
    # they accept RGBA but let's give them a solid-bg version too
    icon512_flat = Image.new("RGB", (512, 512), BG_DARK)
    icon512_flat.paste(icon512, mask=icon512.split()[3])
    save(icon512_flat, os.path.join(STORE, "icon-512.png"))
    save(icon512_flat, os.path.join(STORE, "icon-playstore.png"))

    # Feature graphic
    fg = make_feature_graphic()
    save(fg, os.path.join(STORE, "feature-graphic.png"))

    print("\n── Generating APK mipmap icons ───────────────────────────────────────")

    SIZES = {
        "mipmap-mdpi":    48,
        "mipmap-hdpi":    72,
        "mipmap-xhdpi":   96,
        "mipmap-xxhdpi":  144,
        "mipmap-xxxhdpi": 192,
    }

    for folder, px in SIZES.items():
        sq   = make_icon_png(px, shape="square")
        rnd  = make_icon_png(px, shape="circle")
        base = os.path.join(RES, folder)
        save(sq,  os.path.join(base, "ic_launcher.png"))
        save(rnd, os.path.join(base, "ic_launcher_round.png"))

    # Also save a foreground-only version (transparent bg) for completeness
    icon512_transparent = make_icon_png(512, shape="square")
    save(icon512_transparent, os.path.join(STORE, "icon-512-transparent.png"))

    print("\nDone! All assets saved.\n")
    print("Play Store upload checklist:")
    print("  store-assets/icon-512.png        → App icon (512×512)")
    print("  store-assets/feature-graphic.png → Feature graphic (1024×500)")
    print("  Add 2–8 screenshots manually in Play Console")
