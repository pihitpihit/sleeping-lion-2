"""구울 때 함께 쓰는 연장.

`bake_medallion.py`(값 메달)와 `bake_xp_star.py`(경험 표식)가 나눠 쓴다 — 같은
일을 하는 것을 두 벌 두면 언젠가 어긋난다.

**거리 변환이 알맹이다.** 덮개 안쪽에서 가장자리까지의 거리를 높이로 삼으면
기울기가 어디서나 같아 옆면이 평평한 면으로 서고, 한가운데에서 두 면이 만나며
각이 선다 — 칼등 능선이다. 자르면(`min(d, cap)`) 꼭대기가 평평한 지붕이 된다.
"""
import os, subprocess
import numpy as np

TMP = '/tmp/_bake'
os.makedirs(TMP, exist_ok=True)


def rgba_of(path, n):
    """그림 하나를 RGBA 원시값으로 읽는다."""
    subprocess.run(['magick', path, '-depth', '8', f'RGBA:{TMP}/x.rgba'], check=True)
    raw = np.frombuffer(open(f'{TMP}/x.rgba', 'rb').read(), dtype=np.uint8)
    return raw.reshape(n, n, 4).astype(np.float32)


def boxblur(a, k):
    """한 겹이든 세 겹(RGB)이든 같은 함수로 눅인다."""
    if a.ndim == 3:
        return np.dstack([boxblur(a[..., i], k) for i in range(a.shape[2])])
    p = np.pad(a, k, mode='edge')
    c = np.pad(np.cumsum(np.cumsum(p, 0), 1), ((1, 0), (1, 0)))
    n = a.shape[0]; s = 2*k+1
    return (c[s:s+n, s:s+n]-c[0:n, s:s+n]-c[s:s+n, 0:n]+c[0:n, 0:n])/(s*s)


def gauss(a, sigma):
    k = max(1, int(round(sigma*0.9)))
    for _ in range(3):
        a = boxblur(a, k)
    return a


def edt(mask, iters=64):
    """덮개 안쪽에서 가장자리까지의 거리. 이웃의 최솟값 + 한 걸음을 되풀이한다."""
    d = np.where(mask > 0.5, 1e6, 0.0)
    a, b = 1.0, 1.41421356
    for _ in range(iters):
        n = d
        nd = np.minimum(d, np.stack([
            np.roll(n, 1, 0)+a, np.roll(n, -1, 0)+a, np.roll(n, 1, 1)+a, np.roll(n, -1, 1)+a,
            np.roll(np.roll(n, 1, 0), 1, 1)+b, np.roll(np.roll(n, 1, 0), -1, 1)+b,
            np.roll(np.roll(n, -1, 0), 1, 1)+b, np.roll(np.roll(n, -1, 0), -1, 1)+b,
        ]).min(0))
        if np.array_equal(nd, d):
            break
        d = nd
    return np.where(mask > 0.5, d, 0.0)


def dilate(a, k):
    for _ in range(int(k)):
        a = np.maximum.reduce([a, np.roll(a, 1, 0), np.roll(a, -1, 0), np.roll(a, 1, 1), np.roll(a, -1, 1)])
    return a
