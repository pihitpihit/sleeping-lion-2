#!/usr/bin/env python3
"""레벨 왕관을 팩에서 오려낸다.

┌────────────────────────────────────────────────────────────────────────────┐
│ **팩의 아이콘 묶음에는 없다 — 능력 카드 앞면 위쪽에 박혀 있다.**             │
└────────────────────────────────────────────────────────────────────────────┘

`Icon Pack/`을 다 뒤져도 왕관이 없었다(구현 결정 222대로 먼저 뒤졌다). 카드
앞면 그림(`Ability Cards - Front.jpg`)의 위쪽 한가운데에 있어 그 자리만 오려
쓴다 — **다시 그리지 않는다.** 값 메달의 홈을 오려낸 것과 같은 손질이다.

원본이 37x23px밖에 안 되므로 **밝기를 알파로 옮겨** 가장자리의 반투명을 살린
뒤 네 배로 늘려 담는다. 이진으로 자르면 계단이 진다.

    쓰는 법:  python3 tools/extract_crown.py "<팩의 Character Ability Cards 폴더>"
"""
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bakelib import TMP, rgba_of

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = f'{ROOT}/public/assets/creator-pack/general/level-crown.webp'

# ── 카드 앞면(413x563)에서 잰 자리. 왕관은 x 187~223, y 65~87이다.
CROP = (45, 30, 184, 62)   # 폭, 높이, 왼쪽, 위 — 둘레를 조금 넉넉히 잡는다
LOW, HIGH = 150.0, 226.0   # 이 밝기 사이를 알파 0~1로 편다
SCALE = 4


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = f'{sys.argv[1]}/Ability Cards - Front.jpg'
    w, h, x, y = CROP
    subprocess.run(['magick', src, '-crop', f'{w}x{h}+{x}+{y}', '+repage',
                    f'{TMP}/crown.png'], check=True)
    a = rgba_of(f'{TMP}/crown.png', 0).reshape(h, w, 4) if False else None
    subprocess.run(['magick', f'{TMP}/crown.png', '-depth', '8', f'RGBA:{TMP}/crown.rgba'], check=True)
    a = np.frombuffer(open(f'{TMP}/crown.rgba', 'rb').read(), dtype=np.uint8)
    a = a.reshape(h, w, 4).astype(np.float32)
    g = a[..., :3].mean(2)

    alpha = np.clip((g - LOW)/(HIGH - LOW), 0, 1)

    # **왕관만 남긴다.** 카드 테두리의 흰 선이 같은 밝기라 함께 걸린다 —
    # 몸통 한가운데에서 물이 번지듯 이어진 것만 취한다.
    seed = np.zeros((h, w), bool)
    seed[h//2 + 4, w//2] = True
    solid = alpha > 0.35
    for _ in range(600):
        nb = (seed | np.roll(seed, 1, 0) | np.roll(seed, -1, 0)
              | np.roll(seed, 1, 1) | np.roll(seed, -1, 1))
        nxt = nb & solid
        if (nxt == seed).all():
            break
        seed = nxt
    # 가장자리의 반투명까지 데려온다 — 이어진 덩어리에 닿아 있는 것만.
    near = seed.copy()
    for _ in range(2):
        near = (near | np.roll(near, 1, 0) | np.roll(near, -1, 0)
                | np.roll(near, 1, 1) | np.roll(near, -1, 1))
    alpha = np.where(near, alpha, 0)

    ys, xs = np.where(alpha > 0.02)
    alpha = alpha[ys.min():ys.max()+1, xs.min():xs.max()+1]
    hh, ww = alpha.shape
    print(f'오려낸 크기: {ww}x{hh}')

    out = np.zeros((hh, ww, 4), np.uint8)
    out[..., :3] = 255                      # 흰 왕관. 색은 화면에서 정한다
    out[..., 3] = np.clip(alpha*255, 0, 255).astype(np.uint8)
    open(f'{TMP}/out.rgba', 'wb').write(out.tobytes())
    subprocess.run(['magick', '-depth', '8', '-size', f'{ww}x{hh}', f'RGBA:{TMP}/out.rgba',
                    '-filter', 'Catrom', '-resize', f'{ww*SCALE}x{hh*SCALE}',
                    '-quality', '95', OUT], check=True)
    print('담았다:', OUT)


if __name__ == '__main__':
    main()
