# AI_CONTEXT — оперативная память проекта

> Оперативные решения. При противоречии с кодом — верить коду.  
> Обновляет разработчик; AI может предложить дополнение.

Связанные: [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md), [`domain/items-and-marketplace-items.md`](domain/items-and-marketplace-items.md), [`roadmap/items-marketplace-items-migration.md`](roadmap/items-marketplace-items-migration.md), [`roadmap/marketplace-product-creation.md`](roadmap/marketplace-product-creation.md), [`roadmap/moysklad-fbs.md`](roadmap/moysklad-fbs.md).

---

## Текущая позиция миграции (FACT, 2026-08-10)

**Milestone 6 — Cutover (в работе).** M1–M5 закрыты на prod. Price crons → mp.  
**DECISION:** `items.isArchive` **оставляем** (product-level hide). Listing archive = `marketplace_items.deleted_at`.  
Второй кабинет Ozon: `marketplaces.title = 'Ozon Tamov'` (env `ozonTamov*`) — cards/stocks/orders/prices/trash/stop-list/directory PATCH ✔.  
Yandex Tamov: cards/stocks/orders/stop-list PATCH/trash ✔.

---

## Принятые решения

- `items` + `marketplace_items`; возврат к `item == listing` **запрещён**.
- **1 item на article** (кроме `created_for_calculation = true`).
- Marketplace-specific на `marketplace_items`: identity, listing, prices (`discount` = %), `send_status_id`, `deleted_at`.
- Marketplace-independent на `items`: article, логистика/себестоимость/classification, `wbCreatedAt`, **`isArchive`**.
- Supplier-link на `items_suppliers`: Phase 2 supplier-fields + Phase 3 `payment` / `dimensionsFact` / `dimensionsMasterBox` / `volume` + `ownImagesUrl` (`1789460000000`). Dual-write на `items` **снят** (`1789370000000`). Phase 4 (`178944`): per-size rows (`item_characteristic_id`) + `deleted_at`; ERP `PATCH /api/items/erp/suppliers-items/list` может менять `supplierId` по title (`supplier`).
- **Два уровня скрытия (DECISION, 2026-08-10):**
  - `marketplace_items.deleted_at` — архив **listing**.
  - `items.isArchive` — скрытие **товара** в directory. Optional rename → `isDeleted` позже.
- `send_status_id` — только `marketplace_items`.
- `stocks` / `orders_v2` — только `marketplace_item_id`.
- `directions`, legacy `orders`, `change_prices_histories` — удалены.
- UI — Google Sheets + GAS; frontend в репо не создавать.
- Stop-list read — только `GET /api/items/v2/stop-list`.
- **Stocks read for Sheets:** `GET /api/stocks/by-warehouses` (сегодня, warehouse-level). **DECISION (2026-08-15):** stocks by-date / v1 history **не возвращаем**.
- **Price crons pagination:** **DECISION (2026-08-15):** не нужна — в кабинетах ≤ ~400 SKU (лимит API 1000 хватает).
- **Вторые кабинеты (не хардкодить title, не смешивать с основным):**
  - Yandex — `marketplaces.title = 'Yandex Tamov'`; env `yandexTamov*`.
  - Ozon — `marketplaces.title = 'Ozon Tamov'`; env `ozonTamovToken` / `ozonTamovClientId`. Legacy name `Ozon Second` / `ozonSecond*` **снят**.
- **Hard-delete склада (DECISION, 2026-08-24):** `orders_v2.warehouse_id` и `stocks.warehouse_id` → `warehouses` с `onDelete: RESTRICT` (`1789430000000`). Soft-delete склада — `warehouses.deleted_at`.

---

## Завершено (FACT, 2026-08-10)

| Область | Статус |
|---------|--------|
| M1–M5 (schema + consolidation prod + price crons main WB/Ozon) | ✔ |
| Dual archive model (`isArchive` + `deleted_at`) | ✔ DECISION |
| Ozon Tamov: config + cards/stocks/orders_v2/warehouses cron | ✔ |
| Ozon Tamov: prices + trash crons (`ozonTamov*`, title `Ozon Tamov`) | ✔ (2026-08-15) |
| Warehouse identity scoped by `marketplaceId` (stocks/orders/warehouses) | ✔ |
| API DTO marketplace: `Ozon Tamov` (не `Ozon Second`) | ✔ |

---

## В работе / следующие шаги (M6)

| Область | Статус |
|---------|--------|
| `items_sizes` → characteristics / mp sizes | ✔ mp sizes + backfill `item_characteristics` (`1789360000000`) + WB sync |
| Ozon Tamov gaps: directory PATCH | ✔ Tamov ветки в `updateArrayDirectoryItemsInfoV2` |
| Yandex Tamov: trash sync | ✔ `getYandexTrashItemsFirst/Second`; soft-delete `marketplace_items.deleted_at` |
| Drop Phase 3 / obsolete с `items` | ✔ `1789370000000` (+ `replenishment_period` / `remaining_balance`) |
| Stocks API v1 / by-date | ✖ **не делаем** — Sheets на `GET /api/stocks/by-warehouses` |
| Price crons pagination >1000 | ✖ **не нужна** — ≤~400 SKU/кабинет |
| Cleanup orphan DTO / dead stop-list fields | ✔ (2026-08-15): `get-items-list.dto` + legacy `GetStopListFromDb` / `direction*` |
| Rename `isArchive` → `isDeleted` | □ optional later |
| **Create карточек через GAS** | `POST /api/items/create-on-marketplaces` + cron `createMpItems` / `WbCardPublisher`; poll/`marketplace_items` — ещё нет |
| **Справочник категорий МП** | ✔ schema `marketplace_categories` (`1789420000000`); sync cron WB/Ozon по whitelist (`WB_CATEGORY_PARENTS`, `OZON_CATEGORY`); API для GAS — backlog |
| Warehouse FK RESTRICT | ✔ `1789430000000` (`orders_v2` + `stocks` → `warehouses`) |
| Yandex listing dedup | one-off `scripts/dedup-yandex-marketplace-items.ts` (keep = актуальный `marketSku`); unique index ещё нет |
| **Мой склад FBS (WB)** | schema ✔ `1789450000000` (mappings / item_links / outbox); client + stock push + worker — дальше; Ozon позже. См. [`roadmap/moysklad-fbs.md`](roadmap/moysklad-fbs.md) |
| **In-app LLM agent** | spike: `POST /api/ai/chat`, DeepSeek (`DEEPSEEK_API_KEY`), tools `get_order_statistics` / `get_order_statistics_by_marketplace` / `compare_order_periods` (два периода одним запросом, разницу считает LLM) → `orders_v2`; фильтры `marketplaceTitle` (общий `z.enum`), `article` (`items.article` через `marketplace_items`), склад; zod-валидация аргументов (`AiToolExecutor`; даты — `z.iso.datetime({ local: true, offset: true })`). Write-tool `create_test_item` (2026-09-12) → `ItemsAiToolsService.createTestItem` (отдельный сервис, `ItemsService` не менялся): расчётный товар (`created_for_calculation`) с габаритами/категорией; write-tools на реальные данные — по-прежнему без плана нельзя. Auth / лимиты / multi-turn — backlog. См. [`ai/in-app-agent.md`](ai/in-app-agent.md). **Не путать** с [`ai/agent-guide.md`](ai/agent-guide.md) (Cursor). |

---

## Known issues

| Issue | Суть |
|-------|------|
| Ozon Tamov warehouses | ✔ First/Second cron; lookup `marketplaceInternalNumber` + `marketplaceId` |
| Ozon stocks warehouse resolve | FBO (`getOzonStocks`): по `title` + `marketplaceId`; без find-or-create. FBS own (`getOzonOwnStocks`): по `marketplaceInternalNumber` + `marketplaceId`, склады `type=FBS` |
| Ozon Tamov prices / trash | ✔ First/Second crons; credentials `ozon*` / `ozonTamov*`; mp by title |
| Stop-list PATCH | ✔ WB / `Озон` / Yandex / Ozon Tamov / Yandex Tamov |
| Directory PATCH | ✔ WB / `Озон` / Yandex / Ozon Tamov / Yandex Tamov |
| Price API limit 1000 | ✔ достаточно (≤~400 SKU/кабинет); pagination не делаем |
| Card sync find by article | без `created_for_calculation = false` — риск test item |
| Duplicate `marketplace_items` | **FACT:** Yandex remap `marketSku` при том же `offerId` → второй listing: `getYandexItems` ищет только по `(marketplace_identifier, marketplace_id)`, не по `(item_id, marketplace_id)`. Cleanup: `npm run dedup:yandex-listings` (`-- --apply` пишет БД). Unique index всё ещё отложен (`178940`). Cron **не** чинили — дубли могут появиться снова |
| Ozon warehouses cron | FBO: `/v1/warehouse/ozon/list` + FULL_FILLMENT. FBS/rFBS: `/v2/warehouse/list` → `type=FBS` (`getOzonOwnWarehouses` First/Second) |
| Ozon FBS own stocks | ✔ First (`Озон`, `ozon*`): `getOzonOwnStocksFirst` → `POST /v1/product/info/warehouse/stocks`. Tamov Second — ещё нет |
| Ozon FBS orders | ✔ First/Second: `getOrdersOzonFbsFirst` / `getOrdersOzonFbsSecond` → `getOrdersFbsOzon`; API `POST /v4/posting/fbs/list` (cursor, `postings` на верхнем уровне — не `result` как в v3). Склад: `delivery_method.warehouse_id` → `warehouses.marketplaceInternalNumber` + `marketplaceId` (`type=FBS`). Listing: `marketplace_items.sku`. Окно дат ~2 суток (как FBO; статус старше окна не обновится). **Не путать** с Мой склад FBS (`roadmap/moysklad-fbs.md` — Ozon outbox ещё later) |

---

## Не менять без плана

Drop `marketplace_id` на `stocks`/`orders_v2`; force cutover без миграции; возврат stocks by-date/v1; секреты в репо; drop/rename `items.isArchive` без явного решения.

---

## История

| Дата | Итог |
|------|------|
| 2026-09-12 | AI tool `create_test_item` (`CreateTestItemTool`, первый write-tool): отдельный `ItemsAiToolsService.createTestItem` (`src/items/services/`, в `ItemsModule.exports`) принимает габариты (строки см/кг, regex-валидация) и категорию → `items.category` + `marketplace_items.category`/`dimensions`/`volume` (WB — ceil габаритов, Ozon — фактические); возвращает `{ id, article }`. Legacy `POST /api/items` / `ItemsService.createTestItem` не менялись. `AiTool` interface перенесён в `src/ai/tools/ai-tool.interface.ts` |
| 2026-09-11 | AI tool `compare_order_periods` (`CompareOrderPeriodsTool`, `OrdersStatisticsService.comparePeriods`): агрегаты `orders_v2` за два периода, условные `COUNT/SUM(CASE …)` в одном запросе. Фильтр `article` во всех AI tools статистики; `marketplaceTitle` → `z.enum` (`marketplace-title.schema.ts`) |
| 2026-09-08 | `ownImagesUrl` → `items_suppliers` (`1789460000000`); backfill на все строки связи; drop с `items`; ERP PATCH / directory read+fan-out write |
| 2026-09-07 | Ozon FBS orders → `orders_v2`: `/v4/posting/fbs/list`, cron First (`Озон`) / Second (`Ozon Tamov`); склад по `delivery_method.warehouse_id`. Мой склад Ozon FBS по-прежнему later |
| 2026-09-01 | AI tools → zod: `AiTool.parameters` = zod-схема (`z.toJSONSchema` для DeepSeek), `AiToolExecutor` (lookup + parse + validate), схемы в `src/ai/tools/orders/dto/`; DTO статистики из orders удалены (orders теперь типизирован от ai-схем). Tool `get_order_statistics_by_marketplace`. Telegram-спайк удалён (`src/telegram`, `nestjs-telegraf`/`telegraf`) |
| 2026-08-28 | In-app LLM agent (spike): модуль `src/ai`, DeepSeek, `POST /api/ai/chat`, tool статистики заказов; env `DEEPSEEK_API_KEY`; docs [`ai/in-app-agent.md`](ai/in-app-agent.md) |
| 2026-08-27 | Ozon FBS own stocks cron для 1 кабинета (`Озон`): `getOzonOwnStocksFirst` / `getOzonOwnStocks`; API `/v1/product/info/warehouse/stocks`; lookup склада по `marketplaceInternalNumber` |
| 2026-08-26 | Мой склад FBS v1: schema `moysklad_*` (`178945`); outbox create/cancel по mapping; WB only |
| 2026-08-06 | AI-ready docs; Sheets; field split; stop-list v1 off |
| 2026-08-07 | M1–M4; send_status mp-centric; Yandex Tamov card/stocks/orders |
| 2026-08-10 | M5 prod; price crons → mp; Ozon Tamov; warehouses/stocks scoped by `marketplaceId` |
| 2026-08-15 | Item characteristics schema-only: `characteristics` / `characteristic_values` / `item_characteristics` (`1789330000000`); без backfill/API |
| 2026-08-15 | Marketplace characteristics schema-only: `marketplace_characteristics` / `marketplace_item_characteristics` / `marketplace_item_sizes` / `marketplace_characteristic_mappings` (`1789340000000`); без sync/API |
| 2026-08-15 | WB card sync → `marketplace_item_sizes` (+ `metadata.skus`); characteristics sync ещё нет |
| 2026-08-15 | Drop `items_sizes` (`1789350000000`); directory/list → `marketPlaceItemsSizes` from mp sizes |
| 2026-08-15 | Ozon Tamov: price cron + trash cron (паттерн First/Second, как cards) |
| 2026-08-15 | directory/ERP `marketPlaceItemsSizes` по MP; stop-list PATCH + GET filter — Tamov кабинеты |
| 2026-08-17 | Backfill `item_characteristics` «Размер» из `marketplace_item_sizes`; WB sync поддерживает product-level sizes |
| 2026-08-18 | Product creation v1: WB; outbox+FSM+`WbCardPublisher`; `subjectID` = категория WB; справочник categories per MP — backlog |
| 2026-08-20 | `marketplace_categories` + whitelist sync WB/Ozon; `getOzonItems` — category title из БД, не category tree API |
| 2026-08-24 | `178943`: warehouse FK CASCADE→RESTRICT на `orders_v2`/`stocks`; Ozon warehouses sync только FBO; excludeWarehouses расширен |
| 2026-08-24 | Yandex dedup script: keep актуальный `marketSku`, stocks/orders reassign или delete при конфликте, loser listing hard-delete; unique index / fix card sync — ещё нет |
| 2026-08-24 | WB create: `WbCardPublisher` генерирует баркоды (`/content/v2/barcodes`) и кладёт в `sizes[0].skus` до upload |
| 2026-08-17 | Drop с `items`: Phase 3 + габариты/плотность + `replenishment_period` / `remaining_balance` (`1789370000000`); dual-write снят; directory DTO без dead planning fields |
