# Roadmap: Items → MarketplaceItems

> [`../domain/items-and-marketplace-items.md`](../domain/items-and-marketplace-items.md) · [`../AI_CONTEXT.md`](../AI_CONTEXT.md)

Последнее обновление: 2026-08-15.

---

## Vision

1 `items` на article + N `marketplace_items`. MP-данные только в listings.

---

## Где мы сейчас

**Milestone 6 — Cutover (в работе).** M1–M5 ✔ (миграции на prod).

| Слой | Статус |
|------|--------|
| M1–M5 Consolidation + price crons (main) | ✔ prod |
| Ozon Tamov cards / stocks / orders_v2 / prices / trash / stop-list | ✔ |
| M6 Cutover (sizes ✔; Tamov directory PATCH / Yandex trash; MP characteristics) | □ |

Changelog M5: [`../migrations/m5-consolidation-changelog.md`](../migrations/m5-consolidation-changelog.md).

---

## Current State

| Область | Статус |
|---------|--------|
| 1 item на article; stocks/orders без `item_id` | ✔ |
| Price crons WB + Озон + **Ozon Tamov** | ✔ (pagination не нужна: ≤~400 SKU) |
| Product hide `items.isArchive` / listing `deleted_at` | ✔ оба уровня |
| **Ozon Tamov** (`ozonTamov*`) | ✔ cards/stocks/orders/warehouses/prices/trash/stop-list; DTO + dynamic orders |
| Warehouse resolve (multi-cabinet) | ✔ всегда с `marketplaceId` (Ozon stocks: title+mp; orders: internalNumber+mp) |
| Ozon Tamov directory PATCH | □ gap |
| Yandex Tamov sync | ✔ cards/stocks/orders/stop-list PATCH; trash □ |
| Stocks Sheets | ✔ `GET /api/stocks/by-warehouses`; by-date **не возвращаем** |

**Фокус спринта (M6):** MP characteristics sync → directory PATCH / Yandex trash → cleanup leftovers.

---

## Milestones

### 1–5 ✔

### Milestone 6 — Cutover □

- [x] `items.isArchive` оставляем (product hide)
- [x] Ozon Tamov: rename from Ozon Second; cron cards/stocks/orders/warehouses
- [x] `items_sizes` — schema `characteristics` / `characteristic_values` / `item_characteristics` (`1789330000000`)
- [x] marketplace characteristics schema (`1789340000000`): `marketplace_characteristics` / `marketplace_item_characteristics` / `marketplace_item_sizes` / `marketplace_characteristic_mappings`
- [x] WB sizes → `marketplace_item_sizes` (`chrtID` / `techSize` / `wbSize` / `metadata.skus`)
- [x] directory/list → `marketPlaceItemsSizes` from mp sizes; drop `items_sizes` (`1789350000000`)
- [x] Ozon Tamov: prices cron + trash cron (First=`Озон` / Second=`Ozon Tamov`)
- [x] stop-list PATCH + GET filter: Ozon Tamov / Yandex Tamov; directory/ERP sizes grouped by `marketplaceTitle`
- [x] Stocks: by-date/v1 **не возвращаем**; Sheets = `GET /api/stocks/by-warehouses`
- [x] Price crons pagination >1000 **не нужна** (≤~400 SKU/кабинет)
- [x] Cleanup orphan DTO / dead stop-list fields (`get-items-list.dto`, legacy `GetStopListFromDb` / `direction*`)
- [ ] backfill размеров в `item_characteristics` (если ещё нужен product-level) — later
- [ ] sync marketplace characteristics из WB/Ozon; Ozon sizes; soft-delete пропавших sizes
- [ ] directory PATCH для Tamov (если нужен listing update 2-го кабинета)
- [ ] Yandex Tamov: trash sync

---

## Current Sprint

| # | Задача | Статус |
|---|--------|--------|
| 1 | characteristics / sizes | ✔ schema + WB sizes + directory/ERP; MP characteristics sync — next |
| 2 | Ozon / Yandex Tamov gaps | ✔ prices+trash+stop-list; □ directory PATCH; Yandex trash □ |
| 3 | Stocks / prices backlog | ✔ closed (by-date нет; pagination не нужна) |
| 4 | Cleanup orphan DTO | ✔ |

---

## Known Gaps

| Gap | Влияние |
|-----|---------|
| Tamov directory PATCH | GAS может не обновить listing-поля 2-го кабинета |
| Yandex Tamov trash | архив listing 2-го Yandex не синхронится |
| `items_sizes` на item | ✖ dropped (`178935`); runtime — `marketplace_item_sizes` |
