# AI_CONTEXT — оперативная память проекта

> Оперативные решения. При противоречии с кодом — верить коду.  
> Обновляет разработчик; AI может предложить дополнение.

Связанные: [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md), [`domain/items-and-marketplace-items.md`](domain/items-and-marketplace-items.md), [`roadmap/items-marketplace-items-migration.md`](roadmap/items-marketplace-items-migration.md).

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

## Завершено (FACT, 2026-08-07, после merge)

| Область | Статус |
|---------|--------|
| M1 marketplace_items + identity dual-write | ✔ |
| M2 stocks sync по `marketplace_item_id` (Yandex findStock → `item.marketplaceItemId`) | ✔ |
| M3 orders_v2 по `marketplace_item_id` | ✔ |
| Stop-list v1 read retired | ✔ |
| Entity: `category`, `title`, `color`, `imageUrl`, `sendStatusId` на `MarketplaceItems` | ✔ |
| Migrations `1786013498713` / `1786013498714` (color/category/image_url/title) | ✔ |
| Migration `1786097301320` (send_status_id) | ✔ |
| Directory `marketplacesInfo` читает category/barcode/image/color/itemTitle с mp | ✔ |
| PATCH stop-list: find → update by id, dual-write, без continue | ✔ |
| Autostatus: mp root, dual-write, `orders_v2`, aggregations по `marketplace_item_id` | ✔ |
| v2 stop-list `sendStatus` с `mpItems` | ✔ |
| Card sync dual-write `category/title/color/imageUrl` в create/update `MarketplaceItems` | □ ещё identity/dimensions |
| v2 stop-list image/title/color | □ всё ещё с `item` |
| Drop колонок с `items` | □ cutover |

---

## Known issues

| Issue | Суть |
|-------|------|
| Card sync dual-write gap | create/update `MarketplaceItems` без category/title/color/imageUrl — после NOT NULL create может падать / Directory stale |
| v2 stop-list | image/title/color с `item`, не с `mpItems` |
| dual-write `send_status` | держать до Consolidation/Cutover |

---

## Не менять без плана

Dual-write identity; legacy keys stocks/orders_v2; drop `items.send_status_id` / MP-колонок до cutover; stocks API v1 (GAS); цены / `wb_created_at`.

---

## История

| Дата | Итог |
|------|------|
| 2026-08-06 | AI-ready docs; Sheets; field split; stop-list v1 off; migrations copy fields |
| 2026-08-07 | Stocks/Orders mp-centric; send_status полный контур (PATCH/autostatus/v2) |
| 2026-08-07 | Merge docs; убран `send_status_id` из `178601*` — остаётся в `178609` |
