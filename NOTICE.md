# NOTICE — Lights Out Stones

**Автор и правообладатель:** Jugaro (<https://github.com/Jugaro>)
**Оригинальный репозиторий:** <https://github.com/Jugaro/lights-out-stones>
**Первая публикация:** октябрь 2026
**Лицензия:** MIT (см. LICENSE)

## Доказательства авторства

Если кто-то скопирует игру и выдаст за свою, авторство подтверждается
независимыми способами:

1. **История коммитов GitHub** — вся переписка разработки с датами,
   подписанная аккаунтом Jugaro; переписать её задним числом невозможно.
   Дополнительная фиксация — GitHub Releases (теги с датами).

2. **Печать сборки** — строка `95c439226dfd78e9` зашита в `game.js`
   (экспорт `LightsOutLogic.BUILD_SEAL`), в комментарии `index.html` и `sw.js`.
   Это первые 16 символов SHA-256 от строки
   `Jugaro:LightsOutStones:2026:first-commit` — проверяется одной командой:
   `printf 'Jugaro:LightsOutStones:2026:first-commit' | sha256sum`

3. **Манифест сборки** — в `game.js` экспорт `LightsOutLogic.BUILD_MANIFEST`:
   base64-строка, которая декодируется в
   `Lights Out Stones | original by Jugaro | https://github.com/Jugaro/lights-out-stones | first published: 2026-10 | contact: github.com/Jugaro`.
   Проверка: `node -e "console.log(Buffer.from(require('./game.js').BUILD_MANIFEST,'base64').toString())"`

4. **Метаданные** — `<meta name="author">` и `<meta name="copyright">`
   в `index.html`, копирайт-заголовки в исходниках.

Любая копия по лицензии MIT обязана сохранять уведомление об авторских
правах (LICENSE). Удаление копирайта — нарушение лицензии.
