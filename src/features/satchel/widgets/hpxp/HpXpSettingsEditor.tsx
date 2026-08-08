import { CharacterPicker } from '../CharacterPicker'
import type { WidgetSettingsEditorProps } from '../types'
import { sanitizeHpXpSettings } from './settings'

/** HP/XP 트래커 설정 — 누구의 다이얼인지 고르는 것 하나뿐이다. */
export function HpXpSettingsEditor({ value, onChange }: WidgetSettingsEditorProps) {
  const settings = sanitizeHpXpSettings(value)
  return (
    <CharacterPicker
      value={settings.characterId}
      onChange={(characterId) => onChange({ ...settings, characterId })}
    />
  )
}
