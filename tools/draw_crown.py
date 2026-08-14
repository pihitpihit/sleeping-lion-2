#!/usr/bin/env python3
"""레벨 왕관을 얼개로 그린다.

┌────────────────────────────────────────────────────────────────────────────┐
│ **윤곽을 따는 것으로는 안 된다 — 원본이 물결친다.**                          │
└────────────────────────────────────────────────────────────────────────────┘

팩의 왕관은 능력 카드 앞면에 37x23px로 박혀 있다(`extract_crown.py`). 그 윤곽을
그대로 따면 **확대와 JPEG가 만든 울퉁불퉁까지 벡터가 된다** — 실제 도안의 바깥은
매끈하다. 그래서 **얼개로 다시 짓고 자리만 원본에서 잰다.**

얼개(형님이 짚음):

* **아래**는 왕관이 둥근 통이라 아래로 볼록한 원호다.
* **옆면**은 위로 갈수록 바깥으로 더 휘는 곡선이다 — **S자가 아니다.** 손잡이를
  아래 모서리 바로 위에 세우면 아래는 세로로 서고 위에서만 휜다.
* **위**는 아래로 오목한 곡선 넷이다 — 바깥 둘은 짧고 가운데 둘은 길다.

홈 셋(갈매기 하나·눈 둘)은 잰 자리에 판다. `fill-rule="evenodd"`가 뚫어 준다.

    쓰는 법:  python3 tools/draw_crown.py
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = f'{ROOT}/public/assets/creator-pack/general/level-crown.svg'

# ── 원본을 잰 값. 상자는 152x104이며 가운데는 76이다.
W, H = 152.0, 104.0
CX = W/2

APEX_Y = 1          # 가운데 봉우리 꼭대기
TIP_DX, TIP_Y = 72, 27      # 어깨 끝
VALLEY_DX, VALLEY_Y = 47, 45  # 골 바닥 — 어깨 안쪽 선과 몸통 선이 만나는 자리
BODY_DX, BODY_Y = 68, 82    # 몸통 아래 모서리
BOTTOM_CTRL = 124   # 아래 원호의 손잡이. 가운데가 103까지 처진다
SIDE_K = 0.72       # 옆면이 휘기 시작하는 높이. 클수록 위에 몰린다
LONG_SAG, SHORT_SAG = 6, 3  # 위쪽 곡선 넷의 처짐 깊이

# 갈매기 홈 — 꼭대기 밑의 어두운 쐐기. 밑에서 몸통 끝이 솟아 둘로 갈린다.
HOLE_TOP = 7.5
HOLE_DX, HOLE_Y = 19.5, 31   # 아래로 벌어진 두 끝
BODYTIP_Y = 20               # 몸통이 홈 안으로 솟은 끝

# 어깨의 삼각 홈.
#
# ┌──────────────────────────────────────────────────────────────────────────┐
# │ **가운데 홈과 테 사이의 폭만큼 세 변에서 물려 짓는다.**                    │
# └──────────────────────────────────────────────────────────────────────────┘
#
# 어깨는 세 선이 두르는 삼각꼴이다 — 짧은 곡선(끝→골), 옆면, 그리고 **가운데
# 곡선을 골 너머로 늘인 선**.
#
# **두 변만 물린다.** 짧은 곡선과 옆면에서는 테와 같은 폭만큼 안으로 밀지만,
# **밑변은 늘인 곡선 위에 그대로 얹는다** — 형님이 짚은 자리다. 밑변까지 밀면
# 홈이 위로 들려 어깨가 두꺼워지고, 무엇보다 가운데 곡선과 한 결로 안 읽힌다.
MARGIN = 5.0        # 홈과 테 사이의 폭. 가운데 갈매기 홈과 같게 둔다
BASE_RUN = 26       # 골에서 밑변을 얼마나 늘일 것인가


def sag(a, b, amount):
    """두 점을 잇되 아래로 처지는 이차 곡선."""
    mx, my = (a[0]+b[0])/2, (a[1]+b[1])/2
    return f"Q {mx:.1f} {my + 2*amount:.1f} {b[0]:.1f} {b[1]:.1f}"


def side(frm, to):
    """옆면. 손잡이를 **아래 모서리 바로 위**에 세워 한 방향으로만 휘게 한다."""
    bottom = frm if frm[1] > to[1] else to
    tip = to if frm[1] > to[1] else frm
    cy = bottom[1] - (bottom[1]-tip[1])*SIDE_K
    return f"Q {bottom[0]:.1f} {cy:.1f} {to[0]:.1f} {to[1]:.1f}"


def outline():
    apex = (CX, APEX_Y)
    vr, vl = (CX+VALLEY_DX, VALLEY_Y), (CX-VALLEY_DX, VALLEY_Y)
    tr, tl = (CX+TIP_DX, TIP_Y), (CX-TIP_DX, TIP_Y)
    br, bl = (CX+BODY_DX, BODY_Y), (CX-BODY_DX, BODY_Y)
    return ' '.join([
        f"M {apex[0]:.1f} {apex[1]:.1f}",
        sag(apex, vr, LONG_SAG),
        sag(vr, tr, SHORT_SAG),
        side(tr, br),
        f"Q {CX:.1f} {BOTTOM_CTRL:.1f} {bl[0]:.1f} {bl[1]:.1f}",
        side(bl, tl),
        sag(tl, vl, SHORT_SAG),
        sag(vl, apex, LONG_SAG),
        'Z',
    ])


def chevron():
    """꼭대기 밑의 쐐기. 몸통 끝이 솟아 있어 갈매기 꼴이 된다."""
    return (f"M {CX:.1f} {HOLE_TOP:.1f} "
            f"L {CX+HOLE_DX:.1f} {HOLE_Y:.1f} "
            f"L {CX:.1f} {BODYTIP_Y:.1f} "
            f"L {CX-HOLE_DX:.1f} {HOLE_Y:.1f} Z")


def _offset(a, b, inside, m):
    """`a`→`b` 선을 `inside`가 있는 쪽으로 `m`만큼 민다."""
    dx, dy = b[0]-a[0], b[1]-a[1]
    n = (dx*dx + dy*dy) ** 0.5
    nx, ny = -dy/n, dx/n
    if (inside[0]-a[0])*nx + (inside[1]-a[1])*ny < 0:
        nx, ny = -nx, -ny
    return ((a[0]+nx*m, a[1]+ny*m), (b[0]+nx*m, b[1]+ny*m))


def _cross(l1, l2):
    """두 선이 만나는 점."""
    (x1, y1), (x2, y2) = l1
    (x3, y3), (x4, y4) = l2
    d = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4)
    a = x1*y2 - y1*x2
    b = x3*y4 - y3*x4
    return ((a*(x3-x4) - (x1-x2)*b)/d, (a*(y3-y4) - (y1-y2)*b)/d)


def eye(sign):
    """어깨의 삼각 홈. 세 변에서 같은 폭만큼 물려 짓는다."""
    def px(p):
        return (CX + sign*(CX - p[0]), p[1])

    tip = px((CX - TIP_DX, TIP_Y))
    val = px((CX - VALLEY_DX, VALLEY_Y))
    body = px((CX - BODY_DX, BODY_Y))
    apex = (CX, APEX_Y)

    # 가운데 곡선이 골에서 나아가던 방향 — 그대로 늘여 밑변을 삼는다.
    ctrl = px(((CX + (CX-VALLEY_DX))/2, (APEX_Y + VALLEY_Y)/2 + 2*LONG_SAG))
    dx, dy = val[0]-ctrl[0], val[1]-ctrl[1]
    n = (dx*dx + dy*dy) ** 0.5
    far = (val[0] + dx/n*BASE_RUN, val[1] + dy/n*BASE_RUN)

    inside = ((tip[0] + val[0] + far[0])/3, (tip[1] + val[1] + far[1])/3)
    upper = _offset(tip, val, inside, MARGIN)     # 짧은 곡선 쪽
    outer = _offset(tip, body, inside, MARGIN)    # 옆면 쪽
    base = (val, far)                             # 늘인 곡선 = 밑변. 밀지 않는다

    p1 = _cross(upper, outer)
    p2 = _cross(upper, base)
    p3 = _cross(outer, base)
    del apex
    return (f"M {p1[0]:.1f} {p1[1]:.1f} L {p2[0]:.1f} {p2[1]:.1f} "
            f"L {p3[0]:.1f} {p3[1]:.1f} Z")


def path():
    return ' '.join([outline(), chevron(), eye(-1), eye(1)])


def main():
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}">'
           f'<path fill="currentColor" fill-rule="evenodd" d="{path()}"/></svg>')
    open(OUT, 'w').write(svg + '\n')
    print('담았다:', OUT, f'({len(svg)}바이트)')


if __name__ == '__main__':
    main()
