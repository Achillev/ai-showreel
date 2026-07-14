#!/usr/bin/env python3
"""Genere la suite d'assets SEO visuels d'AI Showreel (favicon + og:image + manifest).
Sorties dans site/static/ (copiees telles quelles vers dist/ par build.mjs).
Polices de marque dans assets/fonts/ (gitignorees ; re-telechargeables via curl, voir README).
Rien d'invente : l'og:image ne cite que des faits deja affiches sur le site (200+ cas, echelle de preuve)."""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "site", "static")
FONTS = os.path.join(ROOT, "assets", "fonts")
os.makedirs(OUT, exist_ok=True)

ACCENT = (27, 77, 255)      # #1b4dff
CREAM  = (247, 246, 243)    # #f7f6f3
INK    = (25, 28, 34)       # #191c22
MUTED  = (90, 100, 114)     # #5a6472
HAIR   = (222, 220, 214)    # #dedcd6
WHITE  = (255, 255, 255)

NEWS = os.path.join(FONTS, "Newsreader.ttf")
HANK = os.path.join(FONTS, "HankenGrotesk.ttf")

def fnt(path, size, wght, opsz=None):
    f = ImageFont.truetype(path, size)
    try:
        f.set_variation_by_axes([opsz, wght] if opsz is not None else [wght])
    except Exception:
        pass
    return f

def diamond(cx, cy, r):
    return [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]

# ---------- FAVICON : tuile bleue arrondie + losange blanc ----------
def tile(size):
    s = size * 4  # supersampling
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rad = int(s * 0.22)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=rad, fill=ACCENT)
    d.polygon(diamond(s // 2, s // 2, int(s * 0.30)), fill=WHITE)
    return img.resize((size, size), Image.LANCZOS)

for sz, name in [(16, "favicon-16.png"), (32, "favicon-32.png"),
                 (180, "apple-touch-icon.png"), (192, "icon-192.png"),
                 (512, "icon-512.png")]:
    tile(sz).save(os.path.join(OUT, name))

# favicon.ico multi-tailles depuis un master 256
tile(256).save(os.path.join(OUT, "favicon.ico"),
               sizes=[(16, 16), (32, 32), (48, 48)])

# favicon.svg (vectoriel, navigateurs modernes)
with open(os.path.join(OUT, "favicon.svg"), "w") as f:
    f.write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
            '<rect width="64" height="64" rx="14" fill="#1b4dff"/>'
            '<path d="M32 14 L50 32 L32 50 L14 32 Z" fill="#ffffff"/></svg>\n')

# ---------- OG IMAGE 1200x630 ----------
def draw_tracked(d, xy, text, font, fill, tracking):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tracking
    return x

SS = 2
W, H = 1200 * SS, 630 * SS
og = Image.new("RGB", (W, H), CREAM)
d = ImageDraw.Draw(og)

# barre d'accent haute
d.rectangle([0, 0, W, 9 * SS], fill=ACCENT)

# watermark : grand losange accent tres discret, debordant a droite
wm = Image.new("RGBA", (W, H), (0, 0, 0, 0))
dwm = ImageDraw.Draw(wm)
dwm.polygon(diamond(int(W * 0.92), int(H * 0.52), int(H * 0.5)),
            fill=ACCENT + (14,))
og = Image.alpha_composite(og.convert("RGBA"), wm).convert("RGB")
d = ImageDraw.Draw(og)

M = 80 * SS
# eyebrow : losange + wordmark tracke
ey = 78 * SS
d.polygon(diamond(M + 9 * SS, ey + 13 * SS, 9 * SS), fill=ACCENT)
draw_tracked(d, (M + 28 * SS, ey), "AI SHOWREEL",
             fnt(HANK, 27 * SS, 700), INK, 3 * SS)

# titre (Newsreader display)
th = fnt(NEWS, 66 * SS, 560, opsz=72)
d.text((M, 172 * SS), "Les déploiements IA prouvés", font=th, fill=INK)
d.text((M, 250 * SS), "du marketing digital", font=th, fill=INK)

# sous-titre (Hanken)
sf = fnt(HANK, 29 * SS, 450)
d.text((M, 356 * SS),
       "200+ cas de grandes marques, sourcés et notés sur", font=sf, fill=MUTED)
d.text((M, 396 * SS),
       "une échelle de preuve publique, vérifiés vivants.", font=sf, fill=MUTED)

# filet + pied
d.line([(M, 520 * SS), (W - M, 520 * SS)], fill=HAIR, width=2 * SS)
d.text((M, 548 * SS), "ai-showreel.com", font=fnt(HANK, 28 * SS, 700), fill=INK)
rf = fnt(HANK, 24 * SS, 500)
rt = "index indépendant, sans biais vendeur"
rw = d.textlength(rt, font=rf)
d.text((W - M - rw, 552 * SS), rt, font=rf, fill=MUTED)

og.resize((1200, 630), Image.LANCZOS).save(os.path.join(OUT, "og-image.png"))

# ---------- MANIFEST ----------
with open(os.path.join(OUT, "site.webmanifest"), "w") as f:
    f.write('{\n  "name": "AI Showreel",\n  "short_name": "AI Showreel",\n'
            '  "description": "Index indépendant des déploiements IA prouvés en marketing digital.",\n'
            '  "icons": [\n'
            '    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },\n'
            '    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }\n'
            '  ],\n  "theme_color": "#1b4dff",\n  "background_color": "#f7f6f3",\n'
            '  "display": "standalone",\n  "start_url": "/"\n}\n')

print("Assets generes dans", OUT)
for n in sorted(os.listdir(OUT)):
    p = os.path.join(OUT, n)
    print(f"  {n:26} {os.path.getsize(p):>7} o")
