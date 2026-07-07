#!/usr/bin/env python3
"""Génère un logo produit Stripe 800x800."""

from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = '/Users/titouanwajda/email-signature-parser/store_assets'

def create_logo():
    S = 800
    img = Image.new('RGB', (S, S), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Fond indigo
    for y in range(S):
        r = int(79 + (99 - 79) * y / S)
        g = int(70 + (102 - 70) * y / S)
        b = int(229 + (241 - 229) * y / S)
        draw.line((0, y, S, y), fill=(r, g, b))

    # Grand rond décoratif
    draw.ellipse((-100, -100, 300, 300), fill=(255, 255, 255, 15))
    draw.ellipse((S - 200, S - 200, S + 50, S + 50), fill=(255, 255, 255, 10))

    # Enveloppe
    cx, cy, s = S // 2, S // 2 - 30, 140
    draw.rounded_rectangle((cx - s, cy - s, cx + s, cy + s), 36, outline=(255, 255, 255), width=10)

    m = 42
    draw.line((cx - s + m, cy - 18, cx, cy + 28, cx + s - m, cy - 18), fill=(255, 255, 255), width=10)
    draw.line((cx - s + m, cy + 28, cx - s + m, cy + s - m), fill=(255, 255, 255), width=10)
    draw.line((cx + s - m, cy + 28, cx + s - m, cy + s - m), fill=(255, 255, 255), width=10)
    draw.line((cx - s + m, cy + s - m, cx + s - m, cy + s - m), fill=(255, 255, 255), width=10)

    # Texte "Signature Parser"
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 52)
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28)
    except:
        font = ImageFont.load_default()
        font_small = ImageFont.load_default()

    draw.text((cx - 180, cy + 200), "Signature Parser", fill=(255, 255, 255), font=font)
    draw.text((cx - 100, cy + 270), "📋 Extraire les contacts en 1 clic", fill=(200, 200, 255), font=font_small)

    img.save(os.path.join(OUT_DIR, 'stripe-product-logo.png'))
    print(f"✅ stripe-product-logo.png")

def create_small_logo():
    """Petit logo Stripe 128x128 pour favicon / icone."""
    S = 128
    img = Image.new('RGB', (S, S), (79, 70, 229))
    draw = ImageDraw.Draw(img)

    cx, cy, s = S // 2, S // 2, 40
    draw.rounded_rectangle((cx - s, cy - s, cx + s, cy + s), 10, outline=(255, 255, 255), width=4)

    m = 12
    draw.line((cx - s + m, cy - 5, cx, cy + 8, cx + s - m, cy - 5), fill=(255, 255, 255), width=4)
    draw.line((cx - s + m, cy + 8, cx - s + m, cy + s - m), fill=(255, 255, 255), width=4)
    draw.line((cx + s - m, cy + 8, cx + s - m, cy + s - m), fill=(255, 255, 255), width=4)
    draw.line((cx - s + m, cy + s - m, cx + s - m, cy + s - m), fill=(255, 255, 255), width=4)

    img.save(os.path.join(OUT_DIR, 'stripe-product-logo-128.png'))
    print(f"✅ stripe-product-logo-128.png")

create_logo()
create_small_logo()
print("\n🎯 Logos prêts dans store_assets/")
