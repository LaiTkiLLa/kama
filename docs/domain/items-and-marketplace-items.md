# Items ↔ MarketplaceItems

> Roadmap: [`../roadmap/items-marketplace-items-migration.md`](../roadmap/items-marketplace-items-migration.md).  
> Решения: [`../AI_CONTEXT.md`](../AI_CONTEXT.md).  
> Changelog M5: [`../migrations/m5-consolidation-changelog.md`](../migrations/m5-consolidation-changelog.md).

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

**Drop с `items` (M5, prod):** MP listing/identity/габариты/цены/`send_status_id`/`direction_id`.

**Legacy (M6):** `isArchive` — ещё в directory filter; целевой архив — `marketplace_items.deleted_at`.

### Поля на `marketplace_items`

| Группа | Поля |
|--------|------|
| Identity | `marketplace_identifier`, `barcode`, `sku`, `marketplace_id`, `item_id` |
| Listing | `category`, `title`, `color`, `image_url` (nullable) |
| Prices | `price`, `discount` (**%**), `price_with_discount` |
| Ops | `send_status_id`, `dimensions`, `volume`, `chrt_id`, `deleted_at` |

**Prices sync (FACT):** WB cron пишет `price` / `discount` / `priceWithDiscount` (`discountedPrice`). Ozon — `price` / `priceWithDiscount` (`marketing_seller_price`) / `discount` = % от разницы price − marketing. Только `deletedAt IS NULL`.

---

## Текущий runtime (FACT, 2026-08-10)

1. **Entity/code:** `items` без MP-полей; listing/price/status на mp.
2. **Card sync:** find-or-create item by `article`; listing на mp по `{ id }`.
3. **Directory:** `marketplacesInfo[]` с mp + prices; filter ещё `items.isArchive = false` (+ join `mp.deletedAt IS NULL`).
4. **Stop-list / stocks:** archive через `mpItems.deletedAt IS NULL`.
5. **Prices:** schema + hourly crons на mp (prod).
6. **DB:** 1 item на article; `stocks`/`orders_v2` без `item_id`.

### Stop-list

| Endpoint / код | Статус |
|----------------|--------|
| `GET …/v2/stop-list` | ✔ mp |
| `PATCH …/stop-list` | ✔ mp-only |
| `updateItemSendStatus` | ✔ mp root |

### Directory

| Endpoint | Статус |
|----------|--------|
| `GET …/directory/list` | ✔ mp prices; **legacy `isArchive` filter** |
| `PATCH …/directory/info` | ✔ V2 |

---

## Milestones

| # | Статус |
|---|--------|
| 1–4b | ✔ |
| **5. Consolidation** | **✔ prod** |
| **6. Cutover** | **□ next** |

---

## Legacy (M6)

| Область | Legacy |
|---------|--------|
| `items.isArchive` | directory filter; заменить семантикой mp `deleted_at` |
| `items_sizes` | sync закомментирован; redesign |
| Yandex trash | закомментирован; архив через mp `deleted_at` |
| Stocks API v1 | controller закомментирован |
| Price pagination | API limit 1000 без cursor |

---

## Glossary

| Термин | Значение |
|--------|----------|
| **Listing archive** | `marketplace_items.deleted_at` |
| **Send status** | `marketplace_items.send_status_id` |
| **Consolidation** | 1 article → 1 item; repoint mp/stocks/orders (M5 ✔) |
| **Calculation item** | `created_for_calculation = true`, отдельные строки |

---

## Правило для изменений

1. `AI_CONTEXT` + этот документ + roadmap.  
2. Исследовать `src/` и migrations.  
3. Plan → изменения → обновить docs.
