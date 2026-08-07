# Roadmap: Items → MarketplaceItems

> [`../domain/items-and-marketplace-items.md`](../domain/items-and-marketplace-items.md) · [`../AI_CONTEXT.md`](../AI_CONTEXT.md)

Последнее обновление: 2026-08-07.

---

## Vision

1 `items` на article + N `marketplace_items`. MP-данные только в listings.

---

## Current State

| Область | Статус |
|---------|--------|
| Stocks / Orders sync | ✔ |
| Stop-list (read/write/autostatus) вокруг `send_status` | ✔ mp-centric + dual-write |
| category / imageUrl / title на mp | □ |
| Drop с `items` | □ |

**Фокус:** прогнать migration → category/imageUrl/title → Consolidation.

---

## Milestone 4 — StopList ✔ *(send_status track)*

- [x] v2 read (mp stocks / orders_v2)
- [x] Retire v1 read
- [x] Entity + migration `send_status_id`
- [x] PATCH find → update by id (dual-write, без continue)
- [x] Autostatus mp + dual-write + `orders_v2` + mp aggregations
- [x] v2 read `mpItems.sendStatus`
- [ ] category / imageUrl / title → mp items *(можно считать M5 prep)*

### Milestone 5 — Consolidation □

### Milestone 6 — Cutover □

---

## Current Sprint

| # | Задача | Статус |
|---|--------|--------|
| 1 | Прогнать `1786097301320` | □ |
| 2 | Перенос category / imageUrl / title на mp items | □ |

---

## Known Blockers

Нет блокеров по send_status. Дальше — остальные MP-поля и consolidation.
