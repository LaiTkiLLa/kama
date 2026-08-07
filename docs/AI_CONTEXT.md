# AI_CONTEXT — оперативная память проекта

> Оперативные решения. При противоречии с кодом — верить коду.  
> Обновляет разработчик; AI может предложить дополнение.

Связанные: [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md), [`domain/items-and-marketplace-items.md`](domain/items-and-marketplace-items.md), [`roadmap/items-marketplace-items-migration.md`](roadmap/items-marketplace-items-migration.md).

---

## Текущая позиция миграции (FACT, 2026-08-07)

**Milestone 4b — listing fields.** M1–M4 (`send_status`) закрыты. Schema listing-полей в entity + migrations есть. Следующий код-шаг: dual-write `category`/`title`/`color`/`imageUrl` в card sync (WB/Ozon/Yandex), затем v2 stop-list читать эти поля с `mpItems`. Consolidation (M5) и Cutover (M6) не начаты.

---

## Принятые решения

- `items` + `marketplace_items`; возврат к `item == listing` **запрещён**.
- Целевые MP-поля на `marketplace_items`: `category`, `title`, `color`, `imageUrl`, `send_status_id` (+ identity/dimensions).
- `title` на переходном этапе dual: остаётся на `items` и копируется на mp listing.
- `send_status_id` целевое место — `marketplace_items`; dual-write на `items` до cutover.
- Архив listing — `marketplace_items.deleted_at` (не `isArchive`).
- Цены / `wbCreatedAt` / drop колонок с `items` — пока не трогаем.
- UI — Google Sheets + GAS; frontend в репо не создавать.
- Stop-list read — только `GET /api/items/v2/stop-list`.

---

## Завершено (FACT, 2026-08-07)

| Область | Статус |
|---------|--------|
| M1 marketplace_items + identity dual-write | ✔ |
| M2 stocks sync по `marketplace_item_id` | ✔ |
| M3 orders_v2 по `marketplace_item_id` | ✔ |
| Stop-list v1 read retired | ✔ |
| Entity: `category`, `title`, `color`, `imageUrl`, `sendStatusId` на `MarketplaceItems` | ✔ |
| Migrations `1786013498713` / `1786013498714` (color/category/image_url/title) | ✔ в репо |
| Migration `1786097301320` (send_status_id) | ✔ в репо |
| Directory `marketplacesInfo` читает category/barcode/image/color/itemTitle с mp | ✔ |
| PATCH stop-list: find → update by id, dual-write, без continue | ✔ |
| Autostatus: mp root, dual-write, `orders_v2`, aggregations по `marketplace_item_id` | ✔ |
| v2 stop-list `sendStatus` с `mpItems` | ✔ |
| Card sync dual-write `category/title/color/imageUrl` в create/update `MarketplaceItems` | □ только identity/dimensions |
| v2 stop-list image/title/color | □ всё ещё с `item` |
| Drop колонок с `items` | □ cutover |
| Прогон migrations на всех env | □ NEEDS VERIFICATION |

---

## Known issues

| Issue | Суть |
|-------|------|
| Card sync dual-write gap | create/update `MarketplaceItems` без category/title/color/imageUrl — после NOT NULL create может падать / Directory stale |
| v2 stop-list | image/title/color с `item`, не с `mpItems` |
| dual-write `send_status` | держать до Consolidation/Cutover |
| Update mp by `itemId` alone | card sync update всё ещё по `{ itemId }` — ок при 1:1, риск при будущем 1:N |

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
