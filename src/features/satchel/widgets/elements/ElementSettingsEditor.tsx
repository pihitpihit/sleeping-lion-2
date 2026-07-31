import { Switch } from '../../ui/Switch'
import type { WidgetSettingsEditorProps } from '../types'
import { ELEMENTS } from './elements'
import { sanitizeElementSettings, visibleCount, type ElementSettings } from './settings'

/**
 * 원소 트래커 설정 화면.
 *
 * 맨 위가 "모든 원소 표시"이고, 켜져 있으면 아래 여섯은 잠긴다 — 지금 개별
 * 선택이 무의미하다는 것을 잠금과 흑백 아이콘으로 함께 보여준다.
 */
export function ElementSettingsEditor({ value, onChange }: WidgetSettingsEditorProps) {
  const settings = sanitizeElementSettings(value)

  function update(next: ElementSettings) {
    onChange(next)
  }

  function toggleElement(id: string, next: boolean) {
    const visible = { ...settings.visible, [id]: next }
    // 마지막 하나는 끌 수 없다. 원소가 없는 트래커는 쓸모가 없고 크기 제약도
    // 0이 되어 의미를 잃는다.
    if (!ELEMENTS.some((e) => visible[e.id])) return
    update({ ...settings, visible })
  }

  const count = visibleCount(settings)
  const iconUrl = (file: string) =>
    `${import.meta.env.BASE_URL}assets/creator-pack/elements/${file}.svg`

  return (
    <div className="element-settings">
      <Switch
        checked={settings.showAll}
        label="모든 원소 표시"
        onChange={(next) => update({ ...settings, showAll: next })}
      />

      <hr className="element-settings__rule" />

      <ul className="element-settings__list">
        {ELEMENTS.map((element) => (
          <li key={element.id}>
            <Switch
              checked={settings.showAll || settings.visible[element.id]}
              disabled={settings.showAll}
              label={element.name}
              iconUrl={iconUrl(element.file)}
              onChange={(next) => toggleElement(element.id, next)}
            />
          </li>
        ))}
      </ul>

      <p className="element-settings__hint">
        {settings.showAll
          ? '여섯 원소를 모두 보인다. 골라 보려면 위 스위치를 끈다.'
          : `${count}개를 보인다. 가로 또는 세로가 ${count}칸 이상이어야 한다.`}
      </p>
    </div>
  )
}
