"""Optional asset maintenance; runtime/build use the committed output files.
Requires Pillow, fonttools and brotli. Originals are retained.
"""
from pathlib import Path
from PIL import Image
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont

for original in Path("public/assets/images").glob("*.png"):
    if original.stat().st_size < 50000:
        continue
    source = Image.open(original)
    target = original.with_suffix(".webp")
    source.save(target, format="WEBP", lossless=True, method=6, exact=True)
    assert Image.open(target).convert("RGBA").tobytes() == source.convert("RGBA").tobytes(), original

options = subset.Options()
options.flavor = "woff2"
options.recalc_timestamp = False
font = subset.load_font("public/assets/fonts/roboto-mono.ttf", options)
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=list(range(0x100)) + [0x131, 0x152, 0x153, 0x20AC, 0x2122] + list(range(0x2000, 0x2070)))
subsetter.subset(font)
font = instantiateVariableFont(font, {"wght": (400, 700)}, inplace=False)
font.flavor = "woff2"
font.save("public/assets/fonts/roboto-mono.woff2")
