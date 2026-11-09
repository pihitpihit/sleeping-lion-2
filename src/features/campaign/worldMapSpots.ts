import type { MapSpot, Scenario } from './scenarioNet'
import { stateOf, type StoredState } from './scenarioState'

/**
 * 세계 지도 — 어느 스티커를 어디에 붙이는가(`0051`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **닫힌 시나리오에는 아무것도 붙이지 않는다.**                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 실물 지도와 같다 — 해금하기 전에는 인쇄된 번호 동그라미만 있고 스티커는 그
 * 위에 붙는다. 열림·완료·막힘만 스티커가 서고, 완료와 막힘은 화면이 테두리로
 * 가른다.
 *
 * 그림 파일의 이름은 여기서만 짓는다 — 올리는 쪽(`MapUploader`)과 받는 쪽
 * (`WorldMap`)이 따로 지으면 언젠가 어긋난다. 순수 함수라 표로 못박는다.
 */

/** 지도 바탕 그림의 이름. */
export const MAP_FILE = 'map.webp'

/**
 * 시나리오 스티커 그림의 이름 — `gh-001.webp` 꼴. GHS의 이름에서 확장자만 바꿨다:
 * webp로 옮기니 지도는 1.4MB → 0.87MB, 스티커는 3분의 1이 되었다.
 */
export function stickerFile(no: number): string {
  return `gh-${String(no).padStart(3, '0')}.webp`
}

/** 올려도 되는 이름인가. 엉뚱한 파일이 버킷에 쌓이지 않게 한다. */
export function isMapFile(name: string): boolean {
  return name === MAP_FILE || /^gh-\d{3}\.webp$/.test(name)
}

export interface Sticker {
  readonly no: number
  readonly name: string
  readonly state: Exclude<ReturnType<typeof stateOf>, 'closed'>
  readonly spot: MapSpot
  /** 처음부터 열려 있는 시나리오(`0053`). 들어올 곳이 없어 화살표 대신 보랏빛으로 짚는다. */
  readonly initial: boolean
}

/** 지도에 붙일 스티커. 번호 차례 — 겹치면 뒤 번호가 위에 온다. */
export function stickersFor(
  list: readonly Scenario[],
  states: Record<number, StoredState>,
): Sticker[] {
  const out: Sticker[] = []
  for (const s of list) {
    const state = stateOf(states, s.no)
    if (state === 'closed' || !s.map) continue
    out.push({ no: s.no, name: s.name, state, spot: s.map, initial: s.initial === true })
  }
  return out.sort((a, b) => a.no - b.no)
}

/**
 * 픽셀 자리를 지도 크기에 대한 %로. **지도를 얼마나 키우든 같은 자리에 붙는다.**
 *
 * 지도 크기는 그림을 불러온 뒤 그림이 스스로 알려 준다(`naturalWidth`) — 수를
 * 코드에 적어 두면 그림을 갈아 끼울 때 어긋난다.
 */
export function placement(
  spot: MapSpot,
  mapW: number,
  mapH: number,
): { left: string; top: string; width: string; height: string } {
  const pct = (v: number, of: number) => `${(v / of) * 100}%`
  return {
    left: pct(spot.x, mapW),
    top: pct(spot.y, mapH),
    width: pct(spot.w, mapW),
    height: pct(spot.h, mapH),
  }
}

/** 지도를 키우는 단계. 1은 화면을 덮는 크기다 — 그 아래로는 손가락으로만 `fitZoom`까지 오므린다. */
export const ZOOMS = [1, 1.5, 2, 3, 4] as const

/**
 * 지도가 화면 안에 통째로 드는 배율 — 오므려 줄일 수 있는 바닥이다(형님이 정했다).
 *
 * 배율 1은 화면을 **덮는** 크기라 지도 한쪽이 늘 화면 밖에 있다. 통째로 보려면 그보다
 * 작아져야 하고, 그 값은 화면과 그림의 비에서 나온다 — 덮는 폭과 드는 폭의 비다.
 * 비가 같으면 1이다.
 */
export function fitZoom(view: { w: number; h: number }, map: { w: number; h: number }): number {
  const ratio = map.w / map.h
  const cover = Math.max(view.w, view.h * ratio)
  const contain = Math.min(view.w, view.h * ratio)
  return cover > 0 ? Math.min(1, contain / cover) : 1
}

/**
 * 손가락 둘로 벌리거나 오므린 만큼 바꾼다 — 위로는 마지막 단계, 아래로는 `min`(지도가
 * 통째로 드는 배율)을 안 넘는다.
 */
export function clampZoom(z: number, min: number = ZOOMS[0]): number {
  return Math.min(ZOOMS[ZOOMS.length - 1], Math.max(min, z))
}

/** 단추로 한 단계 키우거나 줄인다. 손가락으로 사이 값이 됐으면 가까운 다음 단계로. */
export function stepZoom(z: number, dir: 1 | -1): number {
  if (dir > 0) return ZOOMS.find((v) => v > z + 1e-6) ?? ZOOMS[ZOOMS.length - 1]
  return [...ZOOMS].reverse().find((v) => v < z - 1e-6) ?? ZOOMS[0]
}

/**
 * 두 스티커를 잇는 화살표의 길(SVG `d`). 지도 그림의 픽셀로 셈한다 — 화살표를 그리는
 * 판이 지도와 같은 `viewBox`라 키우든 줄이든 같은 자리에 선다.
 *
 * **휜 길이다.** 가는 쪽의 왼편으로 휜다 — 한 스티커에서 여럿이 나가거나 오가는 둘이
 * 있을 때 곧은 선은 한 줄로 포개진다. 오가는 둘은 서로 다른 쪽으로 휜다.
 *
 * **스티커 가장자리에서 끊되, 휜 방향으로 끊는다.** 양끝을 짧은 변의 절반만큼 물리는데
 * 곧은 선을 따라 물리면 **붙어 있는 두 스티커 사이에는 남는 길이 없다** — 그려 보니
 * 화살촉만 겹쳐 보였다. 끝에서의 접선(조절점 쪽)을 따라 물리고, 가까울수록 크게 휘게
 * 두면 붙은 둘 사이에도 위로 넘어가는 아치가 선다.
 */
export function arrowPath(from: MapSpot, to: MapSpot): string {
  const ax = from.x + from.w / 2
  const ay = from.y + from.h / 2
  const bx = to.x + to.w / 2
  const by = to.y + to.h / 2
  const dist = Math.hypot(bx - ax, by - ay)
  if (dist === 0) return ''
  const ux = (bx - ax) / dist
  const uy = (by - ay) / dist
  const r1 = Math.min(from.w, from.h) / 2
  const r2 = Math.min(to.w, to.h) / 2
  // 멀면 길이의 12%, 가까우면 두 반지름을 합친 것보다 더 — 아치가 스티커를 넘어가게.
  const bend = Math.max(dist * 0.12, (r1 + r2) * 1.2)
  const cx = (ax + bx) / 2 + uy * bend
  const cy = (ay + by) / 2 - ux * bend
  const toward = (px: number, py: number, r: number) => {
    const d = Math.hypot(cx - px, cy - py)
    return [px + ((cx - px) / d) * r, py + ((cy - py) / d) * r]
  }
  const [sx, sy] = toward(ax, ay, r1)
  const [ex, ey] = toward(bx, by, r2)
  const f = (v: number) => Math.round(v * 10) / 10
  return `M${f(sx)} ${f(sy)}Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}`
}
