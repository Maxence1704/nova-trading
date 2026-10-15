#!/usr/bin/env python3
"""Fabrique les icônes de Nova Terminal à partir de icons/icon-source.png.

    python3 icons/build.py

Trois familles de fichiers, pour trois usages :

  • icon-1024 / icon-512 / icon-192 / favicon-32
        coins arrondis (squircle), fond transparent → usage web et PWA « any ».
  • icon-180.png
        bords plein cadre, opaque → iOS applique lui-même son masque.
  • icon-maskable-512.png
        bords plein cadre, opaque → Android peut découper en cercle/goutte :
        l'emblème central reste dans la zone sûre (80 % du côté).
"""

import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'icon-source.png')

# Cadre de la tuile dans l'image source, mesuré sur icon-source.png (1024×1024)
CROP = (273, 261, 772, 760)

# Rayon des coins, en fraction du côté (iOS ≈ 22,4 % ; 21 % garantit un bord net
# sans laisser apparaître l'arrondi d'origine, plus doux).
RADIUS = 0.21
SS = 4  # suréchantillonnage du masque, pour un anti-aliasing propre


def squircle_mask(size, radius_frac=RADIUS):
    big = size * SS
    m = Image.new('L', (big, big), 0)
    ImageDraw.Draw(m).rounded_rectangle(
        (0, 0, big - 1, big - 1), radius=int(round(big * radius_frac)), fill=255
    )
    return m.resize((size, size), Image.LANCZOS)


def square(size, opaque=False):
    im = Image.open(SRC).convert('RGB').crop(CROP).resize((size, size), Image.LANCZOS)
    if opaque:
        return im
    out = im.convert('RGBA')
    out.putalpha(squircle_mask(size))
    return out


def main():
    jobs = [
        ('icon-1024.png', 1024, False),
        ('icon-512.png', 512, False),
        ('icon-192.png', 192, False),
        ('favicon-32.png', 32, False),
        ('icon-180.png', 180, True),
        ('icon-maskable-512.png', 512, True),
    ]
    for name, size, opaque in jobs:
        img = square(size, opaque)
        img.save(os.path.join(HERE, name), optimize=True)
        print(f'{name:<24} {size}×{size}  {os.path.getsize(os.path.join(HERE, name)):>7} o')


if __name__ == '__main__':
    main()
