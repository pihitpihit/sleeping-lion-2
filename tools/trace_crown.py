#!/usr/bin/env python3
"""레벨 왕관을 벡터로 다시 뽑는다.

┌────────────────────────────────────────────────────────────────────────────┐
│ **오려낸 그림은 37x23px이라 크게 쓰면 흐리다.**                              │
└────────────────────────────────────────────────────────────────────────────┘

카드 앞면에서 오려낸 것(`extract_crown.py`)은 작게 쓰면 깨끗하지만 40px을 넘기면
가장자리가 무른다. **손으로 다시 그리는 대신 윤곽을 따라 뜬다** — 눈으로 베끼면
비율이 틀어지고, 등고선을 따면 원본의 각과 굽이가 그대로 남는다.

세 단계다.

1. 알파를 크게 늘려 부드러운 마당을 만든다.
2. **마칭 스퀘어**로 0.5 등고선을 딴다 — 바깥 테두리와 뚫린 구멍이 모두 닫힌
   고리로 나온다.
3. **더글러스-퍼커**로 굽이를 줄인다. 곧은 변은 두 점으로 남고 굽은 데만 점이
   붙는다 — 왕관은 거의 직선이라 몇십 점이면 족하다.

`fill-rule="evenodd"`로 그리면 구멍이 저절로 뚫린다 — 어느 고리가 구멍인지
따로 셀 것이 없다.

    쓰는 법:  python3 tools/trace_crown.py
"""
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bakelib import TMP

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = '/tmp/_bake/level-crown-raw.webp'   # `extract_crown.py`가 내놓는 밑감
OUT = f'{ROOT}/public/assets/creator-pack/general/level-crown.svg'

UP = 6          # 알파를 몇 배로 늘려 등고선을 딸 것인가
TOL = 10        # 굽이를 줄이는 자, 늘린 좌표 기준 px

# ┌──────────────────────────────────────────────────────────────────────────┐
# │ **울퉁불퉁까지 베끼지 않는다.**                                           │
# └──────────────────────────────────────────────────────────────────────────┘
#
# 원본은 37x23px을 크게 늘린 것이라 가장자리가 물결친다 — 자를 잘게 잡으면 그
# 물결이 그대로 벡터가 된다. **원래는 곧은 변이었을 것**이므로 자를 굵게 잡아
# 펴 준다(형님이 짚었다). 3·6·10·16을 그려 놓고 10을 골랐다.
VIEW = 1000     # 내보낼 viewBox의 가로


def crack_loops(mask):
    """화소 경계를 따라 걸어 닫힌 고리를 얻는다.

    ┌────────────────────────────────────────────────────────────────────────┐
    │ **갈림길에서 엇나가지 않는 길을 고른다.**                               │
    └────────────────────────────────────────────────────────────────────────┘

    처음에는 마칭 스퀘어로 등고선을 땄는데 **네 갈래가 만나는 자리에서 다른
    가지로 새어** 왕관이 두 동강 났다. 여기서는 칸과 칸 사이의 금(crack)만
    따라간다 — 금은 언제나 축에 나란하고, 한 점에서 갈릴 때는 **왼쪽부터**
    보면 안쪽을 잃지 않는다.

    돌려주는 고리는 화소 좌표계의 닫힌 다각형이며 바깥과 구멍이 섞여 있다 —
    `fill-rule="evenodd"`가 알아서 가른다.
    """
    h, w = mask.shape

    def solid(x, y):
        return 0 <= x < w and 0 <= y < h and mask[y, x]

    # 오른쪽이 안, 왼쪽이 밖이 되도록 걷는다. 방향은 (dx, dy).
    edges = set()
    for y in range(h):
        for x in range(w):
            if not solid(x, y):
                continue
            if not solid(x, y-1):
                edges.add(((x, y), (x+1, y)))          # 위쪽 금 — 오른쪽으로
            if not solid(x+1, y):
                edges.add(((x+1, y), (x+1, y+1)))      # 오른쪽 금 — 아래로
            if not solid(x, y+1):
                edges.add(((x+1, y+1), (x, y+1)))      # 아래쪽 금 — 왼쪽으로
            if not solid(x-1, y):
                edges.add(((x, y+1), (x, y)))          # 왼쪽 금 — 위로

    out_of = {}
    for a, b in edges:
        out_of.setdefault(a, []).append(b)

    loops = []
    while edges:
        a, b = next(iter(edges))
        loop = [a]
        cur = (a, b)
        while True:
            edges.discard(cur)
            loop.append(cur[1])
            nxts = [q for q in out_of.get(cur[1], ()) if (cur[1], q) in edges]
            if not nxts:
                break
            if len(nxts) > 1:
                # 갈릴 때는 왼쪽으로 — 안쪽을 잃지 않는다.
                dx, dy = cur[1][0]-cur[0][0], cur[1][1]-cur[0][1]
                left = (cur[1][0] - dy, cur[1][1] + dx)
                nxts.sort(key=lambda q: 0 if q == left else 1)
            cur = (cur[1], nxts[0])
            if cur[0] == a:
                break
        if len(loop) > 8:
            loops.append(loop)
    return loops


def simplify(pts, tol):
    """더글러스-퍼커. 곧은 변은 두 점으로 남는다."""
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0]-a[0], b[1]-a[1]
    den = (dx*dx + dy*dy) ** 0.5
    worst, at = 0.0, 0
    for i in range(1, len(pts)-1):
        p = pts[i]
        d = (abs(dy*p[0] - dx*p[1] + b[0]*a[1] - b[1]*a[0])/den) if den > 1e-9 else \
            ((p[0]-a[0])**2 + (p[1]-a[1])**2) ** 0.5
        if d > worst:
            worst, at = d, i
    if worst <= tol:
        return [a, b]
    return simplify(pts[:at+1], tol)[:-1] + simplify(pts[at:], tol)


def main():
    subprocess.run(['magick', SRC, '-depth', '8', f'RGBA:{TMP}/lc.rgba'], check=True)
    import json
    meta = subprocess.run(['magick', 'identify', '-format', '%w %h', SRC],
                          capture_output=True, text=True, check=True).stdout.split()
    w, h = int(meta[0]), int(meta[1])
    a = np.frombuffer(open(f'{TMP}/lc.rgba', 'rb').read(), dtype=np.uint8)
    alpha = a.reshape(h, w, 4)[..., 3].astype(np.float32)/255.0

    # 늘린 뒤 살짝 눅인다 — 계단이 그대로 남으면 윤곽이 톱니가 된다.
    big = np.repeat(np.repeat(alpha, UP, 0), UP, 1)
    k = UP//2
    pad = np.pad(big, k, mode='edge')
    acc = np.zeros_like(big)
    for dy in range(-k, k+1):
        for dx in range(-k, k+1):
            acc += pad[k+dy:k+dy+big.shape[0], k+dx:k+dx+big.shape[1]]
    big = acc/((2*k+1)**2)

    # ── 좌우를 맞춘다. 원래 도안은 대칭인데 JPEG와 확대가 한쪽을 기울여 놓았다.
    cols = big.sum(0)
    cx = float((np.arange(big.shape[1])*cols).sum()/max(cols.sum(), 1e-9))
    shift = int(round(big.shape[1]/2 - 0.5 - cx))
    if shift:
        big = np.roll(big, shift, axis=1)
    big = (big + big[:, ::-1])/2

    loops = crack_loops(big > 0.5)
    loops = [simplify(lp, TOL) for lp in loops]
    loops = [lp for lp in loops if len(lp) >= 3]
    print(f'고리 {len(loops)}개, 점 {sum(len(lp) for lp in loops)}개')

    sx = VIEW/(w*UP)
    vh = round(h*UP*sx, 2)
    paths = []
    for lp in loops:
        d = 'M ' + ' L '.join(f'{p[0]*sx:.2f} {p[1]*sx:.2f}' for p in lp) + ' Z'
        paths.append(d)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW} {vh}">'
           f'<path fill="currentColor" fill-rule="evenodd" d="{" ".join(paths)}"/></svg>')
    open(OUT, 'w').write(svg + '\n')
    print('담았다:', OUT, f'({len(svg)}바이트)')


if __name__ == '__main__':
    main()
