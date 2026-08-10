# AI_CONTEXT — оперативная память проекта

> Оперативные решения. При противоречии с кодом — верить коду.  
> Обновляет разработчик; AI может предложить дополнение.

Связанные: [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md), [`domain/items-and-marketplace-items.md`](domain/items-and-marketplace-items.md), [`roadmap/items-marketplace-items-migration.md`](roadmap/items-marketplace-items-migration.md).

---

## Текущая позиция миграции (FACT, 2026-08-10)

**Milestone 6 — Cutover (в работе).** M1–M5 закрыты на prod. Price crons → mp.  
**DECISION:** `items.isArchive` **оставляем** (product-level hide). Listing archive = `marketplace_items.deleted_at`. Next: `items_sizes`.

---

## Принятые решения

- `items` + `marketplace_items`; возврат к `item == listing` **запрещён**.
- **1 item на article** (кроме `created_for_calculation = true`).
- Marketplace-specific на `marketplace_items`: identity, listing, prices (`discount` = %), `send_status_id`, `deleted_at`.
- Marketplace-independent на `items`: article, логистика/себестоимость/classification, `wbCreatedAt`, `ownImagesUrl`, **`isArchive`**.
- **Два уровня скрытия (DECISION, 2026-08-10):**
  - `marketplace_items.deleted_at` — архив **listing** (карточка снята с МП).
  - `items.isArchive` — скрытие **товара** в directory (нужен, даже если все listings удалены; иначе «голый» item останется в списке). Optional rename → `isDeleted` позже.
- `send_status_id` — только `marketplace_items`.
- `stocks` / `orders_v2` — только `marketplace_item_id`.
- `directions`, legacy `orders`, `change_prices_histories` — удалены.
- UI — Google Sheets + GAS; frontend в репо не создавать.
- Stop-list read — только `GET /api/items/v2/stop-list`.
- Yandex Tamov — gaps отложены.

---

## Завершено (FACT, 2026-08-10)

| Область | Статус |
|---------|--------|
| M1–M5 (schema + consolidation prod + price crons) | ✔ |
| Dual archive model documented (`isArchive` + `deleted_at`) | ✔ DECISION |

---

## В работе / следующие шаги (M6)

| Область | Статус |
|---------|--------|
| `items_sizes` sync redesign (связь с mp) | □ **next** |
| Yandex Tamov: stop-list PATCH, trash sync | □ отложено |
| Stocks API v1 | □ решение TBD |
| Price crons pagination >1000 | □ optional |
| Cleanup orphan DTO / мёртвые поля stop-list | □ |
| Rename `isArchive` → `isDeleted` | □ optional later |

---

## Known issues

| Issue | Суть |
|-------|------|
| Price API limit 1000 | без cursor/offset хвост не обновляется |
| Card sync find by article | без `created_for_calculation = false` — риск test item |
| Yandex Tamov gaps | trash / stop-list PATCH |
| Orphan DTO | `get-change-price-history.dto.ts` |
| stop-list.interface | мёртвые `directionId` / `directionTitle` |

---

## Не менять без плана

Drop `marketplace_id` на `stocks`/`orders_v2`; force cutover без миграции; включение stocks API v1 без плана GAS; секреты в репо; drop/rename `items.isArchive` без явного решения.

---

## История

| Дата | Итог |
|------|------|
| 2026-08-06 | AI-ready docs; Sheets; field split; stop-list v1 off |
| 2026-08-07 | M1–M4; send_status mp-centric; Yandex Tamov card/stocks/orders |
| 2026-08-10 | M5 prod; price crons → mp; `isArchive` оставляем (product-level); старт M6 → sizes |
