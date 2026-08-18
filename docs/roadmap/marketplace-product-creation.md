# Roadmap: Marketplace Product Creation

> Отдельное направление. **Не смешивать** с [`items-marketplace-items-migration.md`](items-marketplace-items-migration.md) и [`google-sheets-api.md`](google-sheets-api.md).  
> Метки: **FACT** / **ASSUMPTION** / **NEEDS VERIFICATION** / **NEEDS DECISION**.

Связанные: [`../AI_CONTEXT.md`](../AI_CONTEXT.md), [`../domain/items-and-marketplace-items.md`](../domain/items-and-marketplace-items.md), [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md).

Последнее обновление: 2026-08-12.

---

## Goal

Реализовать **обратный** workflow работы с маркетплейсами: сотрудник создаёт товар в **Google Sheets**, backend создаёт карточки на WB / Ozon / Yandex, сохраняет marketplace-specific идентификаторы в БД, после чего включается существующая синхронизация (цены, остатки, заказы, stop-list).

**FACT:** сейчас поток односторонний — карточки появляются на МП вручную, backend **только читает** через cron и find-or-create в PostgreSQL.

**DECISION (архитектурное ограничение):** не ломать переход `items → marketplace_items`; marketplace-specific данные — только на `marketplace_items`; общие — на `items`.

---

## Current State

### Как товар создаётся сейчас (FACT)

```text
Сотрудник создаёт карточку на маркетплейсе (вне системы)
        ↓
Cron ItemsService (WB / Ozon / Yandex)
        ↓
GET/POST к API маркетплейса (только чтение)
        ↓
find-or-create Items по article
        ↓
find-or-create MarketplaceItems по (marketplace_identifier, marketplace_id)
        ↓
Дальше: price crons, stocks crons, orders crons, autostatus
```

### Основная сущность товара (FACT)

| Уровень                           | Entity              | Роль                                                                                                                                               |
| --------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product (marketplace-independent) | `items`             | 1 строка на `article` (`created_for_calculation = false`); логистика, себестоимость, classification, `isArchive`, `ownImagesUrl`, `wbCreatedAt`, … |
| Listing (marketplace-specific)    | `marketplace_items` | N listings на item — по одному на `(item_id, marketplace_id)`; identity, listing, prices, `send_status_id`, `deleted_at`                           |

Целевая модель из domain doc:

```text
Item (1 на article)
 ├── MarketplaceItem (WB)
 ├── MarketplaceItem (Озон)
 ├── MarketplaceItem (Ozon Tamov)
 ├── MarketplaceItem (Yandex)
 └── MarketplaceItem (Yandex Tamov)
        ├── Stocks
        └── OrdersV2
```

### Поля `items` — marketplace-independent (FACT)

Из entity + domain doc: `article`, `articleOld`, `title`, `category` (product-level, backfill с WB — migration `1789209600000`), `ownCategory`, classification/virality, логистика/сроки (`consolidation`, `payment`, `buffer`, …), себестоимость/таможня (`costInRub`, `codeTNVED`, …), габариты/объём (`dimensionsFact`, `dimensionsMasterBox`, `volume`, …), `ownImagesUrl`, `downloadCalculationMethod`, `wbCreatedAt`, `isArchive`, `createdForCalculation`, audit.

**FACT:** MP identity/listing/prices/`send_status_id` с `items` **сняты** (M5 prod).

### Поля `marketplace_items` — marketplace-specific (FACT)

| Группа   | Поля                                                                    |
| -------- | ----------------------------------------------------------------------- |
| Identity | `marketplace_identifier`, `barcode`, `sku`, `marketplace_id`, `item_id` |
| Listing  | `category`, `title`, `color`, `image_url` (nullable с `1786107580847`)  |
| Prices   | `price`, `discount` (%), `price_with_discount`                          |
| Ops      | `send_status_id`, `dimensions`, `volume`, `chrt_id`, `deleted_at`       |

### Marketplace-specific идентификаторы, уже хранящиеся (FACT, из sync-кода)

| МП     | `items.article` ← | `marketplace_identifier` ← | `sku`      | `barcode`          | `chrt_id`         |
| ------ | ----------------- | -------------------------- | ---------- | ------------------ | ----------------- |
| WB     | `vendorCode`      | `nmID`                     | `'0'`      | `sizes[0].skus[0]` | `sizes[0].chrtID` |
| Ozon   | `offer_id`        | `product id` (`item.id`)   | Ozon `sku` | `barcode`          | —                 |
| Yandex | `offerId`         | `marketSku`                | `'0'`      | `barcodes[0]`      | —                 |

**FACT:** дополнительные ID приходят в API-ответах, но **не сохраняются** отдельными колонками: WB `imtID`, `nmUUID`, `subjectID`; Ozon `type_id`, `description_category_id`, `model_info.model_id`; Yandex `marketModelId`, `marketCategoryId`, `vendorCode`.

### Поля, появляющиеся после синхронизации с МП (FACT)

Card sync crons обновляют: `dimensions`, `volume`, `category`, `title`, `color`, `imageUrl`, identity-поля; price crons — `price`, `discount`, `priceWithDiscount`; trash crons — `deleted_at`; autostatus cron — `send_status_id`.

**FACT:** `items.wbCreatedAt` заполняется из WB `createdAt` только если есть отдельная логика — в текущем `getWbItems` **не обновляется** (поле есть на entity, sync не пишет — **NEEDS VERIFICATION** использования).

### Связи с другими сущностями (FACT)

| Связь                    | Таблица             | FK                                            |
| ------------------------ | ------------------- | --------------------------------------------- |
| Item → listings          | `marketplace_items` | `item_id`                                     |
| Listing → stocks         | `stocks`            | `marketplace_item_id`                         |
| Listing → orders         | `orders_v2`         | `marketplace_item_id`                         |
| Item → sizes             | `items_sizes`       | `item_id` (sync закомментирован; M6 redesign) |
| Item → suppliers         | `items_suppliers`   | `item_id` + `supplier_id` (unique)            |
| Marketplace → warehouses | `warehouses`        | `marketplace_id`                              |

### DB constraints, релевантные для создания (FACT)

- `UQ_items_article_not_calculation` — unique `article` WHERE `created_for_calculation = false`.
- **FACT (2026-08-18):** на prod **есть дубли** active `(item_id, marketplace_id)` в `marketplace_items`. Unique index **не накатили** — закомментирован в `1789400000000`. После дедупа — отдельная миграция (задача в items-marketplace-items-migration Known Gaps).
- `marketplace_items.marketplace_identifier`, `barcode`, `sku` — **NOT NULL**.
- Lookup при sync: `(marketplace_identifier, marketplace_id)` или `article` на items.

### Существующие HTTP API для товаров (FACT)

| Method    | Path                                     | Создание на МП                           |
| --------- | ---------------------------------------- | ---------------------------------------- |
| POST      | `/api/items`                             | Нет — только тестовый item + mp row в БД |
| GET/PATCH | `/api/items/directory/*`, stop-list, erp | Read / update directory, не outbound MP  |

### Инфраструктура jobs (FACT)

- `@nestjs/schedule` — in-process cron, **без** очереди / worker / Redis.
- HTTP к МП — `axios` inline в services; **отдельных API client-модулей нет**.

---

## Target State

```text
Google Sheets (форма + действие «Создать»)
        ↓
Google Apps Script
        ↓
Backend API (валидация + постановка задачи)
        ↓
[async] Создание Item (+ optional items_suppliers)
        ↓
[async, per marketplace] Создание карточки на МП
        ↓
Сохранение MarketplaceItem с реальными MP ID
        ↓
Подтверждение (poll status / webhook — NEEDS DECISION)
        ↓
Существующие crons подхватывают listing
```

**ASSUMPTION:** успех создания = карточка **существует на МП и идентификаторы сохранены в БД**, а не только «HTTP 200 от API».

---

## Marketplace Analysis

> В repository **нет** методов create/update/publish карточек. Ниже — что **есть** (read/sync) и что **отсутствует**. Требования к созданию на стороне МП — **NEEDS VERIFICATION** (официальная документация не зафиксирована в репо).

### Wildberries

#### Что есть в коде (FACT)

| Область                   | Реализация                                                                     | Endpoint / файл                                                    |
| ------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| API client                | Нет; `axios` в `ItemsService`, `InfoService`, `StocksService`, `OrdersService` | —                                                                  |
| Получение карточек        | `getWbItems` cron                                                              | `POST content-api.wildberries.ru/content/v2/get/cards/list`        |
| Trash / archive           | `getWbTrashItems`                                                              | `POST …/get/cards/trash` → `marketplace_items.deleted_at`          |
| Цены (read)               | `updateWbItemsPrices`                                                          | `GET discounts-prices-api.wildberries.ru/api/v2/list/goods/filter` |
| Склады                    | `InfoService`                                                                  | `marketplace-api`, `supplies-api`                                  |
| Остатки                   | `StocksService`                                                                | analytics + FBS stocks                                             |
| Заказы                    | `OrdersService`                                                                | WB seller API                                                      |
| DTO / interfaces          | `WbItem`, `WbItems`, `WbItemsPrices`                                           | `src/items/interfaces/wb-items.interface.ts`                       |
| Mapping                   | Inline в `getWbItems`                                                          | vendorCode→article, nmID→marketplace_identifier, …                 |
| Категории                 | **Нет** отдельного API в коде                                                  | subjectName приходит в card list                                   |
| Характеристики            | **Только read**                                                                | `characteristics[]` в `WbItem`; color из «Цвет»                    |
| Изображения               | **Только read**                                                                | `photos[].big` → `imageUrl`                                        |
| Create / update / publish | **Нет**                                                                        | —                                                                  |

#### Данные после чтения карточки (FACT, `WbItem`)

`nmID`, `imtID`, `nmUUID`, `subjectID`, `subjectName`, `vendorCode`, `brand`, `title`, `dimensions`, `photos`, `characteristics`, `sizes[]` (`chrtID`, `techSize`, `wbSize`, `skus`), `createdAt`.

#### Создание карточки (NEEDS VERIFICATION)

| Вопрос                                                          | Статус                                                                      |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Обязательные поля для create                                    | NEEDS VERIFICATION                                                          |
| Этапы (черновик → модерация → публикация)                       | NEEDS VERIFICATION                                                          |
| Отдельные операции (карточка / размеры / баркод / медиа / цена) | NEEDS VERIFICATION                                                          |
| Возвращаемые ID после create                                    | NEEDS VERIFICATION (ожидаемо `nmID`, `chrtID`, `skus` — по аналогии с read) |
| Ограничения (rate limit, модерация, subject tree)               | NEEDS VERIFICATION                                                          |

---

### Ozon

#### Что есть в коде (FACT)

| Область                    | Реализация                                             | Endpoint / файл                                                        |
| -------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| API client                 | Нет; `axios` inline                                    | —                                                                      |
| Категории (read)           | `getOzonItems`                                         | `POST api-seller.ozon.ru/v1/description-category/tree`                 |
| Атрибуты / карточки (read) | `getOzonItems`, `getOzonTrashItems`                    | `POST …/v4/product/info/attributes`                                    |
| Цены (read)                | `updateOzonItemsPrices`                                | `POST …/v5/product/info/prices`                                        |
| Склады                     | `InfoService.getOzonWarehouses`                        | `POST …/v1/warehouse/ozon/list`                                        |
| Остатки / заказы           | `StocksService`, `OrdersService`                       | seller API                                                             |
| DTO                        | `OzonItemsInfo`, `OzonCategoryData`, `OzonItemsPrices` | `ozon-items-info.interface.ts`                                         |
| Mapping                    | Inline в `getOzonItems`                                | offer_id→article, id→marketplace_identifier, sku, category via type_id |
| Характеристики             | **Нет** отдельного read attributes API в коде          | attributes endpoint возвращает product info                            |
| Изображения                | **Только read**                                        | `primary_image`                                                        |
| Create / import / publish  | **Нет**                                                | —                                                                      |

#### Данные после чтения (FACT, `OzonItemsInfo`)

`id`, `offer_id`, `name`, `barcode`, `sku`, `height/depth/width/weight`, `description_category_id`, `type_id`, `primary_image`, `model_info`, `barcodes[]`.

#### Создание товара (NEEDS VERIFICATION)

| Вопрос                                                                   | Статус                                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Обязательные поля (offer_id, category, attributes, images, …)            | NEEDS VERIFICATION                                               |
| Этапы (import task → status poll → activate)                             | NEEDS VERIFICATION                                               |
| Отдельные операции (import, update attributes, upload images, set price) | NEEDS VERIFICATION                                               |
| Возвращаемые ID                                                          | NEEDS VERIFICATION (ожидаемо `product_id`, `sku` — по read sync) |
| Ограничения                                                              | NEEDS VERIFICATION                                               |

**FACT:** category mapping уже реализован для **read** (`description_category_id` + `type_id` → title); для create потребуется обратный mapping — **новый код**.

---

### Yandex

#### Что есть в коде (FACT)

| Область                    | Реализация                            | Endpoint / файл                                                            |
| -------------------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| API client                 | Нет; `axios` inline                   | —                                                                          |
| Offer mappings (read)      | `getYandexItems`                      | `POST api.partner.market.yandex.ru/businesses/{businessId}/offer-mappings` |
| Trash                      | Закомментирован `getYandexTrashItems` | archived filter — **не активен**                                           |
| Склады                     | `InfoService.getYandexWarehouses`     | `GET …/warehouses`                                                         |
| Остатки / заказы           | `StocksService`, `OrdersService`      | partner API                                                                |
| DTO                        | `YandexItems`, `YandexItemsResult`    | `yandex-items.interface.ts`                                                |
| Mapping                    | Inline                                | offerId→article, marketSku→marketplace_identifier                          |
| Категории / характеристики | **Нет** отдельного API в коде         | category из `mapping.marketCategoryName`                                   |
| Изображения                | **Только read**                       | `pictures[]`                                                               |
| Create / update offer      | **Нет**                               | —                                                                          |

#### Данные после чтения (FACT)

Offer: `offerId`, `name`, `category`, `pictures`, `barcodes`, `weightDimensions`, `vendorCode`, …  
Mapping: `marketSku`, `marketModelId`, `marketCategoryId`, `marketCategoryName`, …

#### Создание оффера (NEEDS VERIFICATION)

| Вопрос                                                     | Статус                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------- |
| Обязательные поля для offer + mapping                      | NEEDS VERIFICATION                                      |
| Этапы (offer → moderation → mapping / card)                | NEEDS VERIFICATION                                      |
| Отдельные операции (offer upsert, content, mapping, price) | NEEDS VERIFICATION                                      |
| Возвращаемые ID                                            | NEEDS VERIFICATION (ожидаемо `marketSku` после mapping) |
| Ограничения                                                | NEEDS VERIFICATION                                      |

---

### Сводка: переиспользование vs отсутствует

| Компонент                                           | Переиспользовать      | Отсутствует                              |
| --------------------------------------------------- | --------------------- | ---------------------------------------- |
| Entity model `items` + `marketplace_items`          | ✔                    | —                                        |
| find-or-create по `article` / mp lookup pattern     | ✔ (логика sync)      | —                                        |
| Mapping полей read → DB                             | ✔ как reference      | Reverse mapping (DB/Sheets → MP payload) |
| Ozon category tree read                             | ✔                    | Category/attribute **write** APIs        |
| Credentials / multi-cabinet config                  | ✔ `configuration.ts` | Per-request cabinet selection rules      |
| Price / stocks / orders crons после create          | ✔                    | —                                        |
| Outbound create/update/publish                      | —                     | **Весь слой**                            |
| Dedicated MP clients, DTO create, retry/idempotency | —                     | **Весь слой**                            |
| Creation status storage                             | —                     | Schema + API                             |
| Job queue                                           | —                     | Infrastructure                           |

---

## Data Model

### Что создаётся один раз (FACT + target)

На `items` (marketplace-independent): минимум `article`; опционально поля directory (`title`, `category`, `ownCategory`, classification, logistics, `ownImagesUrl`, …); связь `items_suppliers` — **NEEDS DECISION** обязательность при create.

### Что создаётся per marketplace (FACT + target)

На `marketplace_items`: identity + listing + позже prices/status через crons.

### Проблема NOT NULL до получения MP ID (NEEDS DECISION)

**FACT:** `marketplace_identifier`, `barcode`, `sku` — NOT NULL сейчас.

Варианты (не выбрано):

1. Placeholder values (`PENDING-{uuid}`) до sync/reconcile.
2. Ослабить NOT NULL для «draft» listings (migration).
3. Отдельная таблица `marketplace_item_creation_jobs` без строки в `marketplace_items` до success.

### Статус создания (NEEDS DECISION)

В текущей схеме **нет** полей: creation status, last error, attempt count, idempotency key, external task id.

**NEEDS DECISION:** где хранить per-marketplace creation state:

- A) колонки на `marketplace_items` (`creation_status`, `creation_error`, …);
- B) отдельная таблица `product_creation_requests` + `product_creation_attempts`;
- C) JSON audit log.

### Как определить, что товар уже создан (target)

| Проверка             | Источник                                                                     |
| -------------------- | ---------------------------------------------------------------------------- |
| Item exists          | `items.article` unique (non-calculation)                                     |
| Listing exists       | `(item_id, marketplace_id)`                                                  |
| Listing live on MP   | `marketplace_identifier` не placeholder + card sync находит карточку         |
| Не дублировать на МП | **NEEDS DECISION:** lookup по `vendorCode`/`offer_id`/`offerId` перед create |

### Общие vs marketplace-specific поля для create payload

**FACT (общие, уже на `items` или directory DTO):** `article`, `articleOld`, `title`, `category`, `ownCategory`, classification, logistics/cost fields, `ownImagesUrl`, `codeTNVED`, dimensions fact / master box, supplier link fields (`items_suppliers`).

**FACT (marketplace-specific, уже на `marketplace_items` или sync):** `category`, `title`, `color`, `dimensions`, `volume`, `barcode`, `sku`, `imageUrl`, prices (post-create).

**NEEDS VERIFICATION (MP-only, не в БД сейчас):** WB `subjectID`, characteristics, brand, sizes; Ozon `description_category_id`, `type_id`, attribute map; Yandex `weightDimensions`, campaign/card params.

---

## API

> Концептуально. **Не реализовать** до закрытия Architecture Decisions. Namespace **NEEDS DECISION** (`/api/items/...` vs `/api/products/...` vs `/api/sheets/...`).

### Предлагаемые endpoints (черновик)

#### 1. `POST /api/items/create` (или `/api/product-creation`)

|                     |                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| **Назначение**      | Принять данные из GAS; создать/найти Item; поставить задачи создания на выбранных МП                      |
| **Вход**            | Common item fields + `targetMarketplaces[]` + per-MP payloads + optional `idempotencyKey`                 |
| **Результат**       | `202 Accepted`: `{ requestId, itemId?, status: 'pending', marketplaces: [{ marketplaceTitle, status }] }` |
| **Ошибки**          | 400 validation; 409 duplicate article; 401 api-key                                                        |
| **Идемпотентность** | По `idempotencyKey` и/или `article` — **NEEDS DECISION**                                                  |
| **Sync/async**      | **Async** (MP create > HTTP timeout)                                                                      |

#### 2. `GET /api/items/create/:requestId/status`

|                     |                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Назначение**      | Poll статуса per marketplace                                                                                       |
| **Результат**       | `{ itemId, overallStatus, marketplaces: [{ title, status, marketplaceItemId?, marketplaceIdentifier?, error? }] }` |
| **Идемпотентность** | Read-only                                                                                                          |

#### 3. `POST /api/items/create/:requestId/retry` (optional)

|                    |                                                                        |
| ------------------ | ---------------------------------------------------------------------- |
| **Назначение**     | Retry failed / timed-out marketplaces без повторного create на SUCCESS |
| **NEEDS DECISION** | Доступен ли manual retry из Sheets                                     |

#### 4. `GET /api/items/create/metadata` (optional, phase 2)

|                                                         |                                                                                     |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Назначение**                                          | Справочники для формы: Ozon categories (proxy tree), WB subjects, Yandex categories |
| **FACT:** Ozon tree уже читается в cron — можно вынести |

#### 5. Reconcile hook (internal)

|                |                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------- |
| **Назначение** | После timeout — card sync cron или dedicated reconcile находит карточку на МП и завершает job |
| **Sync/async** | Background                                                                                    |

**FACT:** не расширять `POST /api/items` (test item) для prod create.

---

## Google Sheets Workflow

### Пользовательский сценарий (target)

```text
Сотрудник заполняет строку/форму
        ↓
Выбирает маркетплейсы (WB / Ozon / Yandex / Tamov — NEEDS DECISION)
        ↓
GAS: валидация обязательных полей на клиенте
        ↓
POST Backend API + api-key
        ↓
Sheets показывает requestId; poll status / refresh row
        ↓
При partial success — явный UI per MP (NEEDS DECISION)
```

### Данные для backend (из подтверждённых источников)

#### Общие (FACT — поля существуют в `items` / directory DTO)

`article` (required), `articleOld`, `title`, `category`, `ownCategory`, `classification`, `ownImagesUrl`, `codeTNVED`, logistics/cost поля из `UpdateDirectoryItemInfoDto`, supplier block (`supplier`, `multiplicity`, `boxNumber`, … на `items_suppliers`).

#### Marketplace-specific (FACT — поля sync пишет в `marketplace_items`; обязательность для create — NEEDS VERIFICATION)

| МП     | Поля                                                                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------------------------- |
| WB     | `title`, `category`/subject, `dimensions`, `barcode`/skus, `color`, images, sizes/`chrt_id`                                 |
| Ozon   | `offer_id` (=article), `name`, `barcode`, `sku`, category (`description_category_id`+`type_id`), dimensions, weight, images |
| Yandex | `offerId`, `name`, `barcodes`, `weightDimensions`, `pictures`, category                                                     |

**NEEDS VERIFICATION:** полный список обязательных MP attributes для каждой категории.

---

## Creation Workflow

### Lifecycle (target)

```text
1. API validate + idempotency check (article, requestId)
2. BEGIN TX: find-or-create Item by article
3. Optional: items_suppliers link
4. For each target marketplace (parallel — NEEDS DECISION):
   a. Check existing listing (item_id + marketplace_id)
   b. If marketplace_identifier real → skip or NEEDS DECISION
   c. Map payload → MP API create
   d. Poll MP task status if async API
   e. Persist MarketplaceItem with real IDs
   f. Record attempt result
5. Return aggregate status (partial success allowed)
6. Post-success: existing card/price crons reconcile details
```

### Sync vs async (ASSUMPTION → NEEDS DECISION)

| Фактор                    | Вывод                                                      |
| ------------------------- | ---------------------------------------------------------- |
| MP APIs multi-step / slow | Sync HTTP **не подходит** для all-in-one                   |
| Нет queue в проекте       | In-process async (DB job + cron worker) или добавить queue |
| Partial success           | **Per-marketplace** status обязателен                      |
| GAS timeout               | Client poll по `requestId`                                 |

**ASSUMPTION:** минимальный v1 — DB-backed job + `@Cron` worker каждые N секунд (как существующие crons).

---

## Idempotency

### Сценарии (target behavior — детали NEEDS DECISION)

| Сценарий                          | Предлагаемая стратегия                                                  |
| --------------------------------- | ----------------------------------------------------------------------- |
| Повторный POST с тем же `article` | 409 или вернуть существующий `requestId` — **NEEDS DECISION**           |
| Повтор из Sheets (double-click)   | `idempotencyKey` (UUID от GAS)                                          |
| Timeout после успеха на МП        | Reconcile: card sync by article/vendorCode; job → success               |
| Retry worker                      | Skip MP уже в `success`; retry только `failed`/`timeout`                |
| Карточка уже на МП, нет в БД      | Card sync find-or-create **или** explicit link API — **NEEDS DECISION** |
| Карточка в БД, повтор create      | Skip if `marketplace_identifier` not placeholder                        |

### DB / checks

**FACT:** `UQ_items_article_not_calculation`.  
**NEEDS DECISION:** UNIQUE `(item_id, marketplace_id)` index на `marketplace_items`.  
**NEEDS DECISION:** UNIQUE `(marketplace_id, marketplace_identifier)` для anti-duplication.

Natural keys на стороне МП (из sync): WB `vendorCode`, Ozon `offer_id`, Yandex `offerId`.

---

## Error Handling

> Поведение системы — **NEEDS DECISION** где не указано иначе.

### Сценарий: WB SUCCESS, Ozon SUCCESS, Yandex ERROR

| Компонент        | Поведение                                                    |
| ---------------- | ------------------------------------------------------------ |
| Item             | Created / exists                                             |
| WB, Ozon mp rows | Success + real IDs                                           |
| Yandex           | Failed state + error message                                 |
| Overall status   | `partial_success` (**NEEDS DECISION** имя)                   |
| Sheets           | Показать per-MP статус; item **не** считать полностью failed |

### Сценарий: WB SUCCESS, Ozon TIMEOUT, Yandex NOT_STARTED

| Компонент   | Поведение                                                                     |
| ----------- | ----------------------------------------------------------------------------- |
| Ozon        | `timeout` / `unknown`; worker retry + reconcile                               |
| Yandex      | `pending` или `skipped` — **NEEDS DECISION** порядок (sequential vs parallel) |
| User action | Retry Ozon only                                                               |

### Сценарий: WB ERROR, Ozon SUCCESS, Yandex SUCCESS

| Overall | `partial_success`; WB retryable |

### Сценарий: API timeout, но товар создан на МП

| Действие | Reconcile via card sync cron by article; job → success when mp row matches |
| Риск | Duplicate if retry create без check — **обязательный** pre-create lookup |

### Принципы

1. Не считать success только по HTTP 200 (**DECISION из задачи**).
2. Partial success между МП — нормальный исход.
3. Ошибки MP сохранять per-attempt (message, code, timestamp).
4. Не rollback успешных MP при fail другого (**NEEDS DECISION** compensating delete on MP).

---

## Architecture Decisions

| #     | Вопрос                                                        | Статус                                   |
| ----- | ------------------------------------------------------------- | ---------------------------------------- |
| AD-1  | Tamov кабинеты в scope v1 create?                             | NEEDS DECISION                           |
| AD-2  | Где хранить creation status (columns vs job table)            | NEEDS DECISION                           |
| AD-3  | Placeholder vs nullable vs deferred mp row                    | NEEDS DECISION                           |
| AD-4  | Job runner: cron worker vs Bull/Redis vs sync prototype       | NEEDS DECISION                           |
| AD-5  | Parallel vs sequential MP creation                            | NEEDS DECISION                           |
| AD-6  | API namespace и versioning                                    | NEEDS DECISION                           |
| AD-7  | Idempotency: article-only vs idempotencyKey header            | NEEDS DECISION                           |
| AD-8  | Повтор create при existing article                            | NEEDS DECISION (409 vs add marketplaces) |
| AD-9  | Обязательность supplier link at create                        | NEEDS DECISION                           |
| AD-10 | Price set at create vs post-create cron only                  | NEEDS DECISION                           |
| AD-11 | Image upload: URL from `ownImagesUrl` vs MP upload API        | NEEDS DECISION                           |
| AD-12 | UNIQUE index on `(item_id, marketplace_id)`                   | NEEDS DECISION                           |
| AD-13 | Compensating transaction: delete MP card on partial rollback? | NEEDS DECISION                           |
| AD-14 | Зависимость от M6 (`items_sizes`)                             | NEEDS DECISION                           |

---

## TODO

Исследование (этот документ):

- [x] Этап 1: модель `items` / `marketplace_items`
- [x] Этап 2: инвентаризация WB/Ozon/Yandex integrations (read-only)
- [x] Этап 3: gaps помечены NEEDS VERIFICATION
- [x] Этапы 4–9: target model, workflow, API concept, errors
- [x] Roadmap document

До реализации:

- [x] Schema outbox: `product_creation_requests` (`1789400000000`) + unique listing; без jobs
- [x] `POST /api/items/create-on-marketplaces` — новый item + заявка на каждый кабинет; duplicate article → 400
- [x] `warehouses.deleted_at` (`1789410000000`)
- [ ] Dedup `marketplace_items` (item_id + marketplace_id, `deleted_at IS NULL`) → unique listing + индексы `product_creation_requests` (отложены в `178940`)
- [ ] Worker + `WbCardPublisher` (пока заявки остаются `in_progress`)
- [ ] Spike WB upload/poll
- [ ] GAS UX
- [ ] Ozon / Yandex адаптеры

---

## IN PROGRESS

- Outbox + HTTP create. Worker / вызов WB **ещё нет** — заявки ждут в `in_progress`.

---

## DONE

- [x] Architecture research + `docs/roadmap/marketplace-product-creation.md` (2026-08-12)

---

## BLOCKERS

| Blocker                       | Суть                                                  |
| ----------------------------- | ----------------------------------------------------- |
| Нет outbound MP create в коде | Весь create-слой с нуля                               |
| MP create requirements        | NEEDS VERIFICATION по официальным API                 |
| NOT NULL на mp identity       | Нужно AD-3 до первой migration                        |
| Нет job infrastructure        | AD-4; long-running work в HTTP process                |
| M6 cutover параллельно        | Не ломать card sync find-or-create; `items_sizes` TBD |
| Auth                          | api-key guard неполный (FACT PROJECT_CONTEXT)         |

---

## NEEDS DECISION

См. **Architecture Decisions** AD-1…AD-14.

Дополнительно для бизнеса:

1. Минимальный набор МП для v1 (только main cabinet vs все 5)?
2. Кто заполняет category/attributes — сотрудник в Sheets или шаблон?
3. Допустим ли create без supplier?
4. Поведение при duplicate article на МП (чужой vendorCode)?
5. Нужна ли модерация / ручное подтверждение перед publish?

---

## NEXT STEP

**Один конкретный шаг:** провести **API spike по Ozon Seller API product import** (create flow + poll + какие ID возвращаются) и зафиксировать результат в секции Ozon — перевести ключевые пункты из NEEDS VERIFICATION в FACT. Обоснование: в коде уже есть category tree + product info read; второй кабинet Tamov можно отложить (AD-1).

---

## Research log

| Дата       | Итог                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------- |
| 2026-08-12 | Initial research; roadmap created; подтверждено: только read/sync MP APIs; create layer отсутствует |
