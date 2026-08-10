# Roadmap: Items → MarketplaceItems

> [`../domain/items-and-marketplace-items.md`](../domain/items-and-marketplace-items.md) · [`../AI_CONTEXT.md`](../AI_CONTEXT.md)

Последнее обновление: 2026-08-10.

---

## Vision

1 `items` на article + N `marketplace_items`. MP-данные только в listings.

---

## Где мы сейчас

**Milestone 5 — Consolidation (в работе).**

| Слой | Статус |
|------|--------|
| M1–M3 MarketplaceItems / Stocks / Orders | ✔ |
| M4 StopList (`send_status`) mp-only | ✔ |
| M4b listing fields (create + update + v2 read) | ✔ |
| M4b prices на mp + drop с items | ✔ migration `1786522800000` |
| M5 code: entity cleanup, find-by-article, directory/stop-list mp | ✔ |
| M5 migration: схлопывание + drop legacy columns/tables | □ `1786526400000` NEEDS VERIFICATION |
| M6 Cutover (crons, isArchive, cleanup) | □ |

---

## Current State

| Область | Статус |
|---------|--------|
| Stocks / Orders sync | ✔ по `marketplace_item_id` |
| send_status | ✔ только mp (dual-write на items снят) |
| Listing fields + prices на mp | ✔ entity + card sync |
| Directory `marketplacesInfo` | ✔ с mp, включая price/discount |
| PATCH directory/info | ✔ V2 → mp |
| v2 stop-list image/title/color | ✔ с mp |
| Card sync find item by article | ✔ |
| 1 item на article в БД | □ после `1786526400000` |
| Price crons | □ закомментированы |
| Legacy `orders` / `directions` drop | □ в `1786526400000` |

**Фокус спринта:** прогнать `1786526400000` → price crons на mp → убрать `isArchive` filter → Yandex Tamov (позже).

---

## Milestones

### 1–3 ✔ MarketplaceItems / Stocks / Orders

### Milestone 4 — StopList ✔ *(send_status mp-only)*

- [x] v2 read / PATCH / autostatus на `marketplace_items`
- [x] dual-write на `items` **снят**

### Milestone 4b — listing fields + prices ✔

- [x] Entity + migrations copy listing fields (`1786013498713`)
- [x] `send_status_id` на mp (`1786097301320`)
- [x] category/title nullable (`1786107580847`)
- [x] Card sync create/update listing fields (WB/Ozon/Yandex)
- [x] v2 stop-list: image/title/color с mp
- [x] Prices на mp (`1786522800000`); drop `change_prices_histories`
- [x] Directory prices в `marketplacesInfo`

### Milestone 5 — Consolidation ◐

- [x] Entity `items` без MP-полей и цен
- [x] Card sync: find-or-create item by article
- [x] PATCH directory V2 mp-centric
- [x] Удалены legacy entity: `orders`, `directions`, `change_prices_histories`
- [x] Migration `1786526400000` (схлопывание + drop columns/tables) — в репо
- [ ] Прогон `1786526400000` на всех env
- [ ] Price crons → `MarketplaceItems`

### Milestone 6 — Cutover □

- [ ] Directory/stocks filter: `deleted_at` вместо `items.isArchive`
- [ ] Drop `items.isArchive` (optional, после GAS)
- [ ] `items_sizes` — новая связь с mp (TBD)
- [ ] Yandex Tamov: stop-list PATCH, trash sync
- [ ] Stocks v1 retired или восстановлен осознанно

---

## Current Sprint

| # | Задача | Статус |
|---|--------|--------|
| 1 | Прогнать `1786522800000` на всех env | □ NEEDS VERIFICATION |
| 2 | Прогнать `1786526400000` (consolidation) | □ |
| 3 | Price crons WB/Ozon → mp | □ |
| 4 | `isArchive` → mp `deleted_at` в directory | □ |

---

## Known Blockers

| Блокер | Влияние |
|--------|---------|
| Consolidation migration не на prod | schema рассинхрон с entity |
| Price crons off | цены в БД устаревают |
