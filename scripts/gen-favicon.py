"""生成网站 favicon 与 PWA 图标（芯片主题：蓝紫渐变底 + 白色封装 + 蓝色 Die + 引脚）"""
import os

from PIL import Image, ImageDraw

ROOT = r"D:\Work-By\2026-07-25-15-52-40\public"
ICON_DIR = os.path.join(ROOT, "icons")
os.makedirs(ICON_DIR, exist_ok=True)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_chip(size: int) -> Image.Image:
    """绘制芯片 logo（size x size）"""
    img = Image.new("RGB", (size, size))
    px = img.load()

    # 蓝紫对角渐变底
    c1, c2, c3 = (37, 99, 235), (79, 70, 229), (124, 58, 237)
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            if t < 0.55:
                c = lerp(c1, c2, t / 0.55)
            else:
                c = lerp(c2, c3, (t - 0.55) / 0.45)
            px[x, y] = c

    # 圆角遮罩
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    r = int(size * 0.22)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    img.putalpha(mask)

    d = ImageDraw.Draw(img)
    s = size / 64.0  # 缩放系数（按 64 viewBox 设计）

    # 白色封装方块
    pad = int(17 * s)
    box = int(30 * s)
    d.rounded_rectangle([pad, pad, pad + box, pad + box], radius=int(5 * s), fill=(255, 255, 255))

    # 蓝色 Die
    dpad = int(23 * s)
    dbox = int(18 * s)
    d.rounded_rectangle([dpad, dpad, dpad + dbox, dpad + dbox], radius=int(3.5 * s), fill=(37, 99, 235))

    # Die 内电路线
    w = max(1, int(1.6 * s))
    d.line([dpad + 4 * s, dpad + 4 * s, dpad + 14 * s, dpad + 14 * s], fill=(147, 197, 253), width=w)
    d.line([dpad + 14 * s, dpad + 4 * s, dpad + 4 * s, dpad + 14 * s], fill=(147, 197, 253), width=w)

    # 引脚（上 5 / 下 5 / 左 5 / 右 5）
    lw = max(1, int(2.4 * s))
    x0 = int(17 * s)
    y0 = int(17 * s)
    box2 = int(30 * s)
    for i in range(5):
        t = 0.1 + i * 0.2
        tx = int(x0 + box2 * t)
        # 上
        d.line([tx, int(9.5 * s), tx, int(17 * s) - 1], fill=(255, 255, 255), width=lw)
        # 下
        d.line([tx, int(17 * s) + box2, tx, int(54.5 * s)], fill=(255, 255, 255), width=lw)
        # 左
        d.line([int(9.5 * s), tx, int(17 * s) - 1, tx], fill=(255, 255, 255), width=lw)
        # 右
        d.line([int(17 * s) + box2, tx, int(54.5 * s), tx], fill=(255, 255, 255), width=lw)

    return img


# 生成多尺寸 PNG + ICO
for size in (16, 32, 48, 180, 192, 512):
    img = draw_chip(size)
    if size <= 48:
        pass
    out = os.path.join(ICON_DIR, f"icon-{size}.png")
    img.save(out, "PNG")
    print("saved", out)

# favicon.ico（16/32/48 多尺寸打包）
ico = Image.new("RGBA", (1, 1))
frames = [draw_chip(s).convert("RGBA") for s in (16, 32, 48)]
frames[0].save(
    os.path.join(ROOT, "favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
    append_images=frames[1:],
)
print("saved favicon.ico")

# apple-touch-icon（180x180，无透明圆角——iOS 会自己加圆角）
touch = draw_chip(180).convert("RGBA")
touch = Image.new("RGB", (180, 180), (37, 99, 235))
td = ImageDraw.Draw(touch)
s = 180 / 64.0
td.rounded_rectangle([int(17 * s), int(17 * s), int(47 * s), int(47 * s)], radius=int(5 * s), fill=(255, 255, 255))
td.rounded_rectangle([int(23 * s), int(23 * s), int(41 * s), int(41 * s)], radius=int(3.5 * s), fill=(37, 99, 235))
touch.save(os.path.join(ROOT, "apple-touch-icon.png"), "PNG")
print("saved apple-touch-icon.png")
