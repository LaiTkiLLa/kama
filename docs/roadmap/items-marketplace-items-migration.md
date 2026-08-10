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
| M1–M3 MarketplaceItems / Stocks / Orders | ✔ |
| M4 StopList (`send_status`) mp-only | ✔ |
| M4b listing fields + prices на mp | ✔ |
| M5 Consolidation (схлопывание + drop legacy) | ✔ prod (`1786522800000`, `1786526400000`) |
| M5 Price crons WB/Ozon → mp | ✔ |
| M6 Cutover (sizes, Tamov, stocks v1, cleanup) | □ |

Changelog M5: [`../migrations/m5-consolidation-changelog.md`](../migrations/m5-consolidation-changelog.md).

---

## Current State

| Область | Статус |
|---------|--------|
| 1 item на article в БД | ✔ после consolidation |
| Stocks / Orders | ✔ только `marketplace_item_id` |
| send_status / listing / prices | ✔ на `marketplace_items` |
| Price crons WB/Ozon | ✔ hourly → mp (`deletedAt IS NULL`) |
| Product hide | ✔ `items.isArchive` (directory) — **оставляем** |
| Listing archive | ✔ `marketplace_items.deleted_at` |
| Stocks / stop-list archive | ✔ `mpItems.deletedAt IS NULL` |

**Фокус спринта (M6):** `items_sizes` redesign → Yandex Tamov gaps → stocks v1 decision → cleanup orphan DTO.

---

## Milestones

### 1–4b ✔

### Milestone 5 — Consolidation ✔

- [x] Entity / migrations / drop `item_id` на stocks & orders_v2 (prod)
- [x] Price crons WB/Ozon → `MarketplaceItems`

### Milestone 6 — Cutover □

- [x] ~~Убрать `items.isArchive`~~ — **отменено (DECISION):** флаг product-level нужен; listing archive = `deleted_at`
- [ ] Optional rename `isArchive` → `isDeleted` (позже, не блокер)
- [ ] `items_sizes` — связь с mp (TBD) — **next**
- [ ] Yandex Tamov: stop-list PATCH, trash sync
- [ ] Stocks API v1 — retire или восстановить осознанно
- [ ] Cleanup: orphan DTO `get-change-price-history`, мёртвые поля stop-list interface
- [ ] Price crons: пагинация >1000 SKU (optional)

---

## Current Sprint

| # | Задача | Статус |
|---|--------|--------|
| 1 | `items_sizes` redesign (связь с mp) | □ next |
| 2 | Yandex Tamov gaps | □ later |
| 3 | Stocks v1 decision | □ later |
| 4 | Cleanup orphan DTO / stop-list dead fields | □ |
| 5 | Optional rename `isArchive` → `isDeleted` | □ later |

---

## Known Gaps

| Gap | Влияние |
|-----|---------|
| Price API limit 1000 | хвост каталога без pagination |
| Card sync find by article | без `created_for_calculation = false` — риск test item |
| `items_sizes` на item, не на mp | sizes ещё не в целевой модели |
