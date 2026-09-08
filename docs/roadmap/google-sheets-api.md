# Roadmap: Google Sheets API

> Отдельный roadmap. **Не смешивать** с [`items-marketplace-items-migration.md`](items-marketplace-items-migration.md).  
> Миграция `items → marketplace_items` не закрывается и не продолжается в рамках этого направления.  
> Метки: **FACT** / **ASSUMPTION** / **NEEDS VERIFICATION** / **NEEDS DECISION**.

Связанные: [`../AI_CONTEXT.md`](../AI_CONTEXT.md), [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md), [`../domain/items-and-marketplace-items.md`](../domain/items-and-marketplace-items.md).

Последнее обновление: 2026-08-13.

---

## Goal

Подготовить стабильный REST-слой между **Google Sheets / GAS** и PostgreSQL, чтобы сотрудники получали данные по:

- товарам;
- поставщикам;
- связи Supplier ↔ Item;
- контрагентам;
- заказам (по маркетплейсам);
- остаткам (по маркетплейсам).

Sheets **не должна** знать схему БД. API отдаёт стабильные response DTO, с фильтрацией и (где нужно) пагинацией / инкрементальной загрузкой.

На этом этапе: **исследование + проектирование**. Код endpoints / migrations / entities **не пишем**, пока не закрыты Architecture Decisions.

---

## Current State

### Глобально (FACT)

| Факт | Источник |
|------|----------|
| UI = Google Sheets + GAS; frontend в репо нет | `AI_CONTEXT`, `PROJECT_CONTEXT` |
| Global prefix: `/api` | `src/main.ts` |
| Auth: заголовок `api-key`; проверка **неполная** (на части маршрутов только объявлен, без guard) | controllers + `PROJECT_CONTEXT` |
| Active order store: `orders_v2`; legacy `orders` **DROP** (M5 prod) | migration `1786526400000`, domain docs |
| Stocks / orders_v2 → `marketplace_item_id` (без `item_id`) | entities + AI_CONTEXT |
| M5 consolidation ✔; M6 Cutover отдельно (не этот roadmap) | AI_CONTEXT |

### Entities по доменам (FACT)

| Domain | Entity / table | Примечание |
|--------|----------------|------------|
| Items | `items` | marketplace-independent; `isArchive` = product hide; `title` / `category` (product-level, backfill WB — `1789209600000`) |
| MarketplaceItems | `marketplace_items` | listing, prices, `send_status_id`, `deleted_at` |
| Suppliers | `suppliers` (+ `banks` via `bank_id`) | справочник; поле `contract` — `1789212000000` |
| Supplier ↔ Item | `items_suppliers` | M2M; supplier-fields на связи; read/write directory + ERP — **`items_suppliers`** (Phase 2 ✔ `1789310000000`) |
| Counterparties | `contaminants` (+ `banks`) | в docs/UI — «контрагенты»; связь с suppliers **нет** |
| Orders | `orders_v2` | source of truth; legacy `orders` удалён |
| Stocks | `stocks` | дневные снимки; FK `marketplace_item_id`, `warehouse_id`, `marketplace_id` |
| Supporting | `marketplaces`, `warehouses`, `statuses`, `items_sizes`, `low_days_stocks` | `warehouses` — справочник для Sheets (`GET /api/info/warehouses`) |

### Существующие HTTP endpoints (FACT)

| Method | Path | Модуль | Назначение |
|--------|------|--------|------------|
| GET | `/api/info/statuses` | info | статусы по `type` |
| GET | `/api/info/suppliers` | info | список поставщиков (+ nested bank) |
| PATCH | `/api/info/suppliers/:id` | info | частичное обновление поставщика |
| GET | `/api/info/warehouses` | info | справочник складов + nested marketplace |
| GET | `/api/info/contaminants` | info | список контрагентов + bank |
| PATCH | `/api/info/contaminants/:id` | info | частичное обновление контрагента |
| GET | `/api/items/directory/list` | items | справочник товаров + `marketplacesInfo[]` |
| GET | `/api/items/erp/list` | items | ERP/Sheets: items + listing image/color/barcode/`chrtId` (marketplace query, default WB) |
| GET | `/api/items/erp/suppliers-items/list` | items | ERP/Sheets: связи item↔supplier + size + `skus` из `marketplace_item_sizes` (marketplace query, default WB) |
| PATCH | `/api/items/erp/suppliers-items/list` | items | батч-обновление supplier-fields + optional `supplier` (title → `supplierId`); `itemSupplierId` = PK |
| PATCH | `/api/items/erp/logistics-info` | items | батч-обновление логистики (`body.items[]`, `id` = PK `items`) |
| PATCH | `/api/items/directory/info` | items | обновление directory (в т.ч. один supplier по title) |
| GET | `/api/items/v2/stop-list` | items | stop-list (операционный) |
| PATCH | `/api/items/stop-list` | items | обновление send status |
| POST | `/api/items` | items | тестовый item (не для Sheets prod) |
| POST | `/api/items/create-on-marketplaces` | items | новый товар в БД + outbox-заявки на все кабинеты; если article уже есть — 400 |
| GET | `/api/orders/dynamic` | orders | **агрегированная** динамика заказов + остатки |
| GET | `/api/stocks/v2/current` | stocks | **агрегированные** текущие остатки (сегодня) |
| GET | `/api/stocks/by-warehouses` | stocks | **warehouse-level** остатки на сегодня (Sheets) |
| ~~GET~~ | `/api/stocks/current` | stocks | **удалён** (бывший v1, был закомментирован) |
| ~~GET~~ | `/api/stocks/by-date` | stocks | **удалён** (бывший v1, был закомментирован) |

**FACT (2026-08-18):** `PATCH /api/info/suppliers/:id` и `PATCH /api/info/contaminants/:id` принимают nested `bank` object; сервис резолвит/создаёт запись в `banks` и обновляет `bankId`.

### Cron / sync (FACT, кратко)

| Область | Сервис | Что пишет |
|---------|--------|-----------|
| Cards WB/Ozon/Yandex (+ Tamov где есть) | `ItemsService` | `items` + `marketplace_items` |
| Prices WB / основной Озон | `ItemsService` | `marketplace_items` prices |
| Autostatus | `ItemsService.updateItemSendStatus` | `marketplace_items.send_status_id` |
| Stocks WB/Ozon/Yandex (+ Tamov) | `StocksService` | `stocks` (день) |
| Orders WB/Ozon/Yandex (+ Tamov) | `OrdersService` | `orders_v2` |
| Warehouses | `InfoService` | `warehouses` |

### Карта существующих API для Sheets

| Domain | Existing endpoint | Source tables | Можно использовать | Нужно изменить |
|--------|-------------------|---------------|--------------------|----------------|
| Items | `GET /api/items/directory/list` | `items`, `marketplace_items`, `marketplaces`, `items_suppliers`, `suppliers` | Частично: полный каталог + mp nested | Нет pagination; один `supplierTitle`; нет `updatedAt`/incremental; нет archived; `send_status` не отдаётся |
| Items | `GET /api/items/erp/list` | `items` + `marketplace_items` выбранного MP | **Да** для ERP/Sheets (~400 items) | Пока без incremental; listing fields зависят от `marketplace` (default WB) |
| Items | `PATCH /api/items/erp/logistics-info` | `items` | Да для ERP logistics write-back | батч `items[]`; `id` = PK; поля на `items` (не mp listing) |
| Items | `GET /api/items/erp/suppliers-items/list` | `items_suppliers`, `items`, `suppliers`, `marketplace_item_sizes` | **Да** для таблицы item↔supplier | Одна строка на `(supplier, size)`; `skus` с выбранного MP (default WB) |
| Items | `PATCH /api/items/erp/suppliers-items/list` | `items_suppliers` | **Да** для ERP/Sheets write-back supplier-fields | батч `items[]`; `itemSupplierId` = PK; optional `supplier` (title); `ownImagesUrl` в PATCH; `volume` в PATCH DTO **нет** (есть в GET) |
| Items | `GET /api/items/v2/stop-list` | `marketplace_items`, `items`, stocks/orders aggregates | Нет как общий каталог | Операционный stop-list |
| Items | `PATCH /api/items/directory/info` | `items`, `marketplace_items`, `items_suppliers` | Write-back из Sheets | Supplier-fields на **`items_suppliers`**; link — `supplierId` + fields |
| Suppliers | `GET /api/info/suppliers` | `suppliers`, `banks` | Да для полного справочника | Нет audit timestamps в API |
| Suppliers | `PATCH /api/info/suppliers/:id` | `suppliers`, `banks` | Да (partial update) | nested `bank` ищется по полям; при отсутствии создаётся новая запись в `banks` |
| Supplier↔Item | `GET /api/items/erp/suppliers-items/list` | `items_suppliers`, `items`, `suppliers`, `marketplace_item_sizes` | **Да** для ERP/Sheets | Flat по size; `skus` с выбранного MP |
| Supplier↔Item | `PATCH /api/items/erp/suppliers-items/list` | `items_suppliers` | **Да** для ERP/Sheets write-back | supplier-fields + optional `supplier` (title → `supplierId`); size identity не меняется |
| Counterparties | `GET /api/info/contaminants` | `contaminants`, `banks` | Да для полного списка | Не фильтрует `deleted_at`; нет incremental |
| Counterparties | `PATCH /api/info/contaminants/:id` | `contaminants`, `banks` | Да (partial update) | nested `bank` ищется по полям; при отсутствии создаётся новая запись в `banks` |
| Orders | `GET /api/orders/dynamic` | `orders_v2` + stocks via service | Нет для «накопления заказов» — это analytics | Нужен raw/list export |
| Stocks | `GET /api/stocks/v2/current` | `marketplace_items`, `stocks`, `warehouses`, suppliers | Частично: snapshot «сегодня» по MP | Агрегат без warehouse rows |
| Stocks | `GET /api/stocks/by-warehouses` | `marketplace_items`, `stocks`, `warehouses` | **Да** для warehouse-level «сегодня» | Нет date/history; нет pagination; `excludeWarehouses` zero-out |
| Warehouses | `GET /api/info/warehouses` | `warehouses`, `marketplaces` | **Да** для справочника складов | Нет filter по MP; `id` = PK БД (см. mismatch со stocks) |
| MarketplaceItems | (через directory / erp / stop-list / stocks) | `marketplace_items` | Нет отдельного list API | **NEEDS DECISION**: отдельный endpoint vs nested в items |

---

## Required API

### Items

**Источник истины**

- Общие поля товара: `items` (FACT, domain doc).
- Marketplace-specific: `marketplace_items` (identity, listing, prices, `send_status_id`, `deleted_at`).

**Существует и подходит частично:** `GET /api/items/directory/list`.

**Существует для ERP/Sheets (FACT, 2026-08-11):** `GET /api/items/erp/list`.

Response ERP (FACT, 2026-08-13, logistics 2026-08-18):
- с `items`: `id`, `article`, `title`, `category`, `ownCategory`, `consolidation`, `fullfillmentAcceptance`, `marketplaceAcceptance`, `daysDeliveryToRussia`, `transportRateUsd`, `dutyPercentage`, `costCalculationType`, `calculationType`, `downloadCalculationMethod`, `transportType`, `deliveryMethod`
- с активного listing выбранного MP (`deletedAt IS NULL`): `image`, `color`, `barcode`, `chrtId`
- query: `marketplace` optional, default `'WB'` (`Озон` / `WB` / `Yandex` / `Ozon Tamov` / `Yandex Tamov`)
- filter: `isArchive = false`; optional `withTestArticles=false` → exclude `createdForCalculation`
- объём ~400 rows — pagination не требуется (**FACT**, владелец)

**PATCH `/api/items/erp/logistics-info` (FACT, 2026-08-18):** батч partial update логистики. Body `{ items: [{ id, …fields }] }`, `id` = PK `items`. Поля: `consolidation`, `daysDeliveryToRussia`, `fullfillmentAcceptance`, `marketplaceAcceptance`, `costCalculationType`, `downloadCalculationMethod`, `calculationType`, `transportType`, `deliveryMethod`. Новые колонки `transport_type` / `delivery_method` — миграция `1789390000000`. Directory PATCH эти два поля пока не пишет.

Response directory (FACT, текущий shape): item fields + `supplierTitle` (только `[0]`) + `marketplacesInfo[]` (`title`, dimensions, volume, sku, marketplaceIdentifier, category, barcode, image, color, itemTitle, price, discount, priceWithDiscount).

**Не хватает для полного Sheets-накопления (directory-уровень)**

- filter `updatedAt` / ids / incremental;
- все suppliers (не один title);
- опционально archived listings;
- `send_status` в directory.

**Предлагаемый новый / эволюция (проектирование)**

```text
GET /api/sheets/items
  или эволюция GET /api/items/directory/list (NEEDS DECISION: namespace)

Назначение: справочник товаров для Sheets (read model).

Источник: items + marketplace_items (deletedAt IS NULL по умолчанию) + marketplaces.

Фильтры: updatedSince?, ids?, isArchive?, withTestArticles?, marketplaceTitle?

Основные поля ответа (концепт):
  itemId, article, articleOld, ownCategory, classification, …
  logistics/cost fields с items (как в directory)
  listings[]: { marketplaceTitle, marketplaceItemId, sku, barcode,
                marketplaceIdentifier, category, title, color, imageUrl,
                price, discount, priceWithDiscount, sendStatusTitle?, deletedAt? }

Пагинация: да (limit/cursor или offset) — NEEDS DECISION формат.

Сортировка: itemId ASC (как сейчас) или updatedAt.

Особенности: не SELECT *; dual hide model (isArchive vs deleted_at);
  не ломать существующий directory, если GAS уже на нём (NEEDS DECISION).
```

### Suppliers

**Источник:** `suppliers`.

**Существует:** `GET /api/info/suppliers` — почти готов.

Поля entity (FACT, 2026-08-11): `id`, `title`, `contact`, `contract`, `paymentTerms`, `typeOfMutualSettlements`, `legalTitle`, `legalAddress`, `accRaschet`, `bankId` → nested `bank`, `reliabilityRating`, `warehouseAddress`, `responsibleEmployee`, `comment`, `creditLimit`, `canBeAbleToStoreInWarehouse`, `numberOfStorageDays`, `webSite`, `rank`, `createdAt`, `updatedAt`.

**Удалено:** `typeOfCalculation` (миграция `1789209600000`).
**Добавлено:** `contract` (миграция `1789212000000`).

**GET `/api/info/suppliers` (FACT):** отдаёт business fields + nested `bank`; без `createdAt`/`updatedAt`.

**PATCH `/api/info/suppliers/:id` (FACT):** partial update (`@IsOptional` на всех полях DTO). `bank` передаётся nested object (`title`, `accBik`, `accKorschet`, `address`, `swift`); сервис ищет существующий банк по полям или создаёт новый, затем пишет `bankId`.

```text
GET /api/info/suppliers
PATCH /api/info/suppliers/:id

Назначение: справочник + правка поставщиков для Sheets.

Источник: suppliers + banks (LEFT JOIN на read).

Фильтры: updatedSince? (опционально, поля пока не в API).

Поля: см. entity; timestamps в API — NEEDS DECISION.

Пагинация: не нужна (малый справочник).

Сортировка: id ASC (сейчас); rank — NEEDS DECISION для Sheets.

Особенности: `bank` в PATCH — nested object; при совпадении по всем полям используется существующий `banks`, иначе создаётся новый.
```

### Supplier ↔ Item

**Источник:** `items_suppliers` + join `items`, `suppliers`.

**Phase 2 (FACT, 2026-08-12):** supplier-fields только на связи:
`supplierMinimumOrder`, `boxNumber`, `costInYuan`, `costInYuanWhite`, `multiplicity`, `assembling`, `production` (nullable, без default).

**Phase 3 (FACT, 2026-08-13, dual-write):** на связь дополнительно:
`payment`, `dimensionsFact`, `dimensionsMasterBox`, `volume` (все nullable, без default; `payment` на `items` был NOT NULL DEFAULT 10).

**`ownImagesUrl` (FACT, 2026-09-08):** на `items_suppliers` (`1789460000000`); backfill на все строки связи по `item_id`; drop с `items`.

**Не на связи:** `volumeMasterBox`, `volumePerUnit`, `weightPerUnit`, `density`, `replenishmentPeriod`, `remainingBalance` — **dropped** с `items` (`1789370000000`). Directory/ERP list их не отдают.

Миграции:
- `1789300000000` — ADD колонки + initial backfill
- `1789310000000` — COALESCE backfill пропусков, `assembling`/`production` nullable без default, **DROP** колонок с `items`
- `1789320000000` — ADD `payment` / `dimensions_fact` / `dimensions_master_box` / `volume` + backfill из `items`; **колонки на `items` не drop**

**Orphans:** закрыты вручную — все items → «Системный поставщик».

**Размерность (FACT, Phase 4 — `1789440000000`):**
- `item_characteristic_id` NULL — товар без размерных вариаций (one-size / нет «Размер» в `item_characteristics`).
- `item_characteristic_id` NOT NULL — supplier-fields **на конкретный размер** (FK → `item_characteristics`).
- `deleted_at` — soft-delete строки связи (как у `item_characteristics`).
- Backfill: существующие строки для товаров с «Размер» разворачиваются в N копий (поля копируются).
- WB sync `syncItemSizeCharacteristics` → `syncItemsSupplierSizeRows` поддерживает строки при появлении/удалении размеров.

**Read/write (FACT):**
- `GET /api/items/directory/list` — supplier-fields + Phase 3 + `ownImagesUrl` с `items_suppliers[0]`
- `PATCH /api/items/directory/info` — supplier-link только на `items_suppliers` (legacy; dual-write на `items` **снят** `178937`). `ownImagesUrl` fan-out на все active `items_suppliers` товара. Per-size write — через ERP PATCH. Dead DTO planning/габариты (`planTime`, `volumePerUnit`, `density`, `replenishmentPeriod`, …) сняты; `whitelist` отбрасывает, если GAS ещё шлёт.
- `GET /api/items/erp/suppliers-items/list` — flat list: **одна строка на `(supplier-link, size)`**; `itemCharacteristicId` / `sizeValue` nullable; `skus` из `marketplace_item_sizes.metadata.skus` выбранного MP (query `marketplace`, default WB)
- `PATCH /api/items/erp/suppliers-items/list` — батч update по `itemSupplierId` (PK `items_suppliers`, только `deleted_at IS NULL`):
  - supplier-fields: `boxNumber`, `multiplicity`, `supplierMinimumOrder`, `costInYuan`, `costInYuanWhite`, `payment`, `production`, `assembling`, `dimensionsMasterBox`, `dimensionsFact`, `ownImagesUrl`
  - optional `supplier` (title из справочника) → резолв в `supplierId`; неизвестный title → `404`
  - не меняет `itemId` / `itemCharacteristicId`
  - `volume` в PATCH **не принимается** (поле остаётся на entity / в GET)
  - unique partial indexes: смена поставщика на уже занятую пару `(item, supplier[, size])` → DB unique error (явный `409` в коде пока нет)

**GET `/api/items/erp/suppliers-items/list` response:** `itemId`, `supplierId`, `itemSupplierId`, `itemCharacteristicId`, `sizeValue`, `skus[]`, `article`, `title`, `category`, `supplierTitle`, `supplierMinimumOrder`, `boxNumber`, `costInYuan`, `costInYuanWhite`, `multiplicity`, `assembling`, `production`, `payment`, `dimensionsFact`, `dimensionsMasterBox`, `volume`, `ownImagesUrl`.

Match `skus`: `sizeValue` ↔ `normalize(mpSize.value || mpSize.name)`; без размера — `name = '0'` (one-size) или первый size.

**PATCH `/api/items/erp/suppliers-items/list` body:** `{ items: [{ itemSupplierId, supplier?, supplierMinimumOrder?, boxNumber?, costInYuan?, costInYuanWhite?, multiplicity?, assembling?, production?, payment?, dimensionsFact?, dimensionsMasterBox?, ownImagesUrl? }] }` → `{ success: true }`.

`supplier` — title (`supplierTitle` из GET); если передан — резолвится в `supplierId`. Не найден → `404`. Несуществующий / soft-deleted `itemSupplierId` → `404`.

### Counterparties

**Источник:** `contaminants` (+ nested `banks`). В `PROJECT_CONTEXT` названы контрагентами.

Связи с `suppliers` / `items` в схеме **отсутствуют** (FACT).

**Существует:** `GET /api/info/contaminants`, `PATCH /api/info/contaminants/:id`.

Риски: `deletedAt` не фильтруется.

```text
GET /api/info/contaminants
PATCH /api/info/contaminants/:id
  и/или GET /api/sheets/counterparties (alias naming)

Назначение: справочник контрагентов.

Источник: contaminants LEFT JOIN banks.

Фильтры: includeDeleted? (default false), updatedSince?

Поля: как сейчас + `contract` + deletedAt? + bank nullable object.

Пагинация: вероятно не нужна — NEEDS VERIFICATION.

Особенности: naming Contaminants vs Counterparties — NEEDS DECISION для Sheets DTO.
```

### Orders

**Источник истины:** `orders_v2` (FACT). Legacy `orders` удалён на prod — не использовать и не оживлять.

**Существует:** `GET /api/orders/dynamic` — **не raw orders**: агрегаты за окна дней + текущие остатки. Подходит для операционной динамики, **не** для накопления строк заказов в Sheets.

Поля `orders_v2` (FACT): marketplace order ids/numbers, status, quantity, price/oldPrice/payout/discounts/commission, city/clusters, cancelReasonId, warehouseId, marketplaceId, marketplaceItemId, marketplaceCreatedAt, audit.

```text
GET /api/sheets/orders
  (или /api/orders/v2/list)

Назначение: выгрузка строк заказов в Sheets по МП.

Источник: orders_v2 + joins: marketplaces, warehouses, marketplace_items → items (article).

Фильтры (обязательные рекомендуемые):
  marketplace (WB | Озон | Yandex | Ozon Tamov | Yandex Tamov)
  from / to (marketplaceCreatedAt)
  optional: updatedSince, warehouseId, marketplaceItemIds

Основные поля ответа (концепт, не SELECT *):
  orderId, marketplaceTitle, marketplaceOrderIdentification,
  marketplaceOrderNumber, marketplaceOrderPostingNumber, status, quantity,
  price, oldPrice, payout, discountValue, discountPercent,
  commissionPercent, commissionValue, city, clusterFrom, clusterTo,
  warehouseTitle, article, sku, barcode, marketplaceItemId,
  marketplaceCreatedAt, updatedAt

Пагинация: обязательно (limit + cursor by id or marketplaceCreatedAt+id).

Сортировка: marketplaceCreatedAt ASC, id ASC (для incremental append).

Особенности: не менять модель orders; не путать с /orders/dynamic;
  timezone: marketplaceCreatedAt timestamptz (комментарий в entity: +3 для Москвы).
```

### Stocks

**Источник:** `stocks` (дневные снимки по warehouse × marketplace_item).

**Существует:** `GET /api/stocks/v2/current` — агрегат «сегодня» по listing (quantityFull / reserved / promised / wbOwnWarehouses), filter marketplace + suppliers.

**Существует (FACT, 2026-08-13):** `GET /api/stocks/by-warehouses` — warehouse-level snapshot «сегодня».

Response (FACT):
- listing: `id` (= `marketplace_items.id`), `itemId`, `article`, `chrtId`, `title`
- `stocks[]`: `warehouse.{id, title, type}`, `inWayToClient` (= reserved), `inWayFromClient` (= promised), `quantityFull` (= currentValue)
- filter: `marketplace` required; `deletedAt IS NULL`; `isArchive = false`; `createdForCalculation = false`; stocks только за сегодня
- Tamov кабинеты в DTO есть
- pagination нет; history/date filter нет

**FACT:** `warehouse.id` в этом ответе = `warehouses.marketplace_internal_number` (string).  
`GET /api/info/warehouses` отдаёт `id` = PK БД (number). Join в Sheets по `id` **не сходится** — **NEEDS VERIFICATION**, как GAS сейчас матчит склады.

**Удалены (2026-08-13):** v1 `/stocks/current`, `/stocks/by-date` (ранее были закомментированы). Это не restore Stocks API v1 из M6.

Transition: stocks уже на `marketplace_item_id`; не возвращать к `item_id`.

```text
GET /api/stocks/by-warehouses?marketplace=WB|Озон|Yandex|Ozon Tamov|Yandex Tamov
  (shipped; не /api/sheets/stocks)

Назначение: выгрузка остатков по складам для Sheets на сегодня.

Ещё не закрыто относительно исходного концепта:
  date = YYYY-MM-DD / from-to
  pagination
  sku / barcode в ответе
  единый warehouse id с GET /api/info/warehouses
```

### Warehouses

**Источник:** `warehouses` + `marketplaces`.

**Существует (FACT, 2026-08-13):** `GET /api/info/warehouses`.

Response (FACT): `id` (PK), `title`, `type`, `marketplace.{id, title}`.  
Filter: `marketplaceId IS NOT NULL`. Нет query по MP. Auth header принимается, проверка **не выполняется** (как у остальных `/info/*` read).

---

## Architecture Decisions

Решения **до** реализации кода:

1. **Namespace API** — `NEEDS DECISION` (этот срез de facto **B**: `/info/warehouses`, `/stocks/by-warehouses`)  
   - A) новый prefix `/api/sheets/*` (чистый read-model, не ломает GAS на старых URL);  
   - B) расширять существующие `/items`, `/orders`, `/stocks`, `/info`;  
   - C) hybrid: справочники reuse `/info`, heavy data → `/sheets`.

2. **Items: reuse directory vs new endpoint** — `NEEDS DECISION`  
   - Directory уже близко к нужному; ломать shape опасно, если GAS живёт на нём.

3. **Supplier cardinality в UI** — `NEEDS DECISION`  
   - Схема M2M, directory/PATCH ведут себя как 1 supplier на item.  
   - Sheets таблица связей предполагает M2M. Согласовать write-back правила.

4. **Raw orders vs dynamic** — `NEEDS DECISION` (рекомендация исследования: **отдельный list**, dynamic не трогать).

5. **Stocks grain** — **DECISION (de facto, 2026-08-13):** **C** оба endpoint’а  
   - `GET /api/stocks/v2/current` — агрегат;  
   - `GET /api/stocks/by-warehouses` — warehouse-level «сегодня».  
   History by date и pagination — ещё открыты.

6. **Incremental strategy** — `NEEDS DECISION`  
   - `updatedSince` на сущностях с `updated_at`;  
   - для `items_suppliers` без timestamps — full sync / hash version / добавить audit (миграция — отдельное подтверждение);  
   - для stocks — primarily **by date**;  
   - для orders — **by marketplaceCreatedAt window** + cursor.

7. **Naming Contaminants** — `NEEDS DECISION`: оставить URL `/contaminants` или alias `/counterparties` в Sheets DTO.

8. **Auth** — `NEEDS DECISION`: единый guard `api-key` на все Sheets endpoints (сейчас покрытие дырявое).

9. **Tamov cabinets** — включать ли вторые кабинеты в Sheets filters по умолчанию (как в stocks/orders DTO уже есть).

10. **Не смешивать** с cutover M6 / не менять schema ради Sheets без явного OK.

---

## Volume & loading (анализ)

| Domain | Ожидаемый объём | Pagination | Filters | Incremental |
|--------|-----------------|------------|---------|-------------|
| Items (+ listings) | ~400 active (**FACT**) | не нужна сейчас | mp, archive, ids | `items.updated_at` / `marketplace_items.updated_at` |
| Suppliers | малый справочник | опционально | — | full ok; optional `updatedSince` |
| Item↔Supplier | ~O(items×suppliers per item) | желательна | ids | **слабое** (нет timestamps на связи) |
| Counterparties | малый | опционально | deleted | full / `updatedSince` |
| Orders | растёт постоянно (**FACT** sync crons) | **обязательна** | mp + dates | window by `marketplace_created_at` + cursor |
| Stocks | mp_items × warehouses (сегодня shipped) | нет в by-warehouses | mp | **by snapshot date**; history API нет |
| Warehouses | малый справочник | не нужна | — | full ok |

Существующая архитектура **частично** позволяет incremental только там, где уже есть date/`updated_at` filters — **сейчас таких query params в read API почти нет** (FACT: directory/suppliers/contaminants грузят всё; stocks = today; orders/dynamic = N days aggregate).

---

## TODO

- [ ] Закрыть оставшиеся Architecture Decisions (namespace, items reuse, M2M suppliers, auth).
- [ ] Зафиксировать целевые response DTO (поля) вместе с владельцем Sheets/GAS.
- [ ] Inventory текущего GAS: какие URL уже вызываются (**NEEDS VERIFICATION** вне этого репо).
- [x] Suppliers: расширить response (`bank`, warehouse fields) — FACT; миграция `1789209600000`.
- [x] Suppliers: поле `contract`; PATCH DTO + `@IsOptional` — FACT; миграция `1789212000000`.
- [x] Suppliers: HTTP method `PATCH /api/info/suppliers/:id`.
- [x] Items ERP list: `GET /api/items/erp/list` (WB image/color/barcode).
- [x] ERP list: query `marketplace` + поле `chrtId` (2026-08-13).
- [x] ERP logistics PATCH: `PATCH /api/items/erp/logistics-info` (батч `items[]`); колонки `transport_type` / `delivery_method` (`1789390000000`).
- [x] Supplier↔Item Phase 1: колонки + backfill `1789300000000`.
- [x] Supplier↔Item Phase 2: drop columns on `items`, nullable assembling/production `1789310000000`; orphans → «Системный поставщик».
- [x] Supplier↔Item Phase 3: `payment`/`dimensionsFact`/`dimensionsMasterBox`/`volume` на `items_suppliers` + backfill `1789320000000`; dual-write; drop с `items` позже.
- [x] Supplier↔Item Phase 4: `item_characteristic_id` + `deleted_at` на `items_suppliers` (`1789440000000`); ERP flat по size + `skus`; PATCH optional `supplier` (title).
- [x] Warehouses list: `GET /api/info/warehouses`.
- [x] Stocks warehouse-level: `GET /api/stocks/by-warehouses` (сегодня; без pagination/date).
- [ ] Suppliers: запись `bankId` из `bank` title (сейчас только validate).
- [ ] Counterparties: filter `deleted_at`, null-safe bank.
- [ ] Создать paginated orders list (raw `orders_v2`), не ломая `/orders/dynamic`.
- [ ] Stocks: date/history + pagination; выровнять warehouse `id` со справочником.
- [x] Drop с `items`: Phase 3 + obsolete габариты + `replenishment_period` / `remaining_balance` (`1789370000000`).
- [x] `ownImagesUrl` → `items_suppliers` (`1789460000000`); ERP GET/PATCH; directory `[0]` / fan-out.
- [ ] Единый api-key guard на Sheets routes (`/info/warehouses` пока без проверки).
- [ ] Документировать контракт в `docs/` (после первой реализации).
- [ ] Нагрузочная проверка объёма orders/stocks на prod (**NEEDS VERIFICATION** counts).

## IN PROGRESS

- (пусто) — Phase 3 dual-write `payment`/`dimensionsFact`/`dimensionsMasterBox`/`volume`; drop с `items` и устаревших полей — позже; `bankId` write отложен.

## DONE

- [x] Исследование entities / controllers / services / DTOs / crons по доменам.
- [x] Карта существующих API.
- [x] Черновик недостающих endpoints (проектирование).
- [x] Создание `docs/roadmap/google-sheets-api.md`.
- [x] Suppliers schema + GET/PATCH API (без bankId write).
- [x] Items `title`/`category` + ERP list endpoint.
- [x] Supplier↔Item Phase 2 (schema cutover + code on `items_suppliers`).
- [x] `GET /api/info/warehouses` + `GET /api/stocks/by-warehouses` (2026-08-13).
- [x] ERP `marketplace` query + `chrtId` (2026-08-13).
- [x] Supplier↔Item Phase 3 dual-write `payment`/`dimensionsFact`/`dimensionsMasterBox`/`volume` (`1789320000000`).

## BLOCKERS

- Transition M6 параллельно: нельзя ломать `marketplace_item_id` / dual archive semantics.

## NEXT STEP

**Orders:** paginated raw list `orders_v2` (не ломая `/orders/dynamic`). Stocks warehouse-level для «сегодня» уже в Sheets; date/history и выравнивание warehouse id — follow-up.

---

## Appendix A — Что можно переиспользовать

| Что | Как |
|-----|-----|
| `InfoService.getSuppliersList` / `updateSupplier` | ✔ read + partial PATCH |
| `ItemsService.getItemsErpList` | ✔ ERP/Sheets items + listing fields выбранного MP (default WB) |
| `ItemsService.getSuppliersItemsErpList` | ✔ ERP/Sheets item↔supplier (read from `items_suppliers`) |
| `ItemsService.updateItemsSuppliersList` | ✔ ERP/Sheets item↔supplier write-back; optional `supplier` title → `supplierId` |
| `InfoService.getContaminantsList` | Harden + soft-delete filter |
| `ItemsService.getItemsDirectoryList` | Эталон полей item + `marketplacesInfo`; либо обёртка Sheets |
| `StocksService.getStocks` / `getCurrentStocksV2` | Агрегат «сегодня» |
| `StocksService.getStocksByWarehouse` | Warehouse-level «сегодня» |
| `InfoService.getWarehousesList` | Справочник складов |
| `OrdersService` queries на `OrdersV2` | Паттерн filter by marketplace + date window |
| DTO enums marketplace titles | Как в `GetCurrentStocksDto` / `GetDynamicOrdersDto` |
| Domain docs field split items vs mp | Не выдумывать новые поля |

## Appendix B — Что нужно создать (после решений)

| Артефакт | Зачем |
|-----------|-------|
| Controllers routes (вероятно sheets module или extensions) | Новые read endpoints |
| Services / queries с pagination | orders, stocks, item-suppliers, items |
| Response DTO / interfaces | Стабильный контракт для GAS |
| Query DTO (filters, cursor, limit) | Объём и incremental |
| (optional) Auth guard | Единая проверка api-key |
| Docs контракта | После первого shipped endpoint |

**Не создавать:** новые entity для supplier↔item; legacy orders; schema sync; frontend.

## Appendix C — Что потенциально опасно

| Риск | Почему |
|------|--------|
| Legacy `orders` | Таблицаы нет; любой план «читать orders» = ошибка |
| Transition items→mp | Отдавать listing с `marketplaceItemId`; не `item_id` для stocks/orders |
| Большие таблицы orders/stocks | Full dump убьёт API и Sheets quotas |
| Нет pagination на directory | Уже full scan + joins |
| N+1 / тяжёлые JOIN | directory уже грузит relations; stocks current — all mp items |
| Dual storage items / items_suppliers | **Снято** Phase 2 — supplier-fields только на `items_suppliers` |
| Hardcoded excludeWarehouses | В v2/current, by-warehouses и directory stocks SUM; списки **расширяли** 2026-08-24; в warehouse-level zero-out quantity, строка остаётся |
| Warehouse id mismatch | `/info/warehouses`.id = PK; `/stocks/by-warehouses`.warehouse.id = `marketplaceInternalNumber` |
| Contaminants.bank null | Runtime error |
| Неполная api-key проверка | Security |
| WIP GET update supplier | Ломает REST expectations |
| Dual archive | `isArchive` vs `deleted_at` — путать нельзя |

## Appendix D — Вопросы NEEDS DECISION

1. Prefix `/api/sheets/*` или расширение существующих путей?
2. Ломать/версионировать `directory/list` или новый read-model рядом?
3. Sheets показывает **все** suppliers на item или по-прежнему одного?
4. Нужны ли raw order rows или достаточно `/orders/dynamic`?
5. Остатки: warehouse-level **и** агрегат — **сделано**; история по датам ещё нет.
6. Включать ли Tamov кабинеты в те же таблицы Sheets?
7. Нужен ли write API в этой волне (suppliers/counterparties/items) или только read?
8. Alias `counterparties` vs оставить `contaminants`?
9. Добавлять ли `created_at`/`updated_at` на `items_suppliers` (миграция)?
10. Нужны ли в items export `send_status` / archived listings?

---

## Research log

| Дата | Итог |
|------|------|
| 2026-09-08 | `ownImagesUrl` → `items_suppliers` (`1789460000000`); ERP GET/PATCH + directory `[0]` / fan-out write |
| 2026-08-25 | ERP PATCH suppliers-items: optional `supplier` (title → `supplierId`); `volume` убран из PATCH DTO; Phase 4 size-rows + `skus` на GET |
| 2026-08-18 | ERP logistics PATCH `/api/items/erp/logistics-info` (батч `items[]`); `transport_type` / `delivery_method` на `items` (`1789390000000`) |
| 2026-08-13 | Phase 3: `payment`/`dimensionsFact`/`dimensionsMasterBox`/`volume` → `items_suppliers` (`1789320000000`); dual-write; `volumeMasterBox`/`volumePerUnit`/`weightPerUnit`/`density` остаются на `items` до drop |
| 2026-08-17 | Drop с `items` Phase 3 + obsolete + `replenishment_period` / `remaining_balance` (`1789370000000`); dual-write снят |
| 2026-08-13 | Warehouse-level stocks: `GET /api/stocks/by-warehouses`; справочник `GET /api/info/warehouses`; ERP `marketplace` + `chrtId`; v1 by-date код удалён; AD-5 de facto C |
| 2026-08-12 | Supplier↔Item Phase 2: `1789310000000` drop items columns; assembling/production nullable; code read/write на `items_suppliers`; orphans → «Системный поставщик» |
| 2026-08-12 | Supplier↔Item Phase 1: migration backfill `1789300000000`; ERP `GET /api/items/erp/suppliers-items/list` |
| 2026-08-11 | Suppliers schema + GET/PATCH; ERP items list; docs updated for prod |
