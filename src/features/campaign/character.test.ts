import { describe, expect, it } from 'vitest'
import {
  CHECKMARKS_PER_PERK,
  CLASS_ICON_COUNT,
  MAX_CHECKMARKS,
  MAX_LEVEL,
  XP_THRESHOLDS,
  clampCheckmarks,
  clampGold,
  clampLevel,
  clampXp,
  hasClassIcon,
  levelForXp,
  levelUpReady,
  normalizePerks,
  perkSlotCount,
  perksEarned,
  perksFromCheckmarks,
  togglePerk,
  xpToNextLevel,
} from './character'

/**
 * 캐릭터 시트의 산술.
 *
 * 눈금은 실물 캐릭터 시트에서 읽었다 — Creator Pack의 `Character Sheet.pdf`를
 * 150dpi로 뽑아 눈으로 확인했다. 레벨 1~9와 그 아래의 0/45/95/…/500, 체크마크
 * 상자 세 개짜리 여섯 묶음이 종이에 인쇄된 그대로다.
 */

describe('레벨과 경험', () => {
  it('눈금이 실물 시트와 같다', () => {
    expect(XP_THRESHOLDS).toEqual([0, 45, 95, 150, 210, 275, 345, 420, 500])
    expect(XP_THRESHOLDS).toHaveLength(MAX_LEVEL)
  })

  it('각 눈금에 정확히 닿으면 그 레벨이다', () => {
    XP_THRESHOLDS.forEach((threshold, index) => {
      expect(levelForXp(threshold)).toBe(index + 1)
    })
  })

  it('눈금 바로 아래는 앞 레벨이다', () => {
    expect(levelForXp(44)).toBe(1)
    expect(levelForXp(45)).toBe(2)
    expect(levelForXp(94)).toBe(2)
    expect(levelForXp(499)).toBe(8)
    expect(levelForXp(500)).toBe(9)
  })

  it('마지막 눈금 위로는 더 오르지 않는다', () => {
    expect(levelForXp(500)).toBe(MAX_LEVEL)
    expect(levelForXp(99999)).toBe(MAX_LEVEL)
  })

  it('경험이 0이거나 이상한 값이면 1레벨이다', () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(-50)).toBe(1)
    expect(levelForXp(Number.NaN)).toBe(1)
  })

  it('다음 눈금까지 남은 경험을 센다', () => {
    expect(xpToNextLevel(0)).toBe(45)
    expect(xpToNextLevel(44)).toBe(1)
    expect(xpToNextLevel(45)).toBe(50)
    expect(xpToNextLevel(499)).toBe(1)
  })

  it('끝에 닿으면 남은 것이 없다', () => {
    expect(xpToNextLevel(500)).toBeNull()
    expect(xpToNextLevel(900)).toBeNull()
  })

  it('레벨을 1~9로 가둔다', () => {
    expect(clampLevel(0)).toBe(1)
    expect(clampLevel(-3)).toBe(1)
    expect(clampLevel(5)).toBe(5)
    expect(clampLevel(12)).toBe(MAX_LEVEL)
    expect(clampLevel(3.7)).toBe(3)
    expect(clampLevel(Number.NaN)).toBe(1)
  })

  it('적어둔 레벨이 뒤처졌을 때만 올릴 때가 되었다고 한다', () => {
    expect(levelUpReady(1, 44)).toBe(false)
    expect(levelUpReady(1, 45)).toBe(true)
    // 경험이 아직 안 찼는데 레벨을 손으로 올려둔 경우 — 재촉하지 않는다.
    expect(levelUpReady(4, 45)).toBe(false)
    expect(levelUpReady(MAX_LEVEL, 9999)).toBe(false)
  })
})

describe('체크마크와 퍽', () => {
  it('셋마다 하나다', () => {
    expect(CHECKMARKS_PER_PERK).toBe(3)
    expect(perksFromCheckmarks(0)).toBe(0)
    expect(perksFromCheckmarks(2)).toBe(0)
    expect(perksFromCheckmarks(3)).toBe(1)
    expect(perksFromCheckmarks(5)).toBe(1)
    expect(perksFromCheckmarks(18)).toBe(6)
  })

  it('상자가 열여덟이라 그 위로는 세지 않는다', () => {
    expect(MAX_CHECKMARKS).toBe(18)
    expect(clampCheckmarks(25)).toBe(18)
    expect(clampCheckmarks(-1)).toBe(0)
    expect(perksFromCheckmarks(99)).toBe(6)
  })

  it('얻은 퍽은 레벨과 체크마크에서 함께 나온다', () => {
    // 1레벨·체크 없음 — 아직 하나도 없다.
    expect(perksEarned(1, 0)).toBe(0)
    // 레벨이 오를 때마다 하나(2레벨부터).
    expect(perksEarned(2, 0)).toBe(1)
    expect(perksEarned(9, 0)).toBe(8)
    // 둘이 겹치면 더한다.
    expect(perksEarned(3, 6)).toBe(2 + 2)
  })

  it('슬롯은 얻은 수보다 넉넉하다 — 클래스별 퍽 표를 우리가 갖고 있지 않다', () => {
    expect(perkSlotCount(1, 0)).toBeGreaterThanOrEqual(perksEarned(1, 0))
    expect(perkSlotCount(9, 18)).toBeGreaterThan(perksEarned(9, 18))
  })

  it('슬롯 번호를 오름차순으로 정리하고 중복·음수를 걸러낸다', () => {
    expect(normalizePerks([3, 1, 1, 2])).toEqual([1, 2, 3])
    expect(normalizePerks([-1, 0, 2])).toEqual([0, 2])
    expect(normalizePerks([1.9, 1])).toEqual([1])
    expect(normalizePerks([Number.NaN, 4])).toEqual([4])
  })

  it('슬롯을 켜고 끈다', () => {
    expect(togglePerk([], 2)).toEqual([2])
    expect(togglePerk([1, 2, 3], 2)).toEqual([1, 3])
    expect(togglePerk([3, 1], 2)).toEqual([1, 2, 3])
  })
})

describe('클래스 아이콘', () => {
  it('스물하나다 — 글룸헤이븐 17 + 사자의 턱 4', () => {
    expect(CLASS_ICON_COUNT).toBe(21)
  })

  it('0은 아직 안 고른 것이다', () => {
    expect(hasClassIcon(0)).toBe(false)
    expect(hasClassIcon(1)).toBe(true)
    expect(hasClassIcon(21)).toBe(true)
    expect(hasClassIcon(22)).toBe(false)
    expect(hasClassIcon(-1)).toBe(false)
    expect(hasClassIcon(1.5)).toBe(false)
  })
})

describe('가두기', () => {
  it('골드와 경험을 화면에 담기는 자릿수 안에 둔다', () => {
    expect(clampGold(-5)).toBe(0)
    expect(clampGold(12345)).toBe(9999)
    expect(clampGold(120.9)).toBe(120)
    expect(clampXp(-5)).toBe(0)
    expect(clampXp(5000)).toBe(999)
  })
})
