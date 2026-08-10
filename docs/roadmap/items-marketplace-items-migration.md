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
| M6 Cutover (`isArchive`, sizes, Tamov, stocks v1) | □ |

Changelog M5: [`../migrations/m5-consolidation-changelog.md`](../migrations/m5-consolidation-changelog.md).

---

## Current State

| Область | Статус |
|---------|--------|
| 1 item на article в БД | ✔ после consolidation |
| Stocks / Orders | ✔ только `marketplace_item_id` (`item_id` drop) |
| send_status / listing / prices | ✔ на `marketplace_items` |
| Price crons WB/Ozon | ✔ hourly → mp (`deletedAt IS NULL`) |
| Directory `isArchive` filter | □ ещё на `items`; целевой — mp `deleted_at` |
| Stocks filter archive | ✔ уже `mpItems.deletedAt IS NULL` |
| Stop-list / directory read | ✔ mp-centric |

**Фокус спринта (M6):** directory `isArchive` → `deleted_at` → optional drop колонки → `items_sizes` / Yandex Tamov / stocks v1.

---

## Milestones

### 1–4b ✔

### Milestone 5 — Consolidation ✔

- [x] Entity `items` без MP-полей и цен
- [x] Card sync find-or-create by article; PATCH directory V2
- [x] Legacy entity `orders` / `directions` / `change_prices_histories` удалены
- [x] `1786522800000` prices → mp (prod)
- [x] `1786526400000` consolidation + drop `stocks.item_id` / `orders_v2.item_id` (prod)
- [x] Price crons WB/Ozon → `MarketplaceItems` (discount % единая шкала; WB `priceWithDiscount`)

### Milestone 6 — Cutover □

- [ ] Directory filter: убрать `items.isArchive`, опираться на наличие active mp (`deleted_at IS NULL`)
- [ ] Drop `items.isArchive` (optional, после подтверждения GAS)
- [ ] `items_sizes` — связь с mp (TBD)
- [ ] Yandex Tamov: stop-list PATCH, trash sync
- [ ] Stocks API v1 — retire или восстановить осознанно
- [ ] Cleanup: orphan DTO `get-change-price-history`, мёртвые поля stop-list interface
- [ ] Price crons: пагинация >1000 SKU (optional)

---

## Current Sprint

| # | Задача | Статус |
|---|--------|--------|
| 1 | Directory: `isArchive` → archive через mp `deleted_at` | □ next |
| 2 | Согласовать с GAS drop `isArchive` | □ |
| 3 | `items_sizes` redesign | □ |
| 4 | Yandex Tamov gaps | □ later |
| 5 | Stocks v1 decision | □ later |

---

## Known Blockers / Gaps

| Gap | Влияние |
|-----|---------|
| Directory ещё фильтрует `items.isArchive` | item без active listings может скрываться иначе, чем archive listing |
| Price API limit 1000 | хвост каталога не обновляется без pagination |
| Card sync find by article | без явного `created_for_calculation = false` — риск match test item |
