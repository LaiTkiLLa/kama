# Roadmap: Items → MarketplaceItems

> Продуктовый трекер миграции.  
> Модель: [`../domain/items-and-marketplace-items.md`](../domain/items-and-marketplace-items.md).  
> Решения: [`../AI_CONTEXT.md`](../AI_CONTEXT.md).

Последнее обновление: 2026-08-06 (вечер).

---

## Vision

**Полностью перейти на MarketplaceItems:** один `items` на артикул + N `marketplace_items`.  
MP-specific данные — только в `marketplace_items`.

---

## Current State

| Область | Статус |
|---------|--------|
| `marketplace_items` + identity dual-write | ✔ |
| Stocks sync | ✔ mp-item lookup/create (WB/Ozon/Yandex); **Yandex findStock bug** остаётся |
| Orders sync | ✔ find/create по `marketplace_item_id` |
| Stop-list **read** | ✔ только v2 *(image/title/color/sendStatus ещё с `item`)* |
| Stop-list **write / autostatus** | □ legacy на `items` / `orders` |
| Колонки listing на mp items | ✔ entity + migrations; **card sync dual-write новых полей — □** |
| Directory | ✔ `marketplacesInfo` с mp items |
| Drop колонок с `items` | □ не начинать |
| Stocks API v1 | ещё жив |

**Фокус:** dual-write новых полей в card sync → fix Yandex findStock → StopList write (M4).

---

## Milestones

### Milestone 1 — Создать MarketplaceItems ✔

- [x] Таблица + backfill
- [x] Dual-write identity / dimensions
- [x] Soft-delete trash WB/Ozon

---

### Milestone 2 — Перевести Stocks ✔ *(хвосты ниже)*

- [x] `marketplace_item_id` + backfill + FK
- [x] Stock sync lookup/create по `marketplace_item_id` (WB FBO/FBS, Ozon, Yandex create)
- [x] `GET /api/stocks/v2/current`
- [x] Убран `marketplaceItemId ?? 0` в активных stock sync
- [ ] Fix Yandex `getYandexStocks` findStock: в цикле по `result` брать `item.marketplaceItemId`, не `findMarketplaceItem.id` внешнего цикла
- [ ] Retire stocks v1 → M6

---

### Milestone 3 — Перевести Orders ✔

- [x] `orders_v2` + `marketplace_item_id`
- [x] Active crons find/create по `marketplaceItemId`
- [x] Убран `?? 0` в активных order sync
- [ ] Autostatus всё ещё читает legacy `orders` → M4

---

### Milestone 4 — Перевести StopList + поля listing □ *in progress*

- [x] `GET /api/items/v2/stop-list`
- [x] Retire v1 read
- [x] Schema/entity: `category`, `title`, `color`, `image_url`, `send_status_id` на `marketplace_items`
- [x] Migrations: copy (`1786013498713`) + verify (`1786013498714`)
- [x] Directory отдаёт поля listing из mp items
- [ ] Card sync dual-write: `category`/`title`/`color`/`imageUrl` (+ later `sendStatusId`) при create/update `MarketplaceItems`
- [ ] Autostatus → `orders_v2` + stocks по `marketplace_item_id`
- [ ] `send_status_id` write: PATCH + autostatus → `marketplace_items`
- [ ] v2 stop-list read: image/title/color/`sendStatus` с mp item (сейчас с `item`)

---

### Milestone 5 — Consolidation □

- [ ] 1 `items` на article + N mp items
- [ ] Sync без N строк `items`
- [ ] Directory без дублирования строк
- [ ] Yandex trash → `deleted_at`

---

### Milestone 6 — Cutover □

- [ ] Drop MP-колонок с `items` (вкл. `isArchive`, после dual-write)
- [ ] Legacy keys на stocks/orders_v2
- [ ] Retire `GET /api/stocks/current`
- [ ] Retire legacy `orders` reads

---

## Current Sprint

| # | Задача | Статус |
|---|--------|--------|
| 1 | Прогнать migrations `1786013498713` + `1786013498714` на env | □ |
| 2 | Dual-write `category/title/color/imageUrl` (+ при необходимости `sendStatusId`) в card sync | □ |
| 3 | Fix Yandex stocks findStock: `item.marketplaceItemId` в цикле `result` | □ |
| 4 | Autostatus → `orders_v2` | □ |
| 5 | PATCH stop-list → `marketplace_items.send_status_id` | □ |

---

## Known Blockers

| Блокер | Влияние |
|--------|---------|
| Card sync не пишет новые колонки в `MarketplaceItems` | После NOT NULL `category`/`title` — create может падать / данные разъедутся с verify |
| Autostatus → `orders` | Неверные автостатусы |
| PATCH / stop-list read `sendStatus` на `items` | До переноса write path |
| Yandex stocks findStock: `findMarketplaceItem.id` вне цикла `result` | Неверные upsert остатков Yandex |

---

## Как обновлять

Checklist → Current Sprint → `AI_CONTEXT` при решении → domain при смене модели.
