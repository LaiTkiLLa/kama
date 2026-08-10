# AI_CONTEXT — оперативная память проекта

> Оперативные решения. При противоречии с кодом — верить коду.  
> Обновляет разработчик; AI может предложить дополнение.

Связанные: [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md), [`domain/items-and-marketplace-items.md`](domain/items-and-marketplace-items.md), [`roadmap/items-marketplace-items-migration.md`](roadmap/items-marketplace-items-migration.md).

---

## Текущая позиция миграции (FACT, 2026-08-10)

**Milestone 6 — Cutover (в работе).** M1–M5 закрыты: цены и consolidation на prod (`1786522800000`, `1786526400000`); price crons WB/Ozon пишут в `marketplace_items`. Следующее: directory filter без `items.isArchive`.

---

## Принятые решения

- `items` + `marketplace_items`; возврат к `item == listing` **запрещён**.
- **1 item на article** (кроме `created_for_calculation = true`) — модель после M5 (prod).
- Marketplace-specific на `marketplace_items`: identity, dimensions, volume, `category`, `title`, `color`, `imageUrl`, `price`, `discount` (**%**), `priceWithDiscount`, `send_status_id`, `deleted_at`.
- Marketplace-independent на `items`: article, логистика/себестоимость/classification, `wbCreatedAt`, `ownImagesUrl`, `isArchive` (legacy directory filter → убрать на M6).
- `send_status_id` — только `marketplace_items`.
- Архив listing — `marketplace_items.deleted_at`; `items.isArchive` — legacy.
- `stocks` / `orders_v2` — только `marketplace_item_id` (`item_id` drop в `1786526400000`).
- `directions`, legacy `orders`, `change_prices_histories` — удалены.
- UI — Google Sheets + GAS; frontend в репо не создавать.
- Stop-list read — только `GET /api/items/v2/stop-list`.
- Второй кабинет Yandex — `marketplaces.title = 'Yandex Tamov'`; gaps — **отложено**.

---

## Завершено (FACT, 2026-08-10)

| Область | Статус |
|---------|--------|
| M1–M4b MarketplaceItems / stocks / orders / stop-list / listing+prices schema | ✔ |
| Card sync + directory + stop-list v2 mp-centric | ✔ |
| Migration prices → mp (`1786522800000`) | ✔ prod |
| Migration consolidation (`1786526400000`) | ✔ prod |
| Drop `item_id` на stocks / orders_v2 | ✔ |
| Price crons WB/Ozon → `MarketplaceItems` | ✔ hourly; `deletedAt IS NULL`; discount в % |

---

## В работе / следующие шаги (M6)

| Область | Статус |
|---------|--------|
| Directory: убрать filter `items.isArchive` → mp archive | □ **next** |
| Drop колонки `items.isArchive` | □ после GAS |
| `items_sizes` sync redesign | □ |
| Yandex Tamov: stop-list PATCH, trash sync | □ отложено |
| Stocks API v1 | □ закомментирован; решение TBD |
| Price crons pagination >1000 | □ optional |
| Cleanup orphan DTO / мёртвые поля stop-list | □ |

---

## Known issues

| Issue | Суть |
|-------|------|
| `items.isArchive` в directory | ещё фильтрует list; stocks/stop-list уже на `deletedAt` |
| Price API limit 1000 | без cursor/offset хвост каталога не обновляется |
| Card sync find by article | без `created_for_calculation = false` — риск test item |
| Yandex Tamov gaps | trash / stop-list PATCH |
| Orphan DTO | `get-change-price-history.dto.ts` |
| stop-list.interface | мёртвые `directionId` / `directionTitle` |

---

## Не менять без плана

Drop `marketplace_id` на `stocks`/`orders_v2`; force cutover без миграции; включение stocks API v1 без плана GAS; секреты в репо; drop `items.isArchive` до согласования с GAS.

---

## История

| Дата | Итог |
|------|------|
| 2026-08-06 | AI-ready docs; Sheets; field split; stop-list v1 off |
| 2026-08-07 | M1–M4; send_status mp-centric; Yandex Tamov card/stocks/orders |
| 2026-08-10 | M5: prices + consolidation на prod; drop `item_id`; price crons → mp; старт M6 |
