# Roadmap: Items → MarketplaceItems

> [`../domain/items-and-marketplace-items.md`](../domain/items-and-marketplace-items.md) · [`../AI_CONTEXT.md`](../AI_CONTEXT.md)

Последнее обновление: 2026-08-07 (после merge).

---

## Vision

1 `items` на article + N `marketplace_items`. MP-данные только в listings.

---

## Current State

| Область | Статус |
|---------|--------|
| Stocks / Orders sync | ✔ по `marketplace_item_id` |
| Stop-list send_status (read/write/autostatus) | ✔ mp-centric + dual-write |
| Entity listing fields | ✔ category/title/color/imageUrl/sendStatusId |
| Migrations полей | ✔ `178601*` (listing fields) → `178609*` (send_status) |
| Card sync dual-write новых полей | □ |
| v2 image/title/color с mp | □ |
| Drop с `items` | □ |

**Фокус:** прогнать migrations → dual-write category/title/color/imageUrl в card sync → v2 read этих полей с mp → Consolidation.

---

## Milestones

### 1–3 ✔ MarketplaceItems / Stocks / Orders

### Milestone 4 — StopList ✔ *(send_status)*

- [x] v2 read mp stocks/orders_v2
- [x] Retire v1 read
- [x] Entity + migrations `send_status_id`
- [x] PATCH find → update by id (dual-write, без continue)
- [x] Autostatus mp + dual-write + `orders_v2` + mp aggregations
- [x] v2 read `mpItems.sendStatus`

### Milestone 4b / prep M5 — listing fields □

- [x] Entity + migration copy `category/title/color/image_url` (`1786013498713`; без send_status)
- [x] `send_status_id` только в `1786097301320`
- [ ] Card sync dual-write listing fields
- [ ] v2 stop-list: image/title/color с `mpItems`

### Milestone 5 — Consolidation □

### Milestone 6 — Cutover □

---

## Current Sprint

| # | Задача | Статус |
|---|--------|--------|
| 1 | Прогнать migrations (`178601*` затем `178609*`) | □ |
| 2 | Dual-write category/title/color/imageUrl в card sync | □ |
| 3 | v2 stop-list: image/title/color с mp | □ |

---

## Known Blockers

| Блокер | Влияние |
|--------|---------|
| Card sync без NOT NULL полей | create mp item может ломаться после `178601` |
