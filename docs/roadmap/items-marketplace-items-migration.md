# Roadmap: Items → MarketplaceItems

> [`../domain/items-and-marketplace-items.md`](../domain/items-and-marketplace-items.md) · [`../AI_CONTEXT.md`](../AI_CONTEXT.md)

Последнее обновление: 2026-08-07 (create dual-write + nullable category/title).

---

## Vision

1 `items` на article + N `marketplace_items`. MP-данные только в listings.

---

## Где мы сейчас

**Milestone 4b — listing fields (в работе).**

| Слой | Статус |
|------|--------|
| M1–M3 MarketplaceItems / Stocks / Orders | ✔ |
| M4 StopList (`send_status`) | ✔ |
| M4b schema listing fields + send_status | ✔ |
| M4b `category`/`title` nullable (`1786107580847`) | ✔ |
| M4b card sync create dual-write listing fields | ✔ |
| M4b card sync update dual-write listing fields | □ **следующий код-шаг** |
| M4b v2 stop-list image/title/color с mp | □ |
| M5 Consolidation | □ |
| M6 Cutover | □ |

---

## Current State

| Область | Статус |
|---------|--------|
| Stocks / Orders sync | ✔ по `marketplace_item_id` |
| Stop-list send_status | ✔ mp-centric + dual-write |
| Entity listing fields | ✔; category/title nullable |
| Migrations | ✔ `178601*` → `178609*` → `1786107580847` |
| Card sync create listing fields | ✔ |
| Card sync update listing fields | □ |
| v2 image/title/color с mp | □ |
| Drop с `items` | □ |

**Фокус спринта:** dual-write listing fields на **update** → v2 read с mp → Consolidation.

---

## Milestones

### 1–3 ✔ MarketplaceItems / Stocks / Orders

### Milestone 4 — StopList ✔ *(send_status)*

### Milestone 4b / prep M5 — listing fields ◐

- [x] Entity + migration copy `category/title/color/image_url` (`1786013498713`)
- [x] Verify migration `1786013498714`
- [x] `send_status_id` в `1786097301320`
- [x] `category`/`title` DROP NOT NULL (`1786107580847`)
- [x] Card sync **create** dual-write listing fields (WB / Ozon / Yandex)
- [ ] Card sync **update** dual-write listing fields
- [ ] v2 stop-list: image/title/color с `mpItems`

### Milestone 5 — Consolidation □

### Milestone 6 — Cutover □

---

## Current Sprint

| # | Задача | Статус |
|---|--------|--------|
| 1 | Прогнать migrations (`178601*` → `178609*` → `178610*`) | □ / NEEDS VERIFICATION |
| 2 | Dual-write listing fields на card sync **update** | □ |
| 3 | v2 stop-list: image/title/color с mp | □ |

---

## Known Blockers

| Блокер | Влияние |
|--------|---------|
| Update mp без listing fields | существующие карточки: Directory/`marketplacesInfo` stale |
