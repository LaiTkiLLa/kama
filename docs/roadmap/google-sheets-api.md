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
| Items | `items` | marketplace-independent; `isArchive` = product hide; **`title` / `category`** — product-level (backfill из WB mp, миграция `1789209600000`) |
| MarketplaceItems | `marketplace_items` | listing, prices, `send_status_id`, `deleted_at` |
| Suppliers | `suppliers` (+ `banks` via `bank_id`) | справочник поставщиков |
| Supplier ↔ Item | `items_suppliers` | M2M; unique `(item_id, supplier_id)`; только FK ids |
| Counterparties | `contaminants` (+ `banks`) | в docs/UI — «контрагенты»; связь с suppliers **нет** |
| Orders | `orders_v2` | source of truth; legacy `orders` удалён |
| Stocks | `stocks` | дневные снимки; FK `marketplace_item_id`, `warehouse_id`, `marketplace_id` |
| Supporting | `marketplaces`, `warehouses`, `statuses`, `items_sizes`, `low_days_stocks` | не primary Sheets targets сейчас |

### Существующие HTTP endpoints (FACT)

| Method | Path | Модуль | Назначение |
|--------|------|--------|------------|
| GET | `/api/info/statuses` | info | статусы по `type` |
| GET | `/api/info/suppliers` | info | список поставщиков |
| GET | `/api/info/contaminants` | info | список контрагентов + bank |
| GET | `/api/items/directory/list` | items | справочник товаров + `marketplacesInfo[]` |
| PATCH | `/api/items/directory/info` | items | обновление directory (в т.ч. один supplier по title) |
| GET | `/api/items/v2/stop-list` | items | stop-list (операционный) |
| PATCH | `/api/items/stop-list` | items | обновление send status |
| POST | `/api/items` | items | тестовый item (не для Sheets prod) |
| GET | `/api/orders/dynamic` | orders | **агрегированная** динамика заказов + остатки |
| GET | `/api/stocks/v2/current` | stocks | **агрегированные** текущие остатки (сегодня) |
| ~~GET~~ | `/api/stocks/current` | stocks | **закомментирован** |
| ~~GET~~ | `/api/stocks/by-date` | stocks | **закомментирован** |

**WIP в working tree (не считать prod-готовым):** `GET /api/info/suppliers/:id` + `updateSupplier` — update через GET+Body (**некорректный HTTP method**). Не включать в «готовые» API до исправления.

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
| Items | `GET /api/items/v2/stop-list` | `marketplace_items`, `items`, stocks/orders aggregates | Нет как общий каталог | Операционный stop-list, не directory export |
| Items | `PATCH /api/items/directory/info` | `items`, `marketplace_items`, `items_suppliers` | Write-back из Sheets (уже есть) | Write трактует supplier как 1:1, не M2M |
| Suppliers | `GET /api/info/suppliers` | `suppliers`, `banks` | Да для полного справочника (малый объём) | Response расширен (bank, warehouse fields); нет audit timestamps в API; нет pagination (ок, если мало) |
| Supplier↔Item | — | `items_suppliers` | **Нет endpoint** | Нужен read API |
| Counterparties | `GET /api/info/contaminants` | `contaminants`, `banks` | Да для полного списка | Не фильтрует `deleted_at`; NPE risk если `bank` null; нет incremental |
| Orders | `GET /api/orders/dynamic` | `orders_v2` + stocks via service | Нет для «накопления заказов» — это analytics | Нужен raw/list export |
| Stocks | `GET /api/stocks/v2/current` | `marketplace_items`, `stocks`, `warehouses`, suppliers | Частично: snapshot «сегодня» по MP | Агрегат без warehouse rows; нет history API (v1 by-date off) |
| MarketplaceItems | (через directory / stop-list / stocks) | `marketplace_items` | Нет отдельного list API | **NEEDS DECISION**: отдельный endpoint vs nested в items |

---

## Required API

### Items

**Источник истины**

- Общие поля товара: `items` (FACT, domain doc).
- Marketplace-specific: `marketplace_items` (identity, listing, prices, `send_status_id`, `deleted_at`).

**Существует и подходит частично:** `GET /api/items/directory/list`.

Response (FACT, текущий shape): item fields + `supplierTitle` (только `[0]`) + `marketplacesInfo[]` (`title`, dimensions, volume, sku, marketplaceIdentifier, category, barcode, image, color, itemTitle, price, discount, priceWithDiscount).

**Не хватает для Sheets-накопления**

- пагинация / cursor;
- filter `updatedAt` / ids;
- все suppliers (не один title);
- опционально `isArchive` / calculation items policy;
- стабильный DTO без внутренних entity leaks.

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

Поля entity (FACT, 2026-08-11): `id`, `title`, `contact`, `paymentTerms`, `typeOfMutualSettlements`, `legalTitle`, `legalAddress`, `accRaschet`, `bankId` → nested `bank`, `reliabilityRating`, `warehouseAddress`, `responsibleEmployee`, `comment`, `creditLimit`, `canBeAbleToStoreInWarehouse`, `numberOfStorageDays`, `webSite`, `rank`, `createdAt`, `updatedAt`.

**Удалено:** `typeOfCalculation` (миграция `1789209600000`).

**GET `/api/info/suppliers` (FACT):** отдаёт все поля выше, кроме `createdAt`/`updatedAt`; `bank` — nullable object как у contaminants.

```text
GET /api/info/suppliers  (reuse; response ✔ расширен)

Назначение: справочник поставщиков для Sheets.

Источник: suppliers + banks (LEFT JOIN).

Фильтры: updatedSince? (опционально, поля пока не в API).

Поля: см. entity; timestamps в API — NEEDS DECISION.

Пагинация: обычно не нужна (малый справочник) — NEEDS VERIFICATION объём.

Сортировка: id ASC (сейчас); rank — NEEDS DECISION для Sheets.

Особенности: write endpoint WIP/broken (GET update); отдельно решить PATCH + новые поля в DTO.
```

### Supplier ↔ Item

**Источник:** `items_suppliers` (FACT). Поля связи: `id`, `itemId`, `supplierId`. Дополнительных атрибутов на связи **нет**.

**Существующего list endpoint нет.** Directory и PATCH directory используют связь, но:

- read: только первый supplier title;
- write: обновляет все rows item → один `supplierId` (фактически 1:1 UX при M2M схеме).

```text
GET /api/sheets/item-suppliers
  (или /api/info/item-suppliers)

Назначение: плоская таблица связей для Sheets.

Источник: items_suppliers (+ optional join article / supplier.title для UX).

Фильтры: itemIds?, supplierIds?, updatedSince? (на join tables — timestamps на связи нет!).

Основные поля: relationId, itemId, article?, supplierId, supplierTitle?

Пагинация: да, если связей много.

Сортировка: id ASC.

Особенности: на связи нет created_at/updated_at → incremental только full reload
  или по ids (NEEDS DECISION: добавлять audit columns позже — отдельная миграция,
  не делать без подтверждения).
```

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
| Items (+ listings) | сотни–тысячи rows (**ASSUMPTION**) | желательна | mp, archive, ids | `items.updated_at` / `marketplace_items.updated_at` |
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
- [x] Suppliers: расширить response (`bank`, warehouse fields) — **FACT 2026-08-11**; миграция `1789209600000`.
- [ ] Suppliers: миграция на prod; PATCH/update DTO под новые поля.
- [ ] Counterparties: filter `deleted_at`, null-safe bank.
- [ ] Создать read API `item-suppliers` (без новой entity).
- [ ] Создать paginated orders list (raw `orders_v2`), не ломая `/orders/dynamic`.
- [ ] Создать stocks export (date + marketplace; grain — по decision).
- [ ] Items Sheets read: pagination + incremental (+ multi-supplier), strategy A/B.
- [ ] Единый api-key guard на Sheets routes.
- [ ] Документировать контракт в `docs/` (после первой реализации).
- [ ] Нагрузочная проверка объёма orders/stocks на prod (**NEEDS VERIFICATION** counts).

## IN PROGRESS

- Исследование + этот roadmap (документ).
- Локальный WIP по suppliers update (`GET suppliers/:id`) — **не часть Sheets read roadmap**; требует исправления method/валидации отдельно.

## DONE

- [x] Исследование entities / controllers / services / DTOs / crons по доменам.
- [x] Карта существующих API.
- [x] Черновик недостающих endpoints (проектирование).
- [x] Создание `docs/roadmap/google-sheets-api.md`.

## BLOCKERS

- Нет подтверждённого списка полей, которые Sheets реально должны показывать (кроме того, что уже в directory/info APIs) — **NEEDS DECISION** с владельцем процесса.
- Нет доступа к коду GAS в этом репозитории — какие endpoints уже используются: **NEEDS VERIFICATION**.
- Объёмы prod таблиц не измерены в этом исследовании — **NEEDS VERIFICATION**.
- Несогласованность M2M `items_suppliers` vs 1-supplier UX в directory PATCH.
- Transition M6 параллельно: нельзя ломать `marketplace_item_id` / dual archive semantics.

## NEXT STEP

**Согласовать Architecture Decisions #1–#6 с Федором** (namespace `/api/sheets` vs reuse; raw orders; stocks grain; supplier M2M; incremental), затем зафиксировать контракт первого endpoint (рекомендуемый старт: `GET item-suppliers` + harden `GET suppliers` / `GET contaminants` — низкий риск).

---

## Appendix A — Что можно переиспользовать

| Что | Как |
|-----|-----|
| `InfoService.getSuppliersList` | Расширить mapping полей |
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
| Дублирование | dynamic orders ≠ raw; directory supplier ≠ full M2M |
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
| 2026-08-11 | Suppliers: drop/recreate table `1789209600000`; items `title`/`category` backfill from WB mp |
