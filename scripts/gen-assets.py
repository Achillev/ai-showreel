#!/usr/bin/env python3
"""Genere la suite d'assets SEO visuels d'AI Showreel (favicon + og:image + manifest).
Sorties dans site/static/ (copiees telles quelles vers dist/ par build.mjs).
Palette alignee sur la refonte dark-native (2026-07-16) : violet AI #7C5CFF, creme #FAF6EE,
encre #0F1419. Polices de marque dans assets/fonts/ (gitignorees ; re-telechargeables via curl,
voir README) : Fraunces (serif editoriale) + JetBrains Mono (labels techniques) + Hanken Grotesk.
Rien d'invente : l'og:image ne cite que des faits deja affiches sur le site (200+ cas, echelle de preuve)."""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "site", "static")
FONTS = os.path.join(ROOT, "assets", "fonts")
os.makedirs(OUT, exist_ok=True)

# --- palette refonte (miroir des tokens de site/style.css) ---
ACCENT = (124, 92, 255)     # #7C5CFF  violet AI (accent-primary)
CREAM  = (250, 246, 238)    # #FAF6EE  bg-primary (light)
INK    = (15, 20, 25)       # #0F1419  text-primary (light)
MUTED  = (107, 115, 137)    # #6B7389  text-muted
HAIR   = (229, 223, 208)    # #E5DFD0  border-subtle (light)
BEIGE  = (245, 241, 232)    # #F5F1E8  text-primary (dark) = le beige signature

FRAU = os.path.join(FONTS, "Fraunces.ttf")
JBM  = os.path.join(FONTS, "JetBrainsMono.ttf")
HANK = os.path.join(FONTS, "HankenGrotesk.ttf")

def _var(path, size, axes):
    f = ImageFont.truetype(path, size)
    try:
        f.set_variation_by_axes(axes)
    except Exception:
        pass
    return f

# Fraunces : axes [Optical Size, Weight, Softness, Wonky]
def fraunces(size, wght=600, opsz=72, soft=0, wonk=0):
    return _var(FRAU, size, [opsz, wght, soft, wonk])

def mono(size, wght=600):
    return _var(JBM, size, [wght])

def hank(size, wght=450):
    return _var(HANK, size, [wght])

def diamond(cx, cy, r):
    return [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]

# ---------- FAVICON : tuile violette arrondie + losange beige ----------
def tile(size):
    s = size * 4  # supersampling
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rad = int(s * 0.22)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=rad, fill=ACCENT)
    d.polygon(diamond(s // 2, s // 2, int(s * 0.30)), fill=BEIGE)
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
            '<rect width="64" height="64" rx="14" fill="#7C5CFF"/>'
            '<path d="M32 14 L50 32 L32 50 L14 32 Z" fill="#F5F1E8"/></svg>\n')

# ---------- OG IMAGE 1200x630 ----------
def draw_tracked(d, xy, text, font, fill, tracking):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tracking
    return x

SS = 2
W, H = 1200 * SS, 630 * SS

def make_og(fname, title1, title2, sub1, sub2, footer_right):
    og = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(og)
    d.rectangle([0, 0, W, 9 * SS], fill=ACCENT)  # barre d'accent haute
    # watermark : grand losange accent tres discret, debordant a droite
    wm = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(wm).polygon(diamond(int(W * 0.92), int(H * 0.52), int(H * 0.5)), fill=ACCENT + (16,))
    og = Image.alpha_composite(og.convert("RGBA"), wm).convert("RGB")
    d = ImageDraw.Draw(og)
    M = 80 * SS
    ey = 78 * SS  # eyebrow : losange + wordmark mono tracke (echo des kickers du site)
    d.polygon(diamond(M + 9 * SS, ey + 13 * SS, 9 * SS), fill=ACCENT)
    draw_tracked(d, (M + 28 * SS, ey), "AI SHOWREEL", mono(24 * SS, 700), INK, 3 * SS)
    th = fraunces(66 * SS, wght=600, opsz=120)  # titre (Fraunces display)
    d.text((M, 172 * SS), title1, font=th, fill=INK)
    d.text((M, 250 * SS), title2, font=th, fill=INK)
    sf = hank(29 * SS, 450)  # sous-titre
    d.text((M, 356 * SS), sub1, font=sf, fill=MUTED)
    d.text((M, 396 * SS), sub2, font=sf, fill=MUTED)
    d.line([(M, 520 * SS), (W - M, 520 * SS)], fill=HAIR, width=2 * SS)  # filet + pied
    d.text((M, 548 * SS), "ai-showreel.com", font=mono(26 * SS, 700), fill=INK)
    rf = mono(21 * SS, 500)
    rw = d.textlength(footer_right, font=rf)
    d.text((W - M - rw, 552 * SS), footer_right, font=rf, fill=MUTED)
    og.resize((1200, 630), Image.LANCZOS).save(os.path.join(OUT, fname))

make_og("og-image.png", "Les déploiements IA prouvés", "du marketing digital",
        "200+ cas de grandes marques, sourcés et notés sur",
        "une échelle de preuve publique, vérifiés vivants.",
        "index indépendant, sans biais vendeur")
make_og("og-image-en.png", "The proven AI deployments", "of digital marketing",
        "200+ cases from major brands, sourced and graded",
        "on a public evidence scale, verified live.",
        "independent index, no vendor bias")

# ---------- MANIFEST ----------
with open(os.path.join(OUT, "site.webmanifest"), "w") as f:
    f.write('{\n  "name": "AI Showreel",\n  "short_name": "AI Showreel",\n'
            '  "description": "Index indépendant des déploiements IA prouvés en marketing digital.",\n'
            '  "icons": [\n'
            '    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },\n'
            '    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }\n'
            '  ],\n  "theme_color": "#7C5CFF",\n  "background_color": "#FAF6EE",\n'
            '  "display": "standalone",\n  "start_url": "/"\n}\n')

print("Assets generes dans", OUT)
for n in sorted(os.listdir(OUT)):
    p = os.path.join(OUT, n)
    print(f"  {n:26} {os.path.getsize(p):>7} o")
