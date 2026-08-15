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
 ├── MarketplaceItem (WB)
 ├── MarketplaceItem (Озон)
 ├── MarketplaceItem (Ozon Tamov)   ← отдельный marketplaces.title; env ozonTamov*
 ├── MarketplaceItem (Yandex)
 └── MarketplaceItem (Yandex Tamov)   ← отдельный marketplaces.title; env yandexTamov*
        ├── Stocks
        └── OrdersV2
```

### Поля на `items` (DECISION, 2026-08-10)

Marketplace-independent: `id`, `article`, `articleOld`, `ownCategory`, classification/virality/planning, логистика/сроки (`consolidation`, `fullfillmentAcceptance`, `marketplaceAcceptance`, `buffer`, `daysDeliveryToRussia`, …), себестоимость/таможня (`costInRub`, `codeTNVED`, …), `ownImagesUrl`, `downloadCalculationMethod`, `wbCreatedAt`, audit.

**На `items_suppliers` (supplier-link, не item-level):** Phase 2 — `supplierMinimumOrder`, `boxNumber`, `costInYuan`, `costInYuanWhite`, `multiplicity`, `assembling`, `production`. Phase 3 (2026-08-13, dual-write) — `payment`, `dimensionsFact`, `dimensionsMasterBox`, `volume`. Колонки Phase 3 на `items` пока остаются.

**Остаются на `items`, drop после cutover (не на связи):** `volumeMasterBox`, `volumePerUnit`, `weightPerUnit`, `density`.

**Drop с `items` (M5, prod):** MP listing/identity/габариты/цены/`send_status_id`/`direction_id`.

**Legacy / product hide:** `isArchive` — **оставляем** (DECISION): скрытие товара в directory, даже если все mp listings удалены. Optional rename → `isDeleted` позже. Listing archive — только `marketplace_items.deleted_at`.

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
3. **Directory:** `marketplacesInfo[]` с mp + prices; filter `items.isArchive = false` + join `mp.deletedAt IS NULL` (два уровня).
4. **Stop-list / stocks:** listing archive через `mpItems.deletedAt IS NULL`.
5. **Prices:** schema + hourly crons на mp для WB и основного `Озон` (prod). Ozon Tamov price cron — gap.
6. **DB:** 1 item на article; `stocks`/`orders_v2` без `item_id`.
7. **Ozon Tamov:** cards/stocks/orders_v2/warehouses sync ✔; prices/trash/stop-list PATCH — gaps.
8. **Warehouses multi-cabinet (DECISION):** lookup/create всегда в scope `marketplaceId`. Ozon stocks: find по `title` + `marketplaceId`, без auto-create (нужен prior warehouses cron). Orders Ozon: `marketplaceInternalNumber` + `marketplaceId`.

### Характеристики товара (FACT, 2026-08-15)

Каноническая модель (marketplace-independent), schema-only:

```text
items → item_characteristics → characteristics
                                    ↓
                            characteristic_values (справочник)
```

| Таблица | Роль |
|---------|------|
| `characteristics` | Справочник характеристик; `type`: varchar (`string` / `number` / `boolean` / `enum`) |
| `characteristic_values` | Известные значения для характеристики (не обязательная ссылка для товара) |
| `item_characteristics` | Фактическое `value` характеристики у товара |

**DECISION:** `item_characteristics.value` — источник истины; `characteristic_value_id` **нет**.  
**DECISION:** у товара может быть **несколько** значений одной характеристики (размеры) — unique `(item_id, characteristic_id)` **не** вводим.  
Soft delete: `deleted_at` (nullable `timestamptz`), как у `marketplace_items` — фильтр `deleted_at IS NULL` в запросах.

Migration `1789330000000`: только CREATE tables + FK + indexes. **Без** seed «Размер» и **без** backfill из `items_sizes`.  
Runtime API / directory / sync — по-прежнему на `items_sizes` (перенос данных и API cutover — позже).

### Stop-list

| Endpoint / код | Статус |
|----------------|--------|
| `GET …/v2/stop-list` | ✔ mp |
| `PATCH …/stop-list` | ✔ mp-only |
| `updateItemSendStatus` | ✔ mp root |

### Directory

| Endpoint | Статус |
|----------|--------|
| `GET …/directory/list` | ✔ mp prices; `isArchive` (product) + `deleted_at` (listing) |
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

| Область | Статус |
|---------|--------|
| `items.isArchive` | **оставляем** — product hide; не путать с mp `deleted_at` |
| `items_sizes` | ✔ runtime source размеров; sync закомментирован; drop после cutover |
| `characteristics` / `characteristic_values` / `item_characteristics` | ✔ schema (`1789330000000`); данных / API ещё нет |
| Yandex / Ozon Tamov | stop-list PATCH, trash; Ozon Tamov ещё prices |
| Stocks API v1 | v1 by-date код удалён (2026-08-13); `GET /api/stocks/by-warehouses` — Sheets warehouse-level |
| Price pagination | API limit 1000 без cursor |

---

## Glossary

| Термин | Значение |
|--------|----------|
| **Listing archive** | `marketplace_items.deleted_at` |
| **Product hide** | `items.isArchive` (optional rename `isDeleted`) |
| **Send status** | `marketplace_items.send_status_id` |
| **Consolidation** | 1 article → 1 item; repoint mp/stocks/orders (M5 ✔) |
| **Calculation item** | `created_for_calculation = true`, отдельные строки |

---

## Правило для изменений

1. `AI_CONTEXT` + этот документ + roadmap.  
2. Исследовать `src/` и migrations.  
3. Plan → изменения → обновить docs.
