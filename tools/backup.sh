#!/usr/bin/env bash
# ============================================================================
# 게임 데이터를 이 기계로 떠 둔다
# ----------------------------------------------------------------------------
# ┌──────────────────────────────────────────────────────────────────────────┐
# │ **뜬 것은 레포 바깥에 둔다 — 레포가 공개이기 때문이다.**                  │
# └──────────────────────────────────────────────────────────────────────────┘
#
# 클래스 수치·특혜 글·개봉 조건·상점 목록·업적은 절대 원칙 1 때문에 **DB에만**
# 있다. 레포에도 마이그레이션에도 값이 없으므로 프로젝트가 날아가면 그 표들은
# 손으로 다시 다 넣어야 한다 — 2026-09-04에 잠든 것을 보고 붙였다.
#
# 뜬 파일은 `~/.config/sleeping-lion-2/backups/`로 간다. **레포 안에 두지
# 않는다**: `.gitignore`는 실수 한 번을 막아 줄 뿐이고, 여기 담기는 것은
# 커밋되는 순간 공개 배포가 되는 종류다.
#
# **GitHub Actions로 돌리지 않는다.** 그 길에는 둘 곳이 없다 — 아티팩트는 공개
# 레포에서 누구나 받을 수 있고, 레포에 커밋하는 것은 말할 것도 없다. 이것은
# 손으로(또는 이 기계의 예약으로) 도는 스크립트다.
#
#   ./tools/backup.sh
#
# ── 무엇을 뜨는가
#
# `public` 스키마의 **값만** 뜬다. 표와 정책은 마이그레이션이 이미 들고 있으므로
# 되살릴 때는 `db push` 뒤에 이 값을 부으면 된다.
#
# 판이 도는 동안의 휘발성 표는 뺀다(`battle_state`·`satchel_runtime`·`battles`
# 계열) — SPEC 5.2가 「판이 끝나면 어디에도 남지 않는다」고 못박은 것들이라
# 백업에 남으면 그 약속이 깨진다.
#
# 계정은 `auth.users`에 있고 그쪽은 **되는 대로** 뜬다. 없어도 이 백업은 쓸모가
# 있고(게임 데이터가 알맹이다), 있으면 되살릴 때 `owner_id`가 가리키는 사람을
# 다시 세울 수 있다.
# ============================================================================
set -euo pipefail

URL_FILE=~/.config/sleeping-lion-2/db-url
OUT_ROOT=~/.config/sleeping-lion-2/backups
KEEP=14

# libpq는 brew가 keg-only로 깔아 PATH에 안 올라온다.
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

if [ ! -f "$URL_FILE" ]; then
  echo "접속 문자열이 없다: $URL_FILE" >&2
  exit 1
fi
command -v pg_dump >/dev/null || { echo "pg_dump이 없다. brew install libpq" >&2; exit 1; }

# **값을 화면에 찍지 않는다.** RLS를 통째로 우회하는 자격증명이다.
URL=$(cat "$URL_FILE")

stamp=$(date -u '+%Y%m%d-%H%M')
dir="$OUT_ROOT/$stamp"
mkdir -p "$dir"
chmod 700 "$OUT_ROOT" "$dir"

echo "뜨는 중… → $dir"

# 판이 끝나면 남지 않아야 하는 것들. 여기 빠뜨리면 백업이 그 약속을 깬다.
EPHEMERAL=(battle_state satchel_runtime battles battle_characters battle_participants)
excludes=()
for t in "${EPHEMERAL[@]}"; do excludes+=(--exclude-table-data="public.$t"); done

# ── 알맹이. 이것이 실패하면 백업이 아니다.
if ! pg_dump "$URL" \
  --data-only --schema=public --no-owner --no-privileges \
  "${excludes[@]}" 2>"$dir/pg_dump.log" | gzip -9 >"$dir/public.sql.gz"
then
  # **못 뜬 자리를 남기지 않는다** — 반쯤 뜬 폴더가 쌓이면 어느 것이 성한지
  # 알 수 없다. 까닭만 한 곳에 남긴다(예약으로 돌 때는 화면이 없다).
  sed -n '1,10p' "$dir/pg_dump.log" >&2
  mv "$dir/pg_dump.log" "$OUT_ROOT/last-failure.log"
  rm -rf "$dir"
  echo "::: 뜨지 못했다 — $OUT_ROOT/last-failure.log" >&2
  exit 1
fi

# 빈 파일은 성공이 아니다. gzip 머리만 든 것이 20바이트쯤이다.
size=$(wc -c <"$dir/public.sql.gz" | tr -d ' ')
if [ "$size" -lt 200 ]; then
  echo "::: 뜬 것이 비었다($size B). 남기지 않는다." >&2
  rm -rf "$dir"
  exit 1
fi

# ── 계정. 되는 대로 — 없어도 위의 것이 알맹이다.
if pg_dump "$URL" --data-only --table=auth.users --no-owner --no-privileges \
     2>"$dir/auth.log" | gzip -9 >"$dir/auth_users.sql.gz"
then :; else
  echo "  (계정은 못 떴다 — 게임 데이터는 떴다)"
  rm -f "$dir/auth_users.sql.gz"
fi

rm -f "$dir/pg_dump.log" "$dir/auth.log"

# 무엇이 담겼는지 한 줄로 남긴다. **표 이름과 줄 수만이다** — 값은 안 적는다.
gzip -dc "$dir/public.sql.gz" \
  | awk '/^COPY /{t=$2} /^COPY /{c=0; next} /^\\\.$/{if(t!=""){print t, c; t=""}} t!=""{c++}' \
  | sort >"$dir/MANIFEST.txt" || true

echo
echo "떴다: $dir"
du -h "$dir"/*.gz | sed 's/^/  /'
echo "  ── 담긴 것"
sed 's/^/  /' "$dir/MANIFEST.txt" 2>/dev/null || true

# ── 오래된 것을 걷는다. 열넷이면 하루 한 번 떠도 두 주다.
count=$(find "$OUT_ROOT" -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ')
if [ "$count" -gt "$KEEP" ]; then
  find "$OUT_ROOT" -maxdepth 1 -mindepth 1 -type d | sort | head -n "$((count - KEEP))" \
    | while read -r old; do echo "  걷음: $(basename "$old")"; rm -rf "$old"; done
fi

# ============================================================================
# 되살리는 길
# ----------------------------------------------------------------------------
# 표와 정책은 마이그레이션이 들고 있고 여기 있는 것은 값뿐이다. 그래서 순서가
# 있다 — **틀을 먼저 세우고 값을 붓는다.**
#
#   1. 새 프로젝트를 만들고 `~/.config/sleeping-lion-2/db-url`을 갈아 끼운다.
#   2. npx supabase@latest db push --db-url "$(cat ~/.config/sleeping-lion-2/db-url)"
#   3. 계정을 먼저 세운다(있으면) — `characters.owner_id`가 이것을 가리킨다.
#      gzip -dc <떠 둔 것>/auth_users.sql.gz | psql "$(cat ~/.config/sleeping-lion-2/db-url)"
#   4. 값을 붓는다.
#      gzip -dc <떠 둔 것>/public.sql.gz | psql "$(cat ~/.config/sleeping-lion-2/db-url)"
#
# 계정을 못 떴으면 사람들이 다시 가입해야 하고, 그때 id가 달라지므로 캐릭터의
# 주인을 손으로 이어 줘야 한다. **그 자리가 아프다는 것을 알고 둔다** — 게임
# 데이터(클래스·특혜·개봉 조건·상점·업적)는 그것과 무관하게 그대로 돌아온다.
# ============================================================================
