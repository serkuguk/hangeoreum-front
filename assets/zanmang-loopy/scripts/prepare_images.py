"""Use system Python + Pillow after Blender rendering. No generated art or external service."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
INSPECTION = ROOT / 'docs/inspection'
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 19)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)


def sheet(destination, entries, columns=5, cell=320):
    rows = (len(entries) + columns - 1) // columns
    canvas = Image.new('RGB', (columns * cell, rows * (cell + 32) + 40), '#f4f1f4')
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 10), 'INFERRED - derived from the 3D prototype; not an official reference', fill='#59132c', font=small)
    for index, (label, path) in enumerate(entries):
        image = Image.open(path).convert('RGBA')
        image.thumbnail((cell, cell))
        x, y = index % columns * cell, index // columns * (cell + 32) + 40
        canvas.paste(image, (x + (cell - image.width) // 2, y), image)
        draw.text((x + 12, y + cell + 3), label, fill='#59132c', font=font)
    canvas.save(destination)


names = ('neutral', 'hello', 'happy', 'thinking', 'sad', 'pointing')
for name in names:
    png = ROOT / ('exports/2d/' + name + '.png')
    with Image.open(png) as image:
        assert image.mode == 'RGBA' and image.getextrema()[3] == (0, 255), name + ' needs transparency'
        assert image.getpixel((0, 0))[3] == 0
        image.save(png.with_suffix('.webp'), 'WEBP', lossless=True, method=6)
        with Image.open(png.with_suffix('.webp')) as webp:
            assert webp.mode == 'RGBA' and webp.getextrema()[3] == (0, 255)

sheet(ROOT / 'concept/turnaround.png', [(name, INSPECTION / ('view-' + name + '.png')) for name in
      ('Front', 'FrontThreeQuarter', 'Side', 'BackThreeQuarter', 'Back')])
sheet(ROOT / 'concept/expressions.png', [
    ('Neutral', ROOT / 'exports/2d/neutral.png'),
    ('Smile (inferred)', INSPECTION / 'expression-smiling.png'),
    ('Surprised (inferred)', INSPECTION / 'expression-surprised.png'),
    ('Thinking (inferred)', ROOT / 'exports/2d/thinking.png'),
    ('Happy (inferred)', ROOT / 'exports/2d/happy.png'),
    ('Sad (inferred)', ROOT / 'exports/2d/sad.png'),
], columns=3)
sheet(ROOT / 'concept/poses.png', [
    ('Standing', ROOT / 'exports/2d/neutral.png'), ('Wave', ROOT / 'exports/2d/hello.png'),
    ('Walk (in place)', INSPECTION / 'clip-Walk-1.png'), ('Point', ROOT / 'exports/2d/pointing.png'),
    ('Celebrate', ROOT / 'exports/2d/happy.png'),
])
sheet(INSPECTION / 'animations.png', [(clip + ' ' + str(frame), INSPECTION / ('clip-%s-%d.png' % (clip, frame)))
      for clip in ('Idle', 'Wave', 'Walk', 'Point', 'Celebrate', 'Sad') for frame in range(5)], cell=240)
print('IMAGE_CHECK_PASS: 6 transparent PNG + 6 lossless WebP; 3 concept sheets + animation contact sheet')
