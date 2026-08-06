# Roadmap: Items → MarketplaceItems

> Продуктовый трекер миграции.  
> Модель: [`../domain/items-and-marketplace-items.md`](../domain/items-and-marketplace-items.md).  
> Решения: [`../AI_CONTEXT.md`](../AI_CONTEXT.md).

Последнее обновление: 2026-08-06.

---

## Vision

**Полностью перейти на MarketplaceItems:** один `items` на артикул + N `marketplace_items`. Все MP-specific данные — только в `marketplace_items`.

---

## Current State

| Область | Статус |
|---------|--------|
| `marketplace_items` + dual-write | ✔ работает |
| Stocks / Orders | ✔ `marketplace_item_id`; legacy keys живы |
| Stop-list **read** | ✔ только v2 (`GET /api/items/v2/stop-list`); v1 отключён |
| Stop-list **write / autostatus** | □ legacy (`items.send_status_id`, autostatus → `orders`) |
| `items` | per-MP строки; MP-поля ещё на таблице |
| Stocks API | v1 + v2 параллельно |

**Фокус:** Milestone 4 — завершить StopList (autostatus, перенос send_status на mp item).

---

## Milestones

### Milestone 1 — Создать MarketplaceItems ✔

- [x] Таблица + backfill
- [x] Dual-write sync
- [x] Soft-delete на trash WB/Ozon

---

### Milestone 2 — Перевести Stocks ✔

- [x] `marketplace_item_id` + backfill + FK
- [x] Stock sync → `marketplace_item_id` on create
- [x] `GET /api/stocks/v2/current`

**Хвост → M6:** v1 stocks endpoint; dual columns; sync uniqueness по `item_id`.

---

### Milestone 3 — Перевести Orders ✔

- [x] `orders_v2` + `marketplace_item_id`
- [x] Active crons → `OrdersV2`

**Хвост → M4:** autostatus всё ещё читает legacy `orders`.

---

### Milestone 4 — Перевести StopList □ *in progress*

- [x] `GET /api/items/v2/stop-list` — mp-item centric, `orders_v2`, `deleted_at`
- [x] Retire v1 read: `GET /api/items/stop-list` отключён (**FACT**, 2026-08-06)
- [ ] Autostatus → `orders_v2` + mp-item centric stocks
- [ ] `send_status_id` → `marketplace_items` (schema + PATCH + autostatus)
- [ ] Перенос `imageUrl`, `category` на mp item (M5 overlap)
- [ ] Удалить закомментированный v1 код после стабилизации

---

### Milestone 5 — Consolidation □

- [ ] 1 `items` на article + N mp items
- [ ] Перенос MP-полей с `items`
- [ ] Sync без N строк items
- [ ] Directory без дублирования
- [ ] Yandex trash → `deleted_at`

---

### Milestone 6 — Cutover □

- [ ] Drop MP-колонок с `items` (`isArchive`, `imageUrl`, prices, …)
- [ ] Legacy keys на stocks/orders_v2
- [ ] Retire `GET /api/stocks/current` (v1)
- [ ] Retire legacy `orders` reads
- [ ] `marketplaceItemId ?? 0` fix

---

## Current Sprint

**Milestone 4 — StopList**

| # | Задача | Статус |
|---|--------|--------|
| 1 | Autostatus: `orders_v2` вместо `orders` | □ |
| 2 | Autostatus: stocks по `marketplace_item_id` | □ |
| 3 | Schema + logic: `send_status_id` на `marketplace_items` | □ |
| 4 | PATCH stop-list → писать mp item | □ |
| 5 | GAS на v2 stop-list read (вне репо) | □ |

---

## Known Blockers

| Блокер | Влияние |
|--------|---------|
| Autostatus → legacy `orders` | Неверные автостатусы |
| `send_status_id` ещё на `items` | Расхождение с целевой моделью per-listing |
| PATCH stop-list пишет `items` | То же |
| v2 read join `item.sendStatus` | Временно; до переноса колонки |
| Stocks v1 API | GAS может зависеть — retire в M6 |

---

## Как обновлять

После шага: checklist → Current Sprint → `AI_CONTEXT` при новом решении → domain doc при смене модели.
