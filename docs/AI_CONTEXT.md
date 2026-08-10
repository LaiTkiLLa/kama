# AI_CONTEXT — оперативная память проекта

> Оперативные решения. При противоречии с кодом — верить коду.  
> Обновляет разработчик; AI может предложить дополнение.

Связанные: [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md), [`domain/items-and-marketplace-items.md`](domain/items-and-marketplace-items.md), [`roadmap/items-marketplace-items-migration.md`](roadmap/items-marketplace-items-migration.md).

---

## Текущая позиция миграции (FACT, 2026-08-10)

**Milestone 5 — Consolidation (в работе).** M1–M4 и M4b закрыты в коде. Цены перенесены на `marketplace_items` (`1786522800000` ✔ на dev). Схлопывание items + drop legacy MP-колонок — миграция `1786526400000` в репо, прогон на всех env — NEEDS VERIFICATION.

---

## Принятые решения

- `items` + `marketplace_items`; возврат к `item == listing` **запрещён**.
- **1 item на article** (кроме `created_for_calculation = true`) — целевая модель после M5.
- Marketplace-specific на `marketplace_items`: identity, dimensions, volume, `category`, `title`, `color`, `imageUrl`, `price`, `discount`, `priceWithDiscount`, `send_status_id`, `deleted_at`.
- Marketplace-independent на `items`: article, логистика/себестоимость/classification, `wbCreatedAt`, `ownImagesUrl`, `isArchive` (legacy, см. gap).
- `send_status_id` — только `marketplace_items` (dual-write на `items` **снят**).
- Архив listing — `marketplace_items.deleted_at` (целевая модель); `items.isArchive` — legacy, ещё в directory filter.
- `directions` — **удалены** из кода; таблица drop в `1786526400000`.
- Legacy `orders` — **удалены** из кода; таблица drop в `1786526400000`.
- `change_prices_histories` — **удалены** (drop в `1786522800000`).
- UI — Google Sheets + GAS; frontend в репо не создавать.
- Stop-list read — только `GET /api/items/v2/stop-list`.
- Второй кабинet Yandex — `marketplaces.title = 'Yandex Tamov'`; gaps по stop-list PATCH / card sync — **отложено**.

---

## Завершено (FACT, 2026-08-10)

| Область | Статус |
|---------|--------|
| M1 marketplace_items + identity | ✔ |
| M2 stocks sync по `marketplace_item_id` | ✔ |
| M3 orders_v2 по `marketplace_item_id` | ✔ |
| M4 send_status mp-centric (read/PATCH/autostatus) | ✔ |
| M4b listing fields schema + nullable category/title | ✔ |
| Card sync create/update listing fields на mp | ✔ WB/Ozon/Yandex |
| Directory read `marketplacesInfo` + prices с mp | ✔ |
| PATCH directory/info → mp (V2) | ✔ |
| v2 stop-list image/title/color с mp | ✔ |
| Card sync create: find item by article | ✔ WB/Ozon/Yandex |
| Migration prices → mp (`1786522800000`) | ✔ dev / NEEDS VERIFICATION all env |
| Entity `items` без MP-полей и цен | ✔ |
| Legacy entity `orders`, `directions`, `change_prices_histories` | ✔ удалены из кода |

---

## В работе / следующие шаги

| Область | Статус |
|---------|--------|
| Migration consolidation (`1786526400000`) | □ в репо; прогон NEEDS VERIFICATION |
| Price crons (WB/Ozon) → `MarketplaceItems` | □ закомментированы |
| `items.isArchive` → filter по `mpItems.deletedAt` | □ |
| `items_sizes` sync | □ закомментирован, будет переделан |
| Yandex Tamov: stop-list PATCH, trash sync | □ отложено |
| Stocks API v1 (`/stocks/current`) | □ закомментирован в controller |
| Drop `wb_created_at` с items (optional) | □ не решено |

---

## Known issues

| Issue | Суть |
|-------|------|
| Consolidation not run everywhere | entity уже без MP-колонок; без `1786526400000` на env — рассинхрон schema/runtime |
| Price crons off | цены не обновляются из API WB/Ozon до переписывания на mp |
| `items.isArchive` | directory filter ещё на items, не на mp archive |
| Card sync find by article | без `created_for_calculation = false` filter — риск при совпадении с test item |
| Yandex Tamov gaps | trash / stop-list PATCH / часть API |
| Orphan DTO | `get-change-price-history.dto.ts` без endpoint |
| stop-list.interface | мёртвые поля `directionId`/`directionTitle` |

---

## Не менять без плана

Drop legacy keys на `stocks`/`orders_v2` (`item_id`, `marketplace_id`); force cutover без миграции; включение stocks API v1 без плана GAS; секреты в репо.

---

## История

| Дата | Итог |
|------|------|
| 2026-08-06 | AI-ready docs; Sheets; field split; stop-list v1 off |
| 2026-08-07 | M1–M4; send_status mp-centric; create dual-write listing |
| 2026-08-07 | Yandex Tamov card/stocks/orders_v2 |
| 2026-08-10 | Prices → mp (`1786522800000`); entity cleanup; send_status items-only снят; consolidation migration (`1786526400000`); card sync find-by-article; v2 stop-list с mp image |
