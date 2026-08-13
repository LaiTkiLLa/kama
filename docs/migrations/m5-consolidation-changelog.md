# M5 Consolidation — changelog

> Дата: 2026-08-10. Связано: [`../roadmap/items-marketplace-items-migration.md`](../roadmap/items-marketplace-items-migration.md), [`../domain/items-and-marketplace-items.md`](../domain/items-and-marketplace-items.md).

---

## Обзор

Milestone 5 завершает переход с модели «1 `items` row = 1 listing на МП» на **1 `items` row на article + N `marketplace_items`**. Состоит из двух миграций и изменений в коде.

| Миграция | Назначение | Статус |
|----------|------------|--------|
| `1786522800000-move-prices-to-marketplace-items` | Цены на mp; drop `change_prices_histories` и price-колонок с `items` | ✔ prod |
| `1786526400000-consolidate-items-and-drop-legacy` | Схлопывание items по article; dedup mp; drop legacy tables/columns | ✔ prod |

---

## Migration `1786522800000` — prices

1. Добавлены `price`, `discount`, `price_with_discount` на `marketplace_items`.
2. Backfill цен WB/Ozon с `items` по `(item_id, marketplace_id)`.
3. Drop таблицы `change_prices_histories`.
4. Drop колонок `price_wb`, `discount_wb`, `price_ozon`, `price_with_discount_ozon` с `items`.

**Fix (PostgreSQL):** в `UPDATE … FROM` нельзя использовать alias целевой таблицы в `JOIN`; backfill через `FROM items i, marketplaces m WHERE …`.

---

## Migration `1786526400000` — consolidation

### Шаг 1–3: схлопывание `items`

1. **Canonical item** на `article` — предпочитается строка WB (`marketplaces.title = 'WB'`), иначе минимальный `id`.
2. Merge marketplace-independent полей (`wb_created_at`, `own_images_url`) в canonical row.
3. Repoint дочерних таблиц: `marketplace_items`, `stocks`, `orders_v2`, `items_sizes`, `items_suppliers` → canonical `item_id`.
4. Dedup `items_sizes` / `items_suppliers` при конфликте ключей; удаление строк на old item.

### Шаг 4: dedup `marketplace_items`

После repoint `item_id` могут появиться **несколько mp rows на пару `(item_id, marketplace_id)`**.

**Keep = `MIN(id)`** per pair (не `keep.id < mi.id` — при 3+ дублях старый JOIN давал неоднозначный `keep_mp_id` и ломал repoint `stocks`).

Порядок:

1. Backfill `marketplace_item_id` на `stocks` / `orders_v2` где NULL (через `item_id + marketplace_id`).
2. Temp table `marketplace_items_duplicates`: все mp кроме `MIN(id)` per pair.
3. **Merge stocks:** суммирование `current_value`, `reserved`, `promised` с duplicate mp на keep mp (same `warehouse_id` + `DATE(created_at)`) через CTE `duplicate_totals`.
4. Delete merged duplicate stock rows.
5. Repoint оставшихся stocks / orders на `keep_mp_id`.
6. Safety delete stocks, всё ещё ссылающихся на duplicate mp.
7. Delete duplicate `marketplace_items` rows.

**Fix (PostgreSQL):** `UPDATE stocks keep_s … FROM … INNER JOIN stocks keep_s` — alias `keep_s` дважды; заменено на CTE + `UPDATE stocks AS keep_s FROM duplicate_totals dt`.

### Шаг 5–6: cleanup items + verification

- Delete duplicate `items` rows.
- Verify: 1 item per article, 1 mp per `(item_id, marketplace_id)`, no orphan mp.
- Unique index `UQ_items_article_not_calculation` on `items(article) WHERE created_for_calculation = false`.

### Шаг 7–10: drop legacy

| Объект | Действие |
|--------|----------|
| `orders` (legacy) | DROP TABLE |
| MP-колонки на `items` | DROP (category, title, barcode, sku, color, marketplace_identifier, marketplace_id, dimensions_*, volume_*, chrt_id, image_url, send_status_id, direction_id) |
| `directions` | DROP TABLE |
| `stocks.item_id` | DROP FK + indexes `idx_stocks_*` + column |
| `orders_v2.item_id` | DROP FK + column |

**Irreversible** — `down()` throws.

---

## Изменения в entity / коде

### `items`

Удалены MP-поля и цены из entity. Остаются business/logistics поля + `isArchive` (product hide, оставляем).

### `marketplace_items`

Добавлены `price`, `discount`, `priceWithDiscount`. Listing + `send_status_id` + archive (`deleted_at`).

### Удалённые entity / файлы

- `orders.entity.ts` (legacy `orders`)
- `directions.entity.ts`
- `change-prices-histories.entity.ts`

### `stocks`

- **Удалён `itemId`** — связь только через `marketplaceItemId` → `marketplace_items`.
- Crons (WB/Ozon/Yandex) пишут stocks без `itemId`.

### `orders_v2`

- **Удалён `itemId`** — связь только через `marketplaceItemId`.
- Sync crons создают orders без `itemId`.
- `getOrders` / `getOrdersV2` (dynamic orders) матчат result по `marketplaceItemId`, SQL stats группируют по `marketplace_item_id`.

### `items.service`

- Directory read: `marketplacesInfo` с mp (listing + prices).
- PATCH directory V2: business → `items`, listing → mp by marketplace title.
- Stop-list v2: image/title/color/sendStatus с mp.
- Card sync WB/Ozon/Yandex: find-or-create item by `article`; listing update по `{ id: mpItem.id }`.
- `updateItemSendStatus`: mp-only, `deletedAt IS NULL`.
- Price crons WB/Ozon → `MarketplaceItems` (hourly, `deletedAt IS NULL`; discount в %; WB `priceWithDiscount`).

### `GetDynamicOrders`

Добавлено поле `marketplaceItemId` (из `getStocks().mpItem`) для корректного join заказов после drop `orders_v2.item_id`.

---

## Что ещё не сделано (M6)

| Область | Статус |
|---------|--------|
| Directory / `items.isArchive` | **оставляем** (product hide); listing = `deleted_at` |
| `items_sizes` sync | закомментирован — next |
| Ozon Tamov | cards/stocks/orders/warehouses ✔; prices/trash/stop-list □ |
| Warehouses multi-cabinet | lookup всегда с `marketplaceId`; Ozon stocks без auto-create |
| Yandex Tamov gaps | stop-list PATCH, trash sync |
| Stocks API v1 | v1 by-date код удалён (2026-08-13); Sheets: `GET /api/stocks/by-warehouses` |
| Price crons pagination | optional, limit 1000 |

---

## Порядок прогона на env

1. `1786522800000-move-prices-to-marketplace-items`
2. Deploy код с entity без MP-полей на `items` и без `itemId` на stocks/orders_v2
3. `1786526400000-consolidate-items-and-drop-legacy`

Без шага 3 entity и schema рассинхронизированы (код ожидает колонки, которых ещё нет в БД, или наоборот).
