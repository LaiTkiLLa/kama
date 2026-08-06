# AI_CONTEXT — оперативная память проекта

> Не документация «как устроено», а **что уже решено**, что нельзя ломать и что обсуждали.  
> Обновляет **разработчик**. AI может предложить дополнение, но не менять решения без подтверждения.

При противоречии с кодом — верить коду, затем обновить этот файл.

---

## Как использовать

| Аудитория | Когда читать |
|-----------|--------------|
| AI Agent | В начале любой нетривиальной задачи — **до** правок |
| Разработчик | После продуктового/архитектурного решения — зафиксировать здесь |

Связанные документы: [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) (обзор), [`domain/items-and-marketplace-items.md`](domain/items-and-marketplace-items.md) (модель), [`roadmap/items-marketplace-items-migration.md`](roadmap/items-marketplace-items-migration.md) (этапы).

---

## Принятые решения

### MarketplaceItems — модель данных

**Решение:** перейти на `items` (товар) + `marketplace_items` (listing на МП).  
**Статус:** принято, в процессе миграции.

**Нельзя:** возвращаться к модели «одна строка `items` = один listing маркетплейса» (`item == marketplace listing`).

**Почему:** нарушается нормализация; дублирование MP-полей; сложно связать stocks/orders с listing’ом.

**Целевой split полей `items` (DECISION, 2026-08-06, обновлено 2026-08-06):**  
На `items` остаются только marketplace-independent поля:

`id`, `article`, `articleOld`, `ownCategory`, `title`, `consolidation`, `payment`, `assembling`, `fullfillmentAcceptance`, `marketplaceAcceptance`, `production`, `buffer`, `daysDeliveryToRussia`, `directionId`, `classification`, `multiplicity`, `boxNumber`, `dimensionsFact`, `dimensionsMasterBox`, `volume`, `costInYuan`, `costInYuanWhite`, `costInRub`, `codeTNVED`, `replenishmentPeriod`, `remainingBalance`, `volumePerUnit`, `weightPerUnit`, `transportRateUsd`, `dutyPercentage`, `density`, `tariffWeight`, `costCalculationType`, `calculationType`, `seasonalityForExport`, `seasonalityForOrder`, `virality`, `supplierMinimumOrder`, `createdForCalculation`, `ownImagesUrl`, `downloadCalculationMethod`

**Целевые поля `marketplace_items` (DECISION, дополнение 2026-08-06):**  
Помимо уже существующих MP-полей — **`category`**, **`imageUrl`**, **`send_status_id`**.  
Все **новые** marketplace-specific поля — только здесь.

**Архив listing’а (DECISION):** `isArchive` на `items` **не нужен в целевой модели**. Использовать **`marketplace_items.deleted_at`**. Не возвращаться к `isArchive` как основному механизму.

**FACT (текущий код):** `send_status_id`, `imageUrl`, `category`, `isArchive` ещё на `items`; v2 stop-list читает `sendStatus` с `item`, фильтрует по `mpItems.deletedAt IS NULL`.

Детали: [`domain/items-and-marketplace-items.md`](domain/items-and-marketplace-items.md).

---

### Stop-list API

**FACT (2026-08-06):** `GET /api/items/stop-list` (v1) **отключён** — route и `getItemStopsList` закомментированы.

**FACT:** единственный read-endpoint стоп-листа — `GET /api/items/v2/stop-list` (`getItemStopsListV2`).

**FACT:** `PATCH /api/items/stop-list` по-прежнему активен; пишет `items.send_status_id` (legacy до переноса на mp item).

---

### Google Sheets — единственный UI

**Решение:** UI продукта — **Google Sheets + Google Apps Script**. Frontend в этом репозитории **не создавать**.

**Почему:** операционный контур уже живёт в Sheets; команда работает через GAS → HTTP API.

**Следствие:** новые API и изменения контрактов — **совместимы с GAS**. GAS должен использовать v2 stop-list read.

---

### Следующий шаг миграции

**Решение:** завершить миграцию Items ↔ MarketplaceItems целиком. **Current Sprint = Milestone 4 (StopList).**

---

## Что считается завершённым

| Область | Статус |
|---------|--------|
| Milestone 1: `marketplace_items` + dual-write | ✔ |
| Milestone 2: stocks → `marketplace_item_id` + v2 read | ✔ *(legacy keys до cutover)* |
| Milestone 3: orders → `orders_v2` | ✔ |
| Stop-list **read** v1 retired | ✔ *(закомментирован)* |
| Milestone 4–6 (остальное) | □ |

---

## Что считается экспериментом

| Элемент | Примечание |
|---------|------------|
| `low_days_stocks` | Entity без wiring — не опираться |
| Ozon Second | Cron закомментированы |
| `getItemStopsList` (v1) | Закомментирован; не восстанавливать без плана |
| Parallel `orders` + `orders_v2` | Autostatus читает `orders` — debt, M4 |

---

## Отвергнутые идеи

| Идея | Почему |
|------|--------|
| `item == marketplace listing` | Ломает нормализацию |
| Frontend в репо | UI = Sheets + GAS |
| MP-поля на `items` | Только `marketplace_items` |
| `isArchive` как целевой archive flag | Использовать `deleted_at` на mp item |
| `send_status_id` на shared `items` | Статус отправки — per listing → `marketplace_items` |
| `synchronize: true` | Только migrations |

---

## Не менять без явного плана

| Что | Почему |
|-----|--------|
| Dual-write `items` + `marketplace_items` | Sync/API зависят от обоих |
| Legacy keys на `stocks` / `orders_v2` | До M6 Cutover |
| Таблица `orders` | Autostatus ещё читает |
| `GET /api/stocks/current` (v1) | Ещё активен; GAS может зависеть |
| Бизнес-правила autostatus | Ручные статусы, warehouse exclusions |

---

## История обсуждений (кратко)

| Дата | Тема | Итог |
|------|------|------|
| 2026-08-06 | AI-ready docs, этап 1 | База docs |
| 2026-08-06 | UI | **FACT:** Sheets + GAS |
| 2026-08-06 | Целевые поля `items` | Marketplace-independent список |
| 2026-08-06 | Roadmap | Vision → Milestones |
| 2026-08-06 | Поля MP | `category`, `imageUrl`, `send_status_id` → mp_items; `isArchive` → не нужен, `deleted_at` |
| 2026-08-06 | Stop-list v1 | `GET stop-list` отключён; только v2 read |
