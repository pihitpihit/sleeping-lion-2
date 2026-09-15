import { CharacterPicker } from '../CharacterPicker'
import { useCharacterStats } from '../../perkSource'
import { slotKeyFor } from '../../roster'
import type { WidgetSettingsEditorProps } from '../types'
import { useHpXpStore } from './hpxpStore'
import { sanitizeHpXpSettings } from './settings'

/**
 * HP/XP 트래커 설정 — 누구의 다이얼인지 고른다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **고른 캐릭터의 최대 체력을 적고, 그 값으로 다이얼을 세울 수 있게 한다.** │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 판을 펼 때 하는 첫 일이 「내 체력 몇이더라」를 시트에서 찾아 다이얼을 그만큼
 * 올리는 것이다 — 9레벨이면 스물몇 번을 누른다. 클래스 표에 이미 있는 값이므로
 * 단추 하나로 끝낸다.
 *
 * **레벨은 경험치에서 뽑는다**(구현 결정 225). 모르면 적지 않는다 — 클래스를
 * 안 골랐거나 그 클래스의 체력표가 아직 안 들어왔을 때다(구현 결정 115).
 *
 * `instanceId`를 받는 까닭이 이것이다(구현 결정 149) — 설정을 읽고 쓰는 데는
 * 필요 없지만 **위젯이 담고 있는 런타임 값에 손대야** 한다.
 */
export function HpXpSettingsEditor({ value, onChange, instanceId }: WidgetSettingsEditorProps) {
  const settings = sanitizeHpXpSettings(value)
  const stats = useCharacterStats()
  const setTrack = useHpXpStore((s) => s.setTrack)

  return (
    <CharacterPicker
      value={settings.characterId}
      onChange={(characterId) => onChange({ ...settings, characterId })}
      detailOf={(id) => {
        const stat = stats.get(id)
        if (stat === undefined) return null
        /*
          **레벨을 함께 적는다**(형님이 정했다). 같은 이름이 둘 있을 수 있고
          (구현 결정 326) 무엇보다 **최대 체력이 레벨에서 나온 값**이라, 레벨이
          없으면 그 수가 어디서 왔는지 알 수 없다.
        */
        return (
          <>
            <span className="charpick__lv">
              Lv <b className="sl-numeral">{stat.level}</b>
            </span>
            {stat.maxHp !== null && (
              <span>
                최대 <b className="sl-numeral">{stat.maxHp}</b>
              </span>
            )}
          </>
        )
      }}
      actionOf={(id) => {
        /*
          **아직 놓이지 않은 위젯에는 담을 자리가 없다**(`instanceId`가 `null`).
          놓기 전에 묻는 팝업이 그렇다 — 그때는 되돌릴 판도 없다.
        */
        if (instanceId === null) return null
        const hp = stats.get(id)?.maxHp ?? null
        return (
          <button
            type="button"
            className="charpick__action"
            disabled={hp === null}
            aria-label={
              hp === null
                ? '최대 체력을 모른다. 클래스와 체력표가 있어야 한다.'
                : `체력을 최대 ${hp}으로 되돌린다`
            }
            onClick={() => {
              if (hp === null) return
              setTrack(slotKeyFor(id, instanceId), 'hp', hp)
            }}
          >
            {hp === null ? '체력 모름' : '체력 채우기'}
          </button>
        )
      }}
    />
  )
}
