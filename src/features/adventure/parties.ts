/**
 * 내 캐릭터가 든 파티들 — **한 번씩만.**
 *
 * 한 파티에 캐릭터를 둘 세울 수 있으므로 그대로 늘어놓으면 같은 파티가 두 줄
 * 나온다. 은퇴한 캐릭터는 세지 않는다.
 */
export function dedupeParties(
  characters: readonly { partyId: string | null; partyName: string | null; retired: boolean }[],
): { id: string; name: string }[] {
  const seen = new Map<string, string>()
  for (const c of characters) {
    if (c.retired || c.partyId === null) continue
    if (!seen.has(c.partyId)) seen.set(c.partyId, c.partyName || '이름 없는 파티')
  }
  return [...seen].map(([id, name]) => ({ id, name }))
}
