# Roadmap: Items → MarketplaceItems

> [`../domain/items-and-marketplace-items.md`](../domain/items-and-marketplace-items.md) · [`../AI_CONTEXT.md`](../AI_CONTEXT.md)

Последнее обновление: 2026-08-10.

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

**Фокус спринта (M6):** `items_sizes` → Tamov gaps (Ozon + Yandex) → stocks v1 → cleanup.

---

## Milestones

### 1–5 ✔

### Milestone 6 — Cutover □

- [x] `items.isArchive` оставляем (product hide)
- [x] Ozon Tamov: rename from Ozon Second; cron cards/stocks/orders/warehouses
- [ ] `items_sizes` — связь с mp (TBD) — **next**
- [ ] Ozon Tamov: prices, trash, stop-list/directory PATCH
- [ ] Yandex Tamov: stop-list PATCH, trash sync
- [ ] Stocks API v1 — retire или восстановить
- [ ] Cleanup orphan DTO / dead stop-list fields
- [ ] Price crons pagination >1000 (optional)

---

## Current Sprint

| # | Задача | Статус |
|---|--------|--------|
| 1 | `items_sizes` redesign | □ next |
| 2 | Ozon / Yandex Tamov gaps | □ |
| 3 | Stocks v1 decision | □ later |
| 4 | Cleanup | □ |

---

## Known Gaps

| Gap | Влияние |
|-----|---------|
| Tamov stop-list / directory PATCH | GAS не обновит статусы/listing 2-го кабинета |
| Ozon Tamov prices / trash | только основной `Озон` |
| Price API limit 1000 | хвост каталога |
| `items_sizes` на item | не целевая модель |
