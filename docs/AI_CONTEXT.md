# AI_CONTEXT — оперативная память проекта

> Оперативные решения. При противоречии с кодом — верить коду.  
> Обновляет разработчик; AI может предложить дополнение.

Связанные: [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md), [`domain/items-and-marketplace-items.md`](domain/items-and-marketplace-items.md), [`roadmap/items-marketplace-items-migration.md`](roadmap/items-marketplace-items-migration.md).

---

## Текущая позиция миграции (FACT, 2026-08-10)

**Milestone 6 — Cutover (в работе).** M1–M5 закрыты на prod. Price crons → mp.  
**DECISION:** `items.isArchive` **оставляем** (product-level hide). Listing archive = `marketplace_items.deleted_at`.  
Второй кабинет Ozon: `marketplaces.title = 'Ozon Tamov'` (env `ozonTamov*`) — cards/stocks/orders sync ✔; gaps ниже.

---

## Принятые решения

- `items` + `marketplace_items`; возврат к `item == listing` **запрещён**.
- **1 item на article** (кроме `created_for_calculation = true`).
- Marketplace-specific на `marketplace_items`: identity, listing, prices (`discount` = %), `send_status_id`, `deleted_at`.
- Marketplace-independent на `items`: article, логистика/себестоимость/classification, `wbCreatedAt`, `ownImagesUrl`, **`isArchive`**.
- Supplier-link на `items_suppliers`: Phase 2 supplier-fields; Phase 3 (dual-write) `payment`, `dimensionsFact`, `dimensionsMasterBox`, `volume`. Drop с `items` — отдельно.
- На `items` до отдельного drop: `volumeMasterBox`, `volumePerUnit`, `weightPerUnit`, `density` (не на связи).
- **Два уровня скрытия (DECISION, 2026-08-10):**
  - `marketplace_items.deleted_at` — архив **listing**.
  - `items.isArchive` — скрытие **товара** в directory. Optional rename → `isDeleted` позже.
- `send_status_id` — только `marketplace_items`.
- `stocks` / `orders_v2` — только `marketplace_item_id`.
- `directions`, legacy `orders`, `change_prices_histories` — удалены.
- UI — Google Sheets + GAS; frontend в репо не создавать.
- Stop-list read — только `GET /api/items/v2/stop-list`.
- **Вторые кабинеты (не хардкодить title, не смешивать с основным):**
  - Yandex — `marketplaces.title = 'Yandex Tamov'`; env `yandexTamov*`.
  - Ozon — `marketplaces.title = 'Ozon Tamov'`; env `ozonTamovToken` / `ozonTamovClientId`. Legacy name `Ozon Second` / `ozonSecond*` **снят**.

---

## Завершено (FACT, 2026-08-10)

| Область | Статус |
|---------|--------|
| M1–M5 (schema + consolidation prod + price crons main WB/Ozon) | ✔ |
| Dual archive model (`isArchive` + `deleted_at`) | ✔ DECISION |
| Ozon Tamov: config + cards/stocks/orders_v2/warehouses cron | ✔ |
| Warehouse identity scoped by `marketplaceId` (stocks/orders/warehouses) | ✔ |
| API DTO marketplace: `Ozon Tamov` (не `Ozon Second`) | ✔ |

---

## В работе / следующие шаги (M6)

| Область | Статус |
|---------|--------|
| `items_sizes` → characteristics / mp sizes | ✔ mp schema + WB sizes sync; `items_sizes` drop (`1789350000000`); item_characteristics backfill — позже |
| Ozon Tamov gaps: price cron, trash, stop-list PATCH, directory PATCH | □ |
| Yandex Tamov: stop-list PATCH, trash sync | □ отложено |
| Stocks API v1 | □ решение TBD (v1 by-date код удалён 2026-08-13; это не restore). Sheets: `GET /api/stocks/by-warehouses` |
| Price crons pagination >1000 | □ optional |
| Cleanup orphan DTO / мёртвые поля stop-list | □ частично: `get-change-price-history.dto.ts` и `create-low-days-stocks.dto.ts` удалены (2026-08-13) |
| Rename `isArchive` → `isDeleted` | □ optional later |

---

## Known issues

| Issue | Суть |
|-------|------|
| Ozon Tamov warehouses | ✔ First/Second cron; lookup `marketplaceInternalNumber` + `marketplaceId` |
| Ozon stocks warehouse resolve | по `title` + `marketplaceId`; без find-or-create; skip если склада нет (нужен warehouses cron) |
| Ozon Tamov prices / trash | crons только на основной `Озон` |
| Stop-list / directory PATCH | только WB / `Озон` / Yandex — без Tamov кабинетов |
| Price API limit 1000 | без cursor/offset хвост не обновляется |
| Card sync find by article | без `created_for_calculation = false` — риск test item |

---

## Не менять без плана

Drop `marketplace_id` на `stocks`/`orders_v2`; force cutover без миграции; включение stocks API v1 без плана GAS; секреты в репо; drop/rename `items.isArchive` без явного решения; drop с `items` колонок Phase 3 (`payment`, `dimensionsFact`, `dimensionsMasterBox`, `volume`) и устаревших (`volumeMasterBox`, `volumePerUnit`, `weightPerUnit`, `density`) без подтверждения.

---

## История

| Дата | Итог |
|------|------|
| 2026-08-06 | AI-ready docs; Sheets; field split; stop-list v1 off |
| 2026-08-07 | M1–M4; send_status mp-centric; Yandex Tamov card/stocks/orders |
| 2026-08-10 | M5 prod; price crons → mp; Ozon Tamov; warehouses/stocks scoped by `marketplaceId` |
| 2026-08-15 | Item characteristics schema-only: `characteristics` / `characteristic_values` / `item_characteristics` (`1789330000000`); без backfill/API |
| 2026-08-15 | Marketplace characteristics schema-only: `marketplace_characteristics` / `marketplace_item_characteristics` / `marketplace_item_sizes` / `marketplace_characteristic_mappings` (`1789340000000`); без sync/API |
| 2026-08-15 | WB card sync → `marketplace_item_sizes` (+ `metadata.skus`); characteristics sync ещё нет |
| 2026-08-15 | Drop `items_sizes` (`1789350000000`); directory/list → `marketPlaceItemsSizes` from mp sizes |
