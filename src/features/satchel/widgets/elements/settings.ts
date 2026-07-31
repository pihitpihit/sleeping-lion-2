import { ELEMENTS, type ElementDef } from './elements'

/**
 * 원소 트래커의 인스턴스별 설정.
 *
 * **사용자 설정이다** — `localStorage`에 남는다(SPEC 5.2). 원소의 켜짐/꺼짐
 * 상태(도구 런타임)와는 다른 것이다.
 */
export interface ElementSettings {
  /** 켜져 있으면 여섯을 다 보인다. 아래 `visible`은 무시된다. */
  showAll: boolean
  /** 원소별 표시 여부. `showAll`이 꺼졌을 때만 쓰인다. */
  visible: Record<string, boolean>
}

export function defaultElementSettings(): ElementSettings {
  return {
    showAll: true,
    visible: Object.fromEntries(ELEMENTS.map((e) => [e.id, true])),
  }
}

/**
 * 저장된 값에서 쓸 수 있는 설정을 건져낸다.
 *
 * 없거나 망가졌거나 원소 목록이 바뀐 뒤여도 반드시 유효한 값을 낸다 —
 * 위젯이 안심하고 자기 타입으로 받을 수 있어야 한다.
 */
export function sanitizeElementSettings(raw: unknown): ElementSettings {
  const fallback = defaultElementSettings()
  if (typeof raw !== 'object' || raw === null) return fallback

  const value = raw as Partial<ElementSettings>
  const showAll = typeof value.showAll === 'boolean' ? value.showAll : true

  const visible = { ...fallback.visible }
  if (typeof value.visible === 'object' && value.visible !== null) {
    for (const element of ELEMENTS) {
      const flag = (value.visible as Record<string, unknown>)[element.id]
      if (typeof flag === 'boolean') visible[element.id] = flag
    }
  }

  // 하나도 안 켜진 상태는 만들지 않는다. 원소 없는 트래커는 쓸모가 없고
  // 크기 제약도 0이 되어 의미를 잃는다.
  if (!showAll && !ELEMENTS.some((e) => visible[e.id])) return fallback

  return { showAll, visible }
}

/** 이 설정에서 실제로 그릴 원소들. */
export function visibleElements(settings: ElementSettings): readonly ElementDef[] {
  if (settings.showAll) return ELEMENTS
  return ELEMENTS.filter((element) => settings.visible[element.id])
}

/** 켜진 원소 수. 크기 제약의 기준이 된다. */
export function visibleCount(settings: ElementSettings): number {
  return visibleElements(settings).length
}
