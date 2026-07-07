#!/usr/bin/env python3
"""Génère une image produit Stripe 800x800."""

from PIL import Image, ImageDraw

SIZE = 800
img = Image.new('RGB', (SIZE, SIZE), (79, 70, 229))
draw = ImageDraw.Draw(img)

# Dégradé
for y in range(SIZE):
    r = int(79 + (99 - 79) * y / SIZE)
    g = int(70 + (102 - 70) * y / SIZE)
    b = int(229 + (241 - 229) * y / SIZE)
    draw.line((0, y, SIZE, y), fill=(r, g, b))

# Cercle décoratif
draw.ellipse((-80, -80, 340, 340), fill=(255, 255, 255, 15))
draw.ellipse((SIZE - 260, SIZE - 260, SIZE + 40, SIZE + 40), fill=(255, 255, 255, 10))

# Enveloppe
cx, cy, s = SIZE // 2, SIZE // 2, 160
draw.rounded_rectangle((cx - s, cy - s, cx + s, cy + s), 40, outline=(255, 255, 255), width=12)

margin = 48
draw.line((cx - s + margin, cy - 20, cx, cy + 32, cx + s - margin, cy - 20), fill=(255, 255, 255), width=12)
draw.line((cx - s + margin, cy + 32, cx - s + margin, cy + s - margin), fill=(255, 255, 255), width=12)
draw.line((cx + s - margin, cy + 32, cx + s - margin, cy + s - margin), fill=(255, 255, 255), width=12)
draw.line((cx - s + margin, cy + s - margin, cx + s - margin, cy + s - margin), fill=(255, 255, 255), width=12)

# @ au centre
draw.text((cx - 60, cy - 120), "Email", fill=(255, 255, 255), font=None)
draw.text((cx - 100, cy + 170), "Signature Parser", fill=(200, 200, 255), font=None)

img.save('/Users/titouanwajda/email-signature-parser/store_assets/stripe-product-800x800.png')
print("✅ stripe-product-800x800.png")
