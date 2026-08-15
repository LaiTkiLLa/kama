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
| Ozon Tamov cards / stocks / orders_v2 | ✔ |
| M6 Cutover (sizes, Tamov gaps, stocks v1) | □ |

Changelog M5: [`../migrations/m5-consolidation-changelog.md`](../migrations/m5-consolidation-changelog.md).

---

## Current State

| Область | Статус |
|---------|--------|
| 1 item на article; stocks/orders без `item_id` | ✔ |
| Price crons WB + основной Озон | ✔ |
| Product hide `items.isArchive` / listing `deleted_at` | ✔ оба уровня |
| **Ozon Tamov** (`ozonTamov*`) | ✔ cards/stocks/orders/warehouses; DTO + dynamic orders |
| Warehouse resolve (multi-cabinet) | ✔ всегда с `marketplaceId` (Ozon stocks: title+mp; orders: internalNumber+mp) |
| Ozon Tamov prices / trash / stop-list | □ gaps |
| Yandex Tamov sync | ✔ cards/stocks/orders; stop-list/trash □ |

**Фокус спринта (M6):** backfill размеров в `item_characteristics` + API → Tamov gaps → stocks v1 → cleanup.

---

## Milestones

### 1–5 ✔

### Milestone 6 — Cutover □

- [x] `items.isArchive` оставляем (product hide)
- [x] Ozon Tamov: rename from Ozon Second; cron cards/stocks/orders/warehouses
- [x] `items_sizes` — schema `characteristics` / `characteristic_values` / `item_characteristics` (`1789330000000`)
- [ ] backfill размеров из `items_sizes` + API cutover; drop `items_sizes` — позже
- [ ] Ozon Tamov: prices, trash, stop-list/directory PATCH
- [ ] Yandex Tamov: stop-list PATCH, trash sync
- [ ] Stocks API v1 — commented by-date **удалён** (2026-08-13); restore не делали. Sheets warehouse-level: `GET /api/stocks/by-warehouses`
- [ ] Cleanup orphan DTO / dead stop-list fields
- [ ] Price crons pagination >1000 (optional)

---

## Current Sprint

| # | Задача | Статус |
|---|--------|--------|
| 1 | characteristics schema | ✔ `1789330000000`; backfill/API/drop `items_sizes` — next |
| 2 | Ozon / Yandex Tamov gaps | □ |
| 3 | Stocks v1 decision | □ later (v1 by-date код удалён; by-warehouses — Sheets, не v1) |
| 4 | Cleanup | □ |

---

## Known Gaps

| Gap | Влияние |
|-----|---------|
| Tamov stop-list / directory PATCH | GAS не обновит статусы/listing 2-го кабинета |
| Ozon Tamov prices / trash | только основной `Озон` |
| Price API limit 1000 | хвост каталога |
| `items_sizes` на item | не целевая модель |
