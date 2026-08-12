# Roadmap: Google Sheets API

> Отдельный roadmap. **Не смешивать** с [`items-marketplace-items-migration.md`](items-marketplace-items-migration.md).  
> Миграция `items → marketplace_items` не закрывается и не продолжается в рамках этого направления.  
> Метки: **FACT** / **ASSUMPTION** / **NEEDS VERIFICATION** / **NEEDS DECISION**.

Связанные: [`../AI_CONTEXT.md`](../AI_CONTEXT.md), [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md), [`../domain/items-and-marketplace-items.md`](../domain/items-and-marketplace-items.md).

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
| Supplier ↔ Item | `items_suppliers` | M2M; unique `(item_id, supplier_id)`; **Phase 1:** supplier-fields дублируются на связи (миграция `1789300000000`); read/write directory — пока `items` |
| Counterparties | `contaminants` (+ `banks`) | в docs/UI — «контрагенты»; связь с suppliers **нет** |
| Orders | `orders_v2` | source of truth; legacy `orders` удалён |
| Stocks | `stocks` | дневные снимки; FK `marketplace_item_id`, `warehouse_id`, `marketplace_id` |
| Supporting | `marketplaces`, `warehouses`, `statuses`, `items_sizes`, `low_days_stocks` | не primary Sheets targets сейчас |

### Существующие HTTP endpoints (FACT)

| Method | Path | Модуль | Назначение |
|--------|------|--------|------------|
| GET | `/api/info/statuses` | info | статусы по `type` |
| GET | `/api/info/suppliers` | info | список поставщиков (+ nested bank) |
| PATCH | `/api/info/suppliers/:id` | info | частичное обновление поставщика |
| GET | `/api/info/contaminants` | info | список контрагентов + bank |
| GET | `/api/items/directory/list` | items | справочник товаров + `marketplacesInfo[]` |
| GET | `/api/items/erp/list` | items | ERP/Sheets: items + WB image/color/barcode |
| GET | `/api/items/erp/suppliers-items/list` | items | ERP/Sheets: связи item↔supplier + supplier-fields с `items_suppliers` |
| PATCH | `/api/items/directory/info` | items | обновление directory (в т.ч. один supplier по title) |
| GET | `/api/items/v2/stop-list` | items | stop-list (операционный) |
| PATCH | `/api/items/stop-list` | items | обновление send status |
| POST | `/api/items` | items | тестовый item (не для Sheets prod) |
| GET | `/api/orders/dynamic` | orders | **агрегированная** динамика заказов + остатки |
| GET | `/api/stocks/v2/current` | stocks | **агрегированные** текущие остатки (сегодня) |
| ~~GET~~ | `/api/stocks/current` | stocks | **закомментирован** |
| ~~GET~~ | `/api/stocks/by-date` | stocks | **закомментирован** |

**FACT (2026-08-11):** `PATCH /api/info/suppliers/:id` — method исправлен. Поле `bank` в body пока только проверяет существование банка; **`bankId` не обновляется** (отложено).

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
| Items | `GET /api/items/erp/list` | `items` + WB `marketplace_items` | **Да** для ERP/Sheets (~400 items) | Пока без incremental; image/color/barcode только с WB |
| Items | `GET /api/items/erp/suppliers-items/list` | `items_suppliers`, `items`, `suppliers` | **Да** для таблицы item↔supplier | Только строки с существующей связью; ~50 items без link — данных нет в этом endpoint |
| Items | `GET /api/items/v2/stop-list` | `marketplace_items`, `items`, stocks/orders aggregates | Нет как общий каталог | Операционный stop-list |
| Items | `PATCH /api/items/directory/info` | `items`, `marketplace_items`, `items_suppliers` | Write-back из Sheets | Supplier-fields пишутся на **`items`** (legacy); link — только `supplierId` на `items_suppliers` |
| Suppliers | `GET /api/info/suppliers` | `suppliers`, `banks` | Да для полного справочника | Нет audit timestamps в API |
| Suppliers | `PATCH /api/info/suppliers/:id` | `suppliers` | Да (partial update) | `bank` → `bankId` write отложен; GAS должен слать PATCH |
| Supplier↔Item | `GET /api/items/erp/suppliers-items/list` | `items_suppliers`, `items`, `suppliers` | **Да** для ERP/Sheets | Dual storage: directory/PATCH ещё на `items`; sync items→link — только через миграцию/backfill |
| Counterparties | `GET /api/info/contaminants` | `contaminants`, `banks` | Да для полного списка | Не фильтрует `deleted_at`; NPE risk если `bank` null; нет incremental |
| Orders | `GET /api/orders/dynamic` | `orders_v2` + stocks via service | Нет для «накопления заказов» — это analytics | Нужен raw/list export |
| Stocks | `GET /api/stocks/v2/current` | `marketplace_items`, `stocks`, `warehouses`, suppliers | Частично: snapshot «сегодня» по MP | Агрегат без warehouse rows; нет history API (v1 by-date off) |
| MarketplaceItems | (через directory / erp / stop-list / stocks) | `marketplace_items` | Нет отдельного list API | **NEEDS DECISION**: отдельный endpoint vs nested в items |

---

## Required API

### Items

**Источник истины**

- Общие поля товара: `items` (FACT, domain doc).
- Marketplace-specific: `marketplace_items` (identity, listing, prices, `send_status_id`, `deleted_at`).

**Существует и подходит частично:** `GET /api/items/directory/list`.

**Существует для ERP/Sheets (FACT, 2026-08-11):** `GET /api/items/erp/list`.

Response ERP (FACT):
- с `items`: `id`, `article`, `title`, `category`, `ownCategory`
- с активного WB `marketplace_items` (`deletedAt IS NULL`): `image`, `color`, `barcode`
- filter: `isArchive = false`; optional `withTestArticles=false` → exclude `createdForCalculation`
- объём ~400 rows — pagination не требуется (**FACT**, владелец)

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

**PATCH `/api/info/suppliers/:id` (FACT):** partial update (`@IsOptional` на всех полях DTO). `bank` (title) — только проверка существования; запись `bankId` **отложена**.

```text
GET /api/info/suppliers
PATCH /api/info/suppliers/:id

Назначение: справочник + правка поставщиков для Sheets.

Источник: suppliers + banks (LEFT JOIN на read).

Фильтры: updatedSince? (опционально, поля пока не в API).

Поля: см. entity; timestamps в API — NEEDS DECISION.

Пагинация: не нужна (малый справочник).

Сортировка: id ASC (сейчас); rank — NEEDS DECISION для Sheets.

Особенности: bank write отложен; не слать bank в PATCH, если не готовы к no-op validate.
```

### Supplier ↔ Item

**Источник:** `items_suppliers` + join `items`, `suppliers`.

**Phase 1 (FACT, 2026-08-12):** supplier-specific поля на связи:
`supplierMinimumOrder`, `boxNumber`, `costInYuan`, `costInYuanWhite`, `multiplicity`, `assembling`, `production`.

Миграция `1789300000000`: ADD колонки + backfill из `items` для существующих связей. Колонки на `items` **не удалены**.

**Dual storage (DECISION, временно):**
- `GET /api/items/directory/list`, `PATCH /api/items/directory/info` — read/write supplier-fields с **`items`**
- `GET /api/items/erp/suppliers-items/list` — read с **`items_suppliers`**
- ~50 items без `items_suppliers` — данные только на `items`, в ERP suppliers-items list не попадают

**GET `/api/items/erp/suppliers-items/list` (FACT):**

Response: `itemId`, `supplierId`, `article`, `title`, `category`, `supplierTitle`, `supplierMinimumOrder`, `boxNumber`, `costInYuan`, `costInYuanWhite`, `multiplicity`, `assembling`, `production`.

Filter: `isArchive = false`; optional `withTestArticles=false`.

**Phase 2 (отложено):** drop колонок с `items`; переключить directory/PATCH на `items_suppliers`; backfill/create links для orphan items.

### Counterparties

**Источник:** `contaminants` (+ nested `banks`). В `PROJECT_CONTEXT` названы контрагентами.

Связи с `suppliers` / `items` в схеме **отсутствуют** (FACT).

**Существует:** `GET /api/info/contaminants`.

Риски: `deletedAt` не фильтруется; `contaminant.bank.title` без null-check.

```text
GET /api/info/contaminants  (reuse + harden)
  и/или GET /api/sheets/counterparties (alias naming)

Назначение: справочник контрагентов.

Источник: contaminants LEFT JOIN banks.

Фильтры: includeDeleted? (default false), updatedSince?

Поля: как сейчас + deletedAt? + bank nullable object.

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

**Закомментированы:** v1 current, by-date.

Transition: stocks уже на `marketplace_item_id`; не возвращать к `item_id`.

```text
GET /api/sheets/stocks
  (или вернуть/переработать /api/stocks/by-date + warehouse detail)

Назначение: выгрузка остатков для накопления в Sheets по МП.

Источник: stocks + warehouses + marketplace_items + items + marketplaces.

Фильтры:
  marketplace (required)
  date = YYYY-MM-DD (default today) OR from/to
  optional: warehouseIds, suppliers, updatedSince

Основные поля (концепт):
  stockId?, date, marketplaceTitle, warehouseId, warehouseTitle, warehouseType,
  marketplaceItemId, article, sku, barcode,
  currentValue, reserved, promised

Пагинация: обязательно при warehouse-level rows.

Сортировка: warehouseId, marketplaceItemId.

Особенности: объём растёт каждый день; Sheets должна забирать один день / delta,
  не всю историю; excludeWarehouses hardcode в current API — NEEDS DECISION
  сохранять ли в Sheets API.
```

---

## Architecture Decisions

Решения **до** реализации кода:

1. **Namespace API** — `NEEDS DECISION`  
   - A) новый prefix `/api/sheets/*` (чистый read-model, не ломает GAS на старых URL);  
   - B) расширять существующие `/items`, `/orders`, `/stocks`, `/info`;  
   - C) hybrid: справочники reuse `/info`, heavy data → `/sheets`.

2. **Items: reuse directory vs new endpoint** — `NEEDS DECISION`  
   - Directory уже близко к нужному; ломать shape опасно, если GAS живёт на нём.

3. **Supplier cardinality в UI** — `NEEDS DECISION`  
   - Схема M2M, directory/PATCH ведут себя как 1 supplier на item.  
   - Sheets таблица связей предполагает M2M. Согласовать write-back правила.

4. **Raw orders vs dynamic** — `NEEDS DECISION` (рекомендация исследования: **отдельный list**, dynamic не трогать).

5. **Stocks grain** — `NEEDS DECISION`  
   - A) warehouse-level rows;  
   - B) агрегат как v2/current;  
   - C) оба endpoint’а.

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
| Stocks | mp_items × warehouses × days | **обязательна** | mp + date | **by snapshot date** (не всю историю) |

Существующая архитектура **частично** позволяет incremental только там, где уже есть date/`updated_at` filters — **сейчас таких query params в read API почти нет** (FACT: directory/suppliers/contaminants грузят всё; stocks = today; orders/dynamic = N days aggregate).

---

## TODO

- [ ] Закрыть Architecture Decisions (namespace, items reuse, M2M suppliers, stocks grain, auth).
- [ ] Зафиксировать целевые response DTO (поля) вместе с владельцем Sheets/GAS.
- [ ] Inventory текущего GAS: какие URL уже вызываются (**NEEDS VERIFICATION** вне этого репо).
- [x] Suppliers: расширить response (`bank`, warehouse fields) — FACT; миграция `1789209600000`.
- [x] Suppliers: поле `contract`; PATCH DTO + `@IsOptional` — FACT; миграция `1789212000000`.
- [x] Suppliers: HTTP method `PATCH /api/info/suppliers/:id`.
- [x] Items ERP list: `GET /api/items/erp/list` (WB image/color/barcode).
- [x] Supplier↔Item Phase 1: колонки + backfill `1789300000000`; ERP read `GET /api/items/erp/suppliers-items/list`.
- [ ] Supplier↔Item Phase 2: drop columns on `items`; directory/PATCH → `items_suppliers`; orphan ~50 items.
- [ ] Suppliers: запись `bankId` из `bank` title (сейчас только validate).
- [ ] Counterparties: filter `deleted_at`, null-safe bank.
- [ ] Создать paginated orders list (raw `orders_v2`), не ломая `/orders/dynamic`.
- [ ] Создать stocks export (date + marketplace; grain — по decision).
- [ ] Единый api-key guard на Sheets routes.
- [ ] Документировать контракт в `docs/` (после первой реализации).
- [ ] Нагрузочная проверка объёма orders/stocks на prod (**NEEDS VERIFICATION** counts).

## IN PROGRESS

- (пусто) — suppliers/items ERP готовы к выкладке; `bankId` write отложен.

## DONE

- [x] Исследование entities / controllers / services / DTOs / crons по доменам.
- [x] Карта существующих API.
- [x] Черновик недостающих endpoints (проектирование).
- [x] Создание `docs/roadmap/google-sheets-api.md`.
- [x] Suppliers schema + GET/PATCH API (без bankId write).
- [x] Items `title`/`category` + ERP list endpoint.
- [x] Supplier↔Item Phase 1 (schema + backfill + ERP read endpoint).

## BLOCKERS

- Dual storage items vs items_suppliers до Phase 2 — directory/PATCH и ERP suppliers-items могут расходиться после правок только на `items`.
- ~50 items без `items_suppliers` — не в ERP suppliers-items list; данные только на `items`.
- Transition M6 параллельно: нельзя ломать `marketplace_item_id` / dual archive semantics.

## NEXT STEP

**Deploy:** миграция `1789300000000` (backfill на `items_suppliers`, колонки на `items` остаются). GAS: `GET /api/items/erp/suppliers-items/list` для таблицы связей. Phase 2 — после закрытия ~50 orphan items.

---

## Appendix A — Что можно переиспользовать

| Что | Как |
|-----|-----|
| `InfoService.getSuppliersList` / `updateSupplier` | ✔ read + partial PATCH |
| `ItemsService.getItemsErpList` | ✔ ERP/Sheets items + WB listing fields |
| `ItemsService.getSuppliersItemsErpList` | ✔ ERP/Sheets item↔supplier (read from `items_suppliers`) |
| `InfoService.getContaminantsList` | Harden + soft-delete filter |
| `ItemsService.getItemsDirectoryList` | Эталон полей item + `marketplacesInfo`; либо обёртка Sheets |
| `StocksService.getStocks` / `getCurrentStocksV2` | Логика join mp+item+stocks+suppliers; grain другой |
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
| Dual storage items / items_suppliers | Directory пишет `items`, ERP suppliers-items читает `items_suppliers` — рассинхрон до Phase 2 |
| ~50 orphan items | Нет строки в `items_suppliers` — не попадают в ERP suppliers-items list |
| Hardcoded excludeWarehouses | В stocks/stop-list; копировать вслепую опасно |
| Contaminants.bank null | Runtime error |
| Неполная api-key проверка | Security |
| WIP GET update supplier | Ломает REST expectations |
| Dual archive | `isArchive` vs `deleted_at` — путать нельзя |

## Appendix D — Вопросы NEEDS DECISION

1. Prefix `/api/sheets/*` или расширение существующих путей?
2. Ломать/версионировать `directory/list` или новый read-model рядом?
3. Sheets показывает **все** suppliers на item или по-прежнему одного?
4. Нужны ли raw order rows или достаточно `/orders/dynamic`?
5. Остатки: warehouse-level или агрегат? История по датам?
6. Включать ли Tamov кабинеты в те же таблицы Sheets?
7. Нужен ли write API в этой волне (suppliers/counterparties/items) или только read?
8. Alias `counterparties` vs оставить `contaminants`?
9. Добавлять ли `created_at`/`updated_at` на `items_suppliers` (миграция)?
10. Нужны ли в items export `send_status` / archived listings?

---

## Research log

| Дата | Итог |
|------|------|
| 2026-08-12 | Supplier↔Item Phase 1: migration backfill `1789300000000`; ERP `GET /api/items/erp/suppliers-items/list`; directory/PATCH остаются на `items` |
| 2026-08-11 | Suppliers schema + GET/PATCH; ERP items list; docs updated for prod |
