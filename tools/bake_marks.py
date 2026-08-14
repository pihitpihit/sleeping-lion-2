#!/usr/bin/env python3
"""HP·경험 표식에 두께감을 입힌다.

┌────────────────────────────────────────────────────────────────────────────┐
│ **팩의 별은 검정 실루엣이다. 물들이기만 하면 납작하다.**                     │
└────────────────────────────────────────────────────────────────────────────┘

HP/XP 트래커는 CSS 그라디언트를 표식 모양으로 오려 도톰하게 만들었지만, 그것은
**둥근 돔**이라 시트의 별(끌 베벨)과 나란히 놓으면 다른 물건으로 보였다. 값 메달과
같은 끌 베벨을 씌워 구워 두면 **한 벌로 읽힌다** — 트래커와 시트가 같은 그림을
쓴다.

색은 트래커가 쓰던 두 그라디언트에서 그대로 가져왔다 — 붉은 쪽과 푸른 쪽.

바탕은 비운다. 메달과 달리 원반이 없으므로 **알파가 곧 표식 모양**이다.

    쓰는 법:  python3 tools/bake_marks.py
"""
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bakelib import TMP, dilate, edt, gauss, rgba_of

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEN = f'{ROOT}/public/assets/creator-pack/general'
N, SS = 256, 3

# ── 두께감.
#
# **값 메달과 달리 가장자리만 깎는다.** 별은 덩어리가 넓어 자르지 않으면 한가운데가
# 통째로 능선이 되어 하얗게 뜬다 — 테두리에서 `BEVEL`만큼만 비스듬히 내려오고
# 안쪽은 평평한 판이다. 실물 표식이 그렇게 생겼다.
BEVEL = 20        # 깎이는 띠의 너비(N=256 기준 px). 표식마다 다시 정할 수 있다.
AZIM, TILT = 135, 0.75
SPEC, SPEC_EXP = 0.35, 40
# 어두운 바탕에서 뜨게 하는 얇은 테.
EDGE_W = 1.2

# ── 표식마다 색 세 자리. 평평한 판이 `MID`다. 트래커의 두 그라디언트에서 왔다.
MARKS = {
    'xp-star': dict(
        dark=(0x2b, 0x4f, 0x7a), mid=(0x8d, 0xbc, 0xe8), light=(0xe4, 0xf3, 0xff),
        edge=(0x0d, 0x1c, 0x2e),
    ),
    'hp-drop': dict(
        # **붉은 반쪽 위에 얹히므로 별보다 더 밝아야 한다.** 처음 값(mid #e08a7a)은
        # 바탕과 같은 붉은 계열이라 형님이 「물방울이 안 보인다」고 짚었다 — 별이
        # 푸른 반쪽에서 갖는 만큼의 밝기 차를 여기서도 준다.
        dark=(0xb0, 0x55, 0x46), mid=(0xf7, 0xcd, 0xc4), light=(0xff, 0xfb, 0xf9),
        edge=(0x2a, 0x0a, 0x07),
        # 물방울은 꼬리가 가늘어 별과 같은 띠로 깎으면 **평평한 판이 남지 않는다** —
        # 꼬리 전체가 비탈이 되어 접힌 종이처럼 보인다. 좁게 깎는다.
        bevel=13,
    ),
}


def bake(name, color):
    DARK = np.array(color['dark'], dtype=np.float32)
    MID = np.array(color['mid'], dtype=np.float32)
    LIGHT = np.array(color['light'], dtype=np.float32)
    EDGE = np.array(color['edge'], dtype=np.float32)

    bevel = color.get('bevel', BEVEL)
    n = N*SS
    subprocess.run(['rsvg-convert', '-w', str(n), '-h', str(n),
                    '-o', f'{TMP}/m.png', f'{GEN}/{name}.svg'], check=True)
    m = (rgba_of(f'{TMP}/m.png', n)[..., 3]/255.0)
    solid = (m > 0.5).astype(np.float32)

    import math
    cap = bevel*SS
    # 가장자리에서 `cap`까지만 오르고 그 뒤는 평평하다.
    h = np.minimum(edt(solid), cap)
    h = gauss(h, SS*0.8)          # 이가 빠진 자리를 눅여 면이 고르게 선다
    gy, gx = np.gradient(h)
    a = math.radians(AZIM)
    lx, ly, lz = math.cos(a)*TILT, math.sin(a)*TILT, 1.0
    ln = np.hypot(np.hypot(gx, gy), 1.0)
    ll = math.sqrt(lx*lx + ly*ly + lz*lz)
    lam = np.clip((-gx*lx - gy*ly + lz)/(ln*ll), 0, 1)

    # **평평한 판이 기준이다.** 그보다 빛을 더 받으면 밝게, 덜 받으면 어둡게.
    flat = lz/ll
    up = np.clip((lam - flat)/max(1e-6, 1 - flat), 0, 1)
    down_ = np.clip((flat - lam)/flat, 0, 1)
    body = MID + (LIGHT - MID)*up[..., None] - (MID - DARK)*down_[..., None]
    body = np.clip(body + (up**SPEC_EXP*SPEC*255)[..., None], 0, 255)

    # 가장자리 한 겹은 어둡게 — 별이 어두운 바탕에 얹혀도 윤곽이 산다.
    edge = np.clip((EDGE_W*SS - edt(solid))/(EDGE_W*SS), 0, 1)*solid
    body = body*(1-edge[..., None]) + EDGE*edge[..., None]

    def down(x):
        """세 배로 그린 것을 줄인다. 한 겹이든 세 겹이든 같은 함수로."""
        if x.ndim == 3:
            return np.dstack([down(x[..., i]) for i in range(x.shape[2])])
        return x.reshape(N, SS, N, SS).mean((1, 3))

    alpha = down(m)
    rgb = down(body*m[..., None])/np.maximum(alpha, 1e-6)[..., None]
    out = np.dstack([np.clip(rgb, 0, 255), np.clip(alpha*255, 0, 255)]).astype(np.uint8)
    open(f'{TMP}/lit.rgba', 'wb').write(out.tobytes())
    subprocess.run(['magick', '-depth', '8', '-size', f'{N}x{N}', f'RGBA:{TMP}/lit.rgba',
                    '-quality', '94', f'{GEN}/{name}-lit.webp'], check=True)
    print('구웠다:', f'{GEN}/{name}-lit.webp')


def main():
    for name, color in MARKS.items():
        bake(name, color)


if __name__ == '__main__':
    main()
