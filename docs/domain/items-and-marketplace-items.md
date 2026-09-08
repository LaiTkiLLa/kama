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

Marketplace-independent: `id`, `article`, `articleOld`, `ownCategory`, classification/virality, логистика/сроки (`consolidation`, `fullfillmentAcceptance`, `marketplaceAcceptance`, `buffer`, `daysDeliveryToRussia`, `transportType`, `deliveryMethod`), себестоимость/таможня (`costInRub`, `codeTNVED`, …), `downloadCalculationMethod`, `wbCreatedAt`, audit.

**На `items_suppliers` (supplier-link, не item-level):** Phase 2 — `supplierMinimumOrder`, `boxNumber`, `costInYuan`, `costInYuanWhite`, `multiplicity`, `assembling`, `production`. Phase 3 — `payment`, `dimensionsFact`, `dimensionsMasterBox`, `volume`. `ownImagesUrl` (`1789460000000`; backfill на все строки связи, drop с `items`). Dual-write на `items` **снят** (`1789370000000`). **Phase 4 (`1789440000000`):** nullable `item_characteristic_id` (размер «Размер» → FK `item_characteristics`); `deleted_at`; unique partial indexes — без размеров одна строка на `(item_id, supplier_id)`, с размерами — одна на `(item_id, supplier_id, item_characteristic_id)`.

**Drop с `items` (`1789370000000`):** Phase 3 (`payment`, `dimensions_fact`, `dimensions_master_box`, `volume`); устаревшие габариты (`volume_master_box`, `volume_per_unit`, `weight_per_unit`, `density`); планирование (`replenishment_period`, `remaining_balance`).

**Drop с `items` (M5, prod):** MP listing/identity/габариты/цены/`send_status_id`/`direction_id`.

**Legacy / product hide:** `isArchive` — **оставляем** (DECISION): скрытие товара в directory, даже если все mp listings удалены. Optional rename → `isDeleted` позже. Listing archive — только `marketplace_items.deleted_at`.

### Поля на `marketplace_items`

| Группа   | Поля                                                                    |
| -------- | ----------------------------------------------------------------------- |
| Identity | `marketplace_identifier`, `barcode`, `sku`, `marketplace_id`, `item_id` |
| Listing  | `category`, `title`, `color`, `image_url` (nullable)                    |
| Prices   | `price`, `discount` (**%**), `price_with_discount`                      |
| Ops      | `send_status_id`, `dimensions`, `volume`, `chrt_id`, `deleted_at`       |

**Prices sync (FACT):** WB cron пишет `price` / `discount` / `priceWithDiscount` (`discountedPrice`). Ozon (оба кабинета) — `price` / `priceWithDiscount` (`marketing_seller_price`) / `discount` = % от разницы price − marketing. Только `deletedAt IS NULL`.

---

## Текущий runtime (FACT, 2026-08-10)

1. **Entity/code:** `items` без MP-полей; listing/price/status на mp.
2. **Card sync:** find-or-create item by `article`; listing lookup по `(marketplace_identifier, marketplace_id)`, update по `{ id }`. **Yandex:** identifier = `marketSku`; смена mapping при том же `offerId` создаёт второй active listing (fix sync ещё нет).
3. **Directory:** `marketplacesInfo[]` с mp + prices; filter `items.isArchive = false` + join `mp.deletedAt IS NULL` (два уровня).
4. **Stop-list / stocks:** listing archive через `mpItems.deletedAt IS NULL`.
5. **Prices:** schema + hourly crons на mp для WB, `Озон` и **Ozon Tamov** (First/Second).
6. **DB:** 1 item на article; `stocks`/`orders_v2` без `item_id`.
7. **Ozon Tamov:** cards/stocks/orders_v2/warehouses/prices/trash sync ✔; stop-list/directory PATCH ✔.
8. **Warehouses multi-cabinet (DECISION):** lookup/create всегда в scope `marketplaceId`. Ozon FBO stocks (`getOzonStocks`): find по `title` + `marketplaceId`, без auto-create (нужен prior warehouses cron). Ozon FBS own stocks (`getOzonOwnStocks`, пока только кабинет `Озон`): find по `marketplaceInternalNumber` + `marketplaceId` среди `type=FBS`. Orders Ozon FBO: `analytics_data.warehouse_id`; FBS: `delivery_method.warehouse_id` — оба lookup `marketplaceInternalNumber` + `marketplaceId`.
9. **Warehouse delete (FACT, 2026-08-24):** hard-delete склада с существующими `stocks`/`orders_v2` → ошибка FK (`RESTRICT`, `1789430000000`). Soft-delete = `warehouses.deleted_at`.
10. **Ozon warehouses cron (FACT, 2026-08-24):** запрос только `warehouse_types: ['FULL_FILLMENT']`.

**Ozon multi-cabinet crons (FACT, 2026-08-15):** паттерн как у cards — wrapper First/Second + shared method `(token, clientId, mpTitle)`:

| Cron                            | Основной (`Озон`, `ozon*`)   | Tamov (`Ozon Tamov`, `ozonTamov*`) |
| ------------------------------- | ---------------------------- | ---------------------------------- |
| Prices                          | `updateOzonItemsPricesFirst` | `updateOzonItemsPricesSecond`      |
| Trash (ARCHIVED → `deleted_at`) | `getOzonTrashItemsFirst`     | `getOzonTrashItemsSecond`          |
| Stocks FBO                      | `getOzonStocksFirst`         | `getOzonStocksSecond`              |
| Stocks FBS own                  | `getOzonOwnStocksFirst`      | □ ещё нет                          |
| Orders FBO                      | `getOrdersOzonFirst`         | `getOrdersOzonSecond`              |
| Orders FBS                      | `getOrdersOzonFbsFirst`      | `getOrdersOzonFbsSecond`           |

Обновление всегда scoped by `marketplaceId` найденного `marketplaces.title`.

### Характеристики товара (FACT, 2026-08-15)

Каноническая модель (marketplace-independent), schema-only:

```text
items → item_characteristics → characteristics
                                    ↓
                            characteristic_values (справочник)
```

| Таблица                 | Роль                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `characteristics`       | Справочник характеристик; `type`: varchar (`string` / `number` / `boolean` / `enum`) |
| `characteristic_values` | Известные значения для характеристики (не обязательная ссылка для товара)            |
| `item_characteristics`  | Фактическое `value` характеристики у товара                                          |

**DECISION:** `item_characteristics.value` — источник истины; `characteristic_value_id` **нет**.  
**DECISION:** у товара может быть **несколько** значений одной характеристики (размеры) — unique `(item_id, characteristic_id)` **не** вводим.  
Soft delete: `deleted_at` (nullable `timestamptz`), как у `marketplace_items` — фильтр `deleted_at IS NULL` в запросах.

Migration `1789330000000`: только CREATE tables + FK + indexes.  
**FACT (2026-08-15):** legacy `items_sizes` **dropped** (`1789350000000`). Runtime sizes — `marketplace_item_sizes`.

**Backfill размеров (FACT, 2026-08-17):** `1789360000000` + WB sync → `item_characteristics` (характеристика `Размер`, `type = string`):

| Условие WB `techSize` (`marketplace_item_sizes.name`) | `item_characteristics` |
|-------------------------------------------------------|------------------------|
| `'0'` (one-size)                                      | не создаём строк (нет вариаций) |
| иначе                                                 | одна строка на вариацию; `value` = `wbSize` или `techSize` |

Источник backfill: активные `marketplace_item_sizes` всех listings; при дубле — приоритет WB.

### Marketplace-характеристики (FACT, 2026-08-15)

Отдельный listing-слой (не смешивать с каноническими `characteristics` / `item_characteristics`):

```text
characteristics
       │
       ▼
marketplace_characteristic_mappings
       │
       ▼
marketplace_characteristics
       │
       ▼
marketplace_item_characteristics
       ▲
       │
marketplace_items
       │
       ▼
marketplace_item_sizes
```

| Таблица                               | Роль                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `marketplace_characteristics`         | Описание характеристики в терминах МП; unique `(marketplace_id, marketplace_characteristic_id)` среди активных |
| `marketplace_item_characteristics`    | Фактические значения на listing; одно значение = одна строка; MP-specific id в `metadata` jsonb                |
| `marketplace_item_sizes`              | Размеры listing (не характеристики); `marketplace_size_id` scoped by `marketplace_item_id`                     |
| `marketplace_characteristic_mappings` | Связь `characteristics.id` ↔ `marketplace_characteristics.id` (по PK, не по name)                             |

**DECISION:** mapping только по внутренним PK, не по названию.  
**DECISION:** размеры МП хранятся отдельно от характеристик.  
**DECISION:** `marketplace_characteristic_id` в mappings / item_characteristics — FK на `marketplace_characteristics.id`, не на внешний ID WB/Ozon.

Migration `1789340000000`: только CREATE tables + FK + indexes. **Без** seed mappings.

**WB sizes sync (FACT, 2026-08-15):** `getWbItems` пишет в `marketplace_item_sizes`:

| Поле                  | Источник WB                              |
| --------------------- | ---------------------------------------- |
| `marketplace_size_id` | `sizes[].chrtID` (string)                |
| `name`                | `sizes[].techSize`                       |
| `value`               | `sizes[].wbSize`                         |
| `metadata.skus`       | `sizes[].skus` (массив баркодов целиком) |

**DECISION:** `skus` не выносить в отдельную колонку и не схлопывать в один barcode. WB API допускает несколько баркодов на один размер (партии); на практике чаще 1 элемент, но храним массив в `metadata`. Listing-level `marketplace_items.barcode` / `chrt_id` по-прежнему берутся из `sizes[0]` (как раньше). Soft-delete исчезнувших размеров и sync характеристик — ещё нет.

**Directory API (FACT, 2026-08-15):** `GET …/directory/list` — поле `wbSizes: string[]` заменено на `marketPlaceItemsSizes[]`:

```text
{ size, value, chrtId, skus[] }
```

Источник: join `marketplace_items` → `marketplace_item_sizes` (`deleted_at IS NULL`), flatMap по всем активным listings товара.

### Stop-list

| Endpoint / код         | Статус     |
| ---------------------- | ---------- |
| `GET …/v2/stop-list`   | ✔ mp      |
| `PATCH …/stop-list`    | ✔ mp-only |
| `updateItemSendStatus` | ✔ mp root |

### Directory

| Endpoint                 | Статус                                                       |
| ------------------------ | ------------------------------------------------------------ |
| `GET …/directory/list`   | ✔ mp prices; `isArchive` (product) + `deleted_at` (listing) |
| `PATCH …/directory/info` | ✔ V2                                                        |

---

## Milestones

| #                    | Статус      |
| -------------------- | ----------- |
| 1–4b                 | ✔          |
| **5. Consolidation** | **✔ prod** |
| **6. Cutover**       | **□ next**  |

---

## Legacy (M6)

| Область                                                              | Статус                                                                                                                |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `items.isArchive`                                                    | **оставляем** — product hide; не путать с mp `deleted_at`                                                             |
| `items_sizes`                                                        | ✖ dropped (`1789350000000`); замена — `marketplace_item_sizes`                                                       |
| `characteristics` / `characteristic_values` / `item_characteristics` | ✔ schema + backfill `Размер` из `marketplace_item_sizes` (`1789360000000`) |
| marketplace characteristics / sizes / mappings                       | ✔ schema (`1789340000000`); WB sizes sync ✔; directory `marketPlaceItemsSizes` ✔; characteristics / Ozon — ещё нет |
| Yandex / Ozon Tamov | Ozon Tamov: prices+trash+stop-list+directory PATCH ✔. Yandex Tamov: stop-list+trash ✔ |
| Stocks API | ✔ `by-warehouses` для Sheets; by-date/v1 **не возвращаем** (DECISION 2026-08-15) |
| Warehouse FK | ✔ RESTRICT `stocks`/`orders_v2` → `warehouses` (`1789430000000`) |
| Yandex duplicate listings | cleanup script ✔; unique index / fix `getYandexItems` □ |
| Stocks API | ✔ `by-warehouses` для Sheets; by-date/v1 **не возвращаем** (DECISION 2026-08-15) |
| Price pagination | ✖ не нужна — ≤~400 SKU/кабинет (DECISION 2026-08-15) |

---

## Glossary

| Термин               | Значение                                             |
| -------------------- | ---------------------------------------------------- |
| **Listing archive**  | `marketplace_items.deleted_at`                       |
| **Product hide**     | `items.isArchive` (optional rename `isDeleted`)      |
| **Send status**      | `marketplace_items.send_status_id`                   |
| **Consolidation**    | 1 article → 1 item; repoint mp/stocks/orders (M5 ✔) |
| **Calculation item** | `created_for_calculation = true`, отдельные строки   |

---

## Правило для изменений

1. `AI_CONTEXT` + этот документ + roadmap.
2. Исследовать `src/` и migrations.
3. Plan → изменения → обновить docs.
