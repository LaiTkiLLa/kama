# Items ↔ MarketplaceItems

> Roadmap: [`../roadmap/items-marketplace-items-migration.md`](../roadmap/items-marketplace-items-migration.md).  
> Решения: [`../AI_CONTEXT.md`](../AI_CONTEXT.md).

---

## Зачем

**FACT:** listing-слой для stocks/orders через `marketplace_item_id`.  
**DECISION:** полный переход на MarketplaceItems; возврат к `item == listing` запрещён.

---

## Целевая архитектура

```text
Item (marketplace-independent, 1 на article)
 ├── MarketplaceItem (WB)   ← identity, listing, prices, send_status
 ├── MarketplaceItem (Ozon)
 ├── MarketplaceItem (Yandex)
 └── MarketplaceItem (Yandex Tamov)   ← отдельный marketplaces.title
        ├── Stocks
        └── OrdersV2
```

### Поля на `items` (DECISION, 2026-08-10)

Marketplace-independent: `id`, `article`, `articleOld`, `ownCategory`, classification/virality/planning, логистика/сроки, себестоимость/таможня, общие габариты/объём (`dimensionsFact`, `dimensionsMasterBox`, `volume`, …), `ownImagesUrl`, `downloadCalculationMethod`, `wbCreatedAt`, audit.

**Не на `items` (drop в `1786526400000`):** `category`, `title`, `barcode`, `sku`, `color`, `image_url`, `marketplace_identifier`, `marketplace_id`, MP-габариты/объёмы, `chrt_id`, `send_status_id`, `direction_id`, цены.

**Legacy (ещё в entity, cutover позже):** `isArchive` — directory filter; целевой архив — `marketplace_items.deleted_at`.

### Поля на `marketplace_items`

| Группа | Поля |
|--------|------|
| Identity | `marketplace_identifier`, `barcode`, `sku`, `marketplace_id`, `item_id` |
| Listing | `category`, `title`, `color`, `image_url` (nullable) |
| Prices | `price`, `discount`, `price_with_discount` |
| Ops | `send_status_id`, `dimensions`, `volume`, `chrt_id`, `deleted_at` |

---

## Текущий runtime (FACT, 2026-08-10)

1. **Entity/code:** `items` без MP-полей; все listing/price/status на mp.
2. **Card sync:** create/update пишет listing fields на mp; create ищет item по `article` (find-or-create).
3. **Directory:** один item на article в ответе; `marketplacesInfo[]` с mp-полями + prices.
4. **Stop-list v2:** read image/title/color/sendStatus с mp; PATCH/autostatus mp-only.
5. **Prices:** в БД на mp (`1786522800000`); crons закомментированы — переписать на mp.
6. **DB transition:** до прогона `1786526400000` в prod может оставаться несколько `items` на article и legacy columns в schema.

### Stop-list

| Endpoint / код | Статус |
|----------------|--------|
| `GET …/v2/stop-list` | ✔ mp: image/title/color/sendStatus |
| `PATCH …/stop-list` | ✔ mp-only, find by article + mp title |
| `updateItemSendStatus` | ✔ mp root, `deletedAt IS NULL` |

### Directory

| Endpoint | Статус |
|----------|--------|
| `GET …/directory/list` | ✔ `marketplacesInfo` с mp |
| `PATCH …/directory/info` | ✔ V2 → items (business) + mp (listing/calculation) |

---

## Milestones

| # | Статус |
|---|--------|
| 1. MarketplaceItems | ✔ |
| 2. Stocks | ✔ |
| 3. Orders | ✔ |
| 4. StopList | ✔ |
| 4b. listing + prices | ✔ |
| **5. Consolidation** | **◐ migration в репо** |
| 6. Cutover | □ |

---

## Legacy (что ещё убрать)

| Область | Legacy |
|---------|--------|
| `items.isArchive` filter | directory; заменить на mp `deleted_at` |
| Price crons | закомментированы, писали в items |
| `items_sizes` | sync закомментирован |
| Yandex trash | закомментирован; архив через mp `deleted_at` |
| Stocks API v1 | controller закомментирован |
| `stocks.item_id` / `orders_v2.item_id` | denorm keys, пока нужны |

---

## Glossary

| Термин | Значение |
|--------|----------|
| **Listing archive** | `marketplace_items.deleted_at` |
| **Send status** | `marketplace_items.send_status_id` |
| **Consolidation** | 1 article → 1 item; repoint mp/stocks/orders |
| **Calculation item** | `created_for_calculation = true`, отдельные строки |

---

## Правило для изменений

1. `AI_CONTEXT` + этот документ + roadmap.  
2. Исследовать `src/` и migrations.  
3. Plan → изменения → обновить docs.
