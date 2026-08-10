import { CharacterPicker } from '../CharacterPicker'
import type { WidgetSettingsEditorProps } from '../types'
import { sanitizeGoldSettings } from './settings'

/** 골드 카운터 설정 — 누구의 것인지 고르는 것 하나뿐이다. */
export function GoldSettingsEditor({ value, onChange }: WidgetSettingsEditorProps) {
  const settings = sanitizeGoldSettings(value)
  return (
    <CharacterPicker
      value={settings.characterId}
      onChange={(characterId) => onChange({ ...settings, characterId })}
    />
  )
}
