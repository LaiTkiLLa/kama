# AI_CONTEXT — оперативная память проекта

> Не документация «как устроено», а **что уже решено**, что нельзя ломать и что обсуждали.  
> Обновляет **разработчик**. AI может предложить дополнение, но не менять решения без подтверждения.

При противоречии с кодом — верить коду, затем обновить этот файл.

---

## Как использовать

| Аудитория | Когда читать |
|-----------|--------------|
| AI Agent | В начале любой нетривиальной задачи — **до** правок |
| Разработчик | После продуктового/архитектурного решения — зафиксировать здесь |

Связанные документы: [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md), [`domain/items-and-marketplace-items.md`](domain/items-and-marketplace-items.md), [`roadmap/items-marketplace-items-migration.md`](roadmap/items-marketplace-items-migration.md).

---

## Принятые решения

### MarketplaceItems — модель данных

**Решение:** `items` (товар) + `marketplace_items` (listing). Возврат к `item == listing` **запрещён**.

**Целевые поля `items`:** marketplace-independent (без `sendStatusId`, `category`, `imageUrl`, `color` как MP-полей).  
`title` остаётся на `items` **и** копируется на `marketplace_items` (listing title) — dual на переходном этапе.

**Целевые поля / перенос на `marketplace_items`:**  
`category`, `title`, `color`, `imageUrl`, `send_status_id` (+ уже: identifier, barcode, sku, dimensions, volume, chrt, …).  
Цены и `wbCreatedAt` — **пока не трогаем**. Колонки на `items` **не удаляем**, пока dual-write не закрыт.

**Архив listing’а:** `marketplace_items.deleted_at` (не `isArchive`).

---

### Stop-list API

**FACT:** read только `GET /api/items/v2/stop-list`.  
**FACT:** `GET /api/items/stop-list` (v1) отключён.  
**FACT:** `PATCH /api/items/stop-list` и autostatus всё ещё пишут / читают `items.send_status_id` и (autostatus) legacy `orders`.

---

### Google Sheets

**FACT:** единственный UI. Frontend в репо не создавать. API — GAS-compatible.

---

## Что считается завершённым (FACT, 2026-08-06)

| Область | Статус |
|---------|--------|
| M1: таблица + dual-write identity | ✔ |
| M2: stocks → lookup/uniqueness по `marketplace_item_id` | ✔ *(WB/Ozon/Yandex create; Yandex findStock — см. Known issues)* |
| M3: orders_v2 find/create по `marketplace_item_id` | ✔ |
| Stop-list read v1 retired | ✔ |
| Schema: колонки `category/title/color/image_url/send_status_id` на entity `MarketplaceItems` | ✔ |
| Migrations copy + verify (`1786013498713`, `1786013498714`) | ✔ написаны; прогон на env — **NEEDS VERIFICATION** |
| Directory `marketplacesInfo` читает category/barcode/image/color/itemTitle с mp items | ✔ |
| Dual-write **новых** полей в card sync (WB/Ozon/Yandex create/update `MarketplaceItems`) | □ **ещё нет** — sync пишет identity/dimensions; category/title/color/imageUrl — в `items` |
| `send_status` write path / autostatus на mp item | □ |
| Stop-list v2 read image/title/color/sendStatus | □ всё ещё с `item`, не с `mpItems` |
| Удаление колонок с `items` | □ не начинать |

---

## Known issues (код, не чинить без задачи)

| Issue | Где | Суть |
|-------|-----|------|
| Yandex stocks findStock | `stocks.service.ts` `getYandexStocks` | В цикле по `result` в lookup уходит `findMarketplaceItem.id` (переменная **внешнего** цикла), а не `item.marketplaceItemId` — upsert может бить не ту строку |
| Card sync dual-write gap | `items.service.ts` create/update `MarketplaceItems` | Нет `category`/`title`/`color`/`imageUrl` на mp item; после NOT NULL create может падать / Directory читает stale |
| Stop-list v2 selects | `getItemStopsListV2` | `imageUrl`/`title`/`color`/`sendStatus` с `item`, хотя колонки уже на entity mp item |
| `marketplaceItemId ?? 0` | stocks/orders sync | Убран в активных путях; не возвращать |

---

## Что считается экспериментом

| Элемент | Примечание |
|---------|------------|
| `low_days_stocks` | без wiring |
| Ozon Second | cron закомментированы |
| `getItemsList` / `getItemStopsList` v1 | закомментированы |

---

## Отвергнутые идеи

| Идея | Почему |
|------|--------|
| `item == marketplace listing` | нормализация |
| Frontend в репо | Sheets + GAS |
| Новые MP-поля на `items` | только `marketplace_items` |
| `isArchive` как archive flag | `deleted_at` |
| `send_status_id` на shared item | per listing |
| Удалять колонки с `items` до закрытия dual-write | cutover только в M6 |

---

## Не менять без явного плана

| Что | Почему |
|-----|--------|
| Dual-write identity на `items` + `marketplace_items` | sync ещё зависит |
| Legacy keys на stocks/orders_v2 | до M6 |
| Legacy `orders` table | autostatus читает |
| Stocks API v1 | GAS |
| Цены / `wb_created_at` перенос | отложено продуктом |

---

## История обсуждений

| Дата | Тема | Итог |
|------|------|------|
| 2026-08-06 | AI-ready docs | база |
| 2026-08-06 | UI / поля / stop-list v1 | Sheets; split полей; v2-only read |
| 2026-08-06 | Миграции copy+verify | color/category/image_url/title/send_status_id → mp_items, без drop |
| 2026-08-06 | Stocks/Orders mp-centric | lookup по MarketplaceItems; `?? 0` убран; код перенесён из другой IDE |
| 2026-08-06 | Directory | marketplacesInfo расширен полями с mp items |
| 2026-08-06 | Re-check after IDE port | dual-write gap и Yandex findStock bug подтверждены; card sync новых полей ещё нет |
