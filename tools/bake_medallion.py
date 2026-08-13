#!/usr/bin/env python3
"""팩에 메달이 없는 값(+3·+4)을 구워 낸다.

┌────────────────────────────────────────────────────────────────────────────┐
│ **팩 원본이 있어야 돈다. 레포에는 결과물만 들어간다.**                       │
└────────────────────────────────────────────────────────────────────────────┘

실물 표준 덱에 있는 일곱(`x0`·`m2`·`m1`·`p0`·`p1`·`p2`·`x2`)만 Creator Pack에
있고, 특혜로만 나오는 `+3`·`+4`는 없다. 그렇다고 글자로 흘리면 그 줄만 그림이
빠져 어긋나 보이므로(구현 결정 322) 팩의 초록 원반을 빌려 숫자를 얹는다.

**두 단계다.**

1. 팩 `+1`의 원반에서 숫자와 그 그림자를 지운다. 가려진 자리는 `+2`·`−1`·`−2`
   원반에서 색 변환해 옮겨 오고, 넷 다 가린 데만 확산으로 메운다.
2. 그 위에 Pirata One으로 값을 얹는다. 자리·크기·테·그림자·잉크 밝기는 모두
   팩 메달 넷을 화소 단위로 재서 얻은 값이다(아래 상수).

**획 가운데가 각지게 솟는다.** 높이를 가장자리로부터의 거리에 곧게 비례시키면
기울기가 어디서나 같아 옆면이 평평한 면으로 서고, 획 한가운데에서 두 면이 만나며
각이 선다 — 자르면(`min(d, cap)`) 꼭대기가 평평한 지붕이 되어 칼등이 안 나온다.

**팩 원본은 필요 없다.** 레포에 이미 200x200으로 담아 둔 메달 넷을 원료로 쓴다 —
그것들이 이미 팩에서 뽑은 것이라(ATTRIBUTION) 한 번 더 거칠 까닭이 없고, 이 길로
두면 팩이 손에 없어도 다시 구울 수 있다.

    쓰는 법:  python3 tools/bake_medallion.py

    필요한 것: rsvg-convert, ImageMagick, fontTools, numpy
"""
import os, subprocess, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bakelib import TMP, dilate, edt, gauss, rgba_of
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = f'{ROOT}/public/assets/creator-pack/attack-modifiers'
FONT = f'{ROOT}/src/assets/fonts/pirata-one-latin.woff2'
N, SS = 200, 4

# ── 팩 메달 넷(+1·+2·−1·−2)을 재서 얻은 값. 모두 원반 지름에 대한 비율이다.
SIGN_W    = {'+': 58/200, '−': 51/200, '×': 51/200}
SIGN_MID  = 102.5/200   # 기호 잉크의 세로 가운데
DIGIT_MID =  99.75/200  # 숫자는 기호보다 3px 위다
DIGIT_H   = 124.5/200
GAP       =   5/200
BLOCK_CX  =  87.1/200   # 덩어리 가로 가운데 — **원반 가운데보다 12px 왼쪽**
OUTLINE_W = 3.0         # 짙은 테가 글자 밖으로 나가는 두께
SHADOW_SIG, SHADOW_OP = 2.6, 1.0
DARK = np.array([11.0, 13.0, 6.0])

# ── 잉크의 두께감. 형님이 후보를 보고 고른 값이다(2026-08-13).
SLOPE = 0.9        # 능선 기울기. 클수록 옆면이 어두워 능선이 도드라진다
AZIM  = 135        # 빛 방향(도). 왼위 — 가로획과 세로획이 둘 다 갈린다
TILT  = 0.28
INK_LO, INK_HI = 140, 252
SPEC, SPEC_EXP = 0.7, 90   # 능선에 얹히는 밝은 선. 좁을수록 날이 선다

_ttf = f'{TMP}/pirata.ttf'
if not os.path.exists(_ttf):
    f = TTFont(FONT); f.flavor = None; f.save(_ttf)
_f = TTFont(_ttf); _gs = _f.getGlyphSet(); _cm = _f.getBestCmap()


def glyph(ch):
    g = _cm[ord(ch)]
    p = SVGPathPen(_gs); _gs[g].draw(p)
    b = BoundsPen(_gs); _gs[g].draw(b)
    return p.getCommands(), (b.bounds or (0, 0, 0, 0))


def paths(label, d):
    sign, digits = label[0], label[1:]
    sc, (x0, y0, x1, y1) = glyph(sign)
    ss = SIGN_W[sign]*d/(x1-x0); sw = (x1-x0)*ss
    _, (_, g0, _, g1) = glyph('3'); ds = DIGIT_H*d/(g1-g0)
    ps, dw = [], 0
    for ch in digits:
        c, b = glyph(ch); ps.append((c, b)); dw += (b[2]-b[0])*ds
    dw += GAP*d*(len(digits)-1)
    x = BLOCK_CX*d - (sw+GAP*d+dw)/2
    out = [f'<path d="{sc}" transform="translate({x-x0*ss},{SIGN_MID*d+(y0+y1)/2*ss}) scale({ss},{-ss})"/>']
    x += sw+GAP*d
    for c, (a0, b0, a1, b1) in ps:
        out.append(f'<path d="{c}" transform="translate({x-a0*ds},{DIGIT_MID*d+(b0+b1)/2*ds}) scale({ds},{-ds})"/>')
        x += (a1-a0)*ds+GAP*d
    return ''.join(out)


def mask_of(label, n):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{n}" height="{n}" viewBox="0 0 {n} {n}">'
           f'<rect width="{n}" height="{n}" fill="#000"/><g fill="#fff">{paths(label, n)}</g></svg>')
    open(f'{TMP}/m.svg', 'w').write(svg)
    subprocess.run(['rsvg-convert', '-o', f'{TMP}/m.png', f'{TMP}/m.svg'], check=True)
    return rgba_of(f'{TMP}/m.png', n)[..., 0]/255.0


def blank_disc():
    """팩 `+1`의 원반에서 숫자와 그 그림자를 지운다."""
    yy, xx = np.mgrid[0:N, 0:N]; c = (N-1)/2
    R = np.hypot(xx-c, yy-c)

    def load(v):
        a = rgba_of(f'{OUT}/{v}.webp', N)
        return a[..., :3].copy(), a[..., 3]

    def hidden(rgb):
        mx, mn = rgb.max(2), rgb.min(2)
        ink = (mx > 190) & ((mx-mn) < 24) & (R < N*0.40)
        dark = (rgb.max(2) < 110) & (R < N*0.40)
        return dilate((ink | dark).astype(np.float32), 5) > 0.5

    g1, al = load('p1'); g2, _ = load('p2')
    r1, _ = load('m1'); r2, _ = load('m2')
    H = {'p1': hidden(g1), 'p2': hidden(g2), 'm1': hidden(r1), 'm2': hidden(r2)}
    inner = (R < N*0.455) & (al > 200)

    def fit(src, dst, mask):
        """빨간 원반 → 초록 원반 색 변환. 함께 보이는 자리에서 배운다."""
        A = np.concatenate([src[mask], np.ones((int(mask.sum()), 1))], 1)
        M, *_ = np.linalg.lstsq(A, dst[mask], rcond=None)
        flat = np.concatenate([src.reshape(-1, 3), np.ones((N*N, 1))], 1)
        return (flat @ M).reshape(N, N, 3)

    out = g1.copy(); filled = (~H['p1']) & inner
    for donor, img in (('p2', g2), ('m1', r1), ('m2', r2)):
        conv = fit(img, g1, (~H['p1']) & (~H[donor]) & inner)
        take = inner & (~filled) & (~H[donor])
        out[take] = conv[take]; filled |= take
    hole = inner & ~filled
    if hole.any():
        out[hole] = out[filled].mean(0)
        for k, steps in ((3, 150), (1, 120)):
            for _ in range(steps):
                out = np.where(hole[..., None], gauss(out, k), out)
    seam = dilate(H['p1'].astype(np.float32), 2) > 0.5
    out = np.where((seam & ~H['p1'])[..., None], gauss(out, 1), out)
    return np.dstack([np.clip(out, 0, 255), al]).astype(np.uint8)


def bake(label, blank):
    import math
    m = mask_of(label, N*SS)
    dist = edt(m)
    gy, gx = np.gradient(dist*SLOPE)
    a = math.radians(AZIM)
    lx, ly, lz = math.cos(a)*TILT, math.sin(a)*TILT, 1.0
    ln = np.hypot(np.hypot(gx, gy), 1.0); ll = math.sqrt(lx*lx+ly*ly+lz*lz)
    lam = np.clip((-gx*lx - gy*ly + lz)/(ln*ll), 0, 1)
    shade = np.clip(INK_LO + (INK_HI-INK_LO)*lam + lam**SPEC_EXP*SPEC*255, 0, 255)

    outline = dilate(m, OUTLINE_W*SS)
    shadow = gauss(outline, SHADOW_SIG*SS)*SHADOW_OP

    def down(x):
        return x.reshape(N, SS, N, SS).mean((1, 3))

    ink_a, out_a, sh_a = down(m), down(outline), down(shadow)
    ink_c = down(shade*m)/np.maximum(ink_a, 1e-6)
    px = blank[..., :3].astype(np.float32).copy()
    px = px*(1-sh_a[..., None]) + DARK*sh_a[..., None]
    px = px*(1-out_a[..., None]) + DARK*out_a[..., None]
    px = px*(1-ink_a[..., None]) + ink_c[..., None]*ink_a[..., None]
    return np.dstack([np.clip(px, 0, 255), blank[..., 3]]).astype(np.uint8)


def main():
    blank = blank_disc()
    for label, name in (('+3', 'p3'), ('+4', 'p4')):
        img = bake(label, blank)
        open(f'{TMP}/{name}.rgba', 'wb').write(img.tobytes())
        subprocess.run(['magick', '-depth', '8', '-size', f'{N}x{N}',
                        f'RGBA:{TMP}/{name}.rgba', '-quality', '92', f'{OUT}/{name}.webp'], check=True)
        print('구웠다:', f'{OUT}/{name}.webp')


if __name__ == '__main__':
    main()
