# AI_CONTEXT — оперативная память проекта

> Оперативные решения. При противоречии с кодом — верить коду.  
> Обновляет разработчик; AI может предложить дополнение.

Связанные: [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md), [`domain/items-and-marketplace-items.md`](domain/items-and-marketplace-items.md), [`roadmap/items-marketplace-items-migration.md`](roadmap/items-marketplace-items-migration.md).

---

## Текущая позиция миграции (FACT, 2026-08-07)

**Milestone 4b — listing fields.** M1–M4 (`send_status`) закрыты. Schema listing-полей есть. Card sync **create** dual-write listing fields ✔ (WB/Ozon/Yandex). **Update** mp listing fields ещё только identity/dimensions. `category`/`title` на mp снова **nullable** (`1786107580847`) — безопасный transition. Дальше: dual-write на update → v2 stop-list image/title/color с mp → Consolidation.

---

## Принятые решения

- `items` + `marketplace_items`; возврат к `item == listing` **запрещён**.
- Целевые MP-поля на `marketplace_items`: `category`, `title`, `color`, `imageUrl`, `send_status_id` (+ identity/dimensions).
- `title` на переходном этапе dual: остаётся на `items` и копируется на mp listing.
- `send_status_id` целевое место — `marketplace_items`; dual-write на `items` до cutover.
- Архив listing — `marketplace_items.deleted_at` (не `isArchive`).
- На transition `marketplace_items.category` / `title` — **nullable** (не требовать NOT NULL, пока dual-write update не полный).
- Цены / `wbCreatedAt` / drop колонок с `items` — пока не трогаем.
- UI — Google Sheets + GAS; frontend в репо не создавать.
- Stop-list read — только `GET /api/items/v2/stop-list`.
- Второй кабинет Yandex — отдельная строка в `marketplaces` с title **`Yandex Tamov`** (не смешивать с `Yandex`). Склады тоже scoped по `marketplace_id` кабинета (не общий пул «внутри одного Yandex»).

---

## Завершено (FACT, 2026-08-07)

| Область | Статус |
|---------|--------|
| M1 marketplace_items + identity dual-write | ✔ |
| M2 stocks sync по `marketplace_item_id` | ✔ |
| M3 orders_v2 по `marketplace_item_id` | ✔ |
| Stop-list v1 read retired | ✔ |
| Entity listing fields + `sendStatusId` | ✔ |
| Migrations `178601*` / `178609*` | ✔ в репо |
| Migration `1786107580847` (category/title nullable) | ✔ |
| Directory `marketplacesInfo` с mp | ✔ |
| PATCH / autostatus / v2 `sendStatus` | ✔ |
| Card sync **create** dual-write category/title/color/imageUrl | ✔ WB/Ozon/Yandex |
| Card sync **update** dual-write listing fields | □ только identity/dimensions |
| v2 stop-list image/title/color | □ с `item` |
| Drop колонок с `items` | □ cutover |
| Прогон migrations на всех env | □ NEEDS VERIFICATION |

---

## Known issues

| Issue | Суть |
|-------|------|
| Card sync update gap | update `MarketplaceItems` без category/title/color/imageUrl — Directory/mp stale на существующих |
| v2 stop-list | image/title/color с `item`, не с `mpItems` |
| dual-write `send_status` | держать до Consolidation/Cutover |
| Update mp by `itemId` alone | card sync update по `{ itemId }` — ок при 1:1, риск при 1:N |
| Yandex Tamov gaps | trash / stop-list PATCH / stocks DTO / dynamic orders live API |

---

## Не менять без плана

Dual-write identity и `send_status`; legacy keys stocks/orders_v2; drop `items.send_status_id` / MP-колонок до cutover; stocks API v1 (GAS); цены / `wb_created_at`.

---

## История

| Дата | Итог |
|------|------|
| 2026-08-06 | AI-ready docs; Sheets; field split; stop-list v1 off; migrations copy fields |
| 2026-08-07 | Stocks/Orders mp-centric; send_status полный контур (PATCH/autostatus/v2) |
| 2026-08-07 | Merge docs; убран `send_status_id` из `178601*` — остаётся в `178609` |
| 2026-08-07 | Ревью: позиция = M4b; dual-write gap listing fields подтверждён кодом |
| 2026-08-07 | Второй Yandex (`Yandex Tamov`): card/stocks/orders_v2 cron; gaps warehouses/API DTO/stop-list |
| 2026-08-07 | Create dual-write listing fields; category/title nullable (`1786107580847`) |
| 2026-08-07 | Yandex Tamov warehouses sync; upsert по (marketplace_id, internal_number) |
| 2026-08-07 | Yandex orders_v2: warehouse lookup + marketplaceId |
