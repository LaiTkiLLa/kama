# PROJECT_CONTEXT — Kama

> Краткий обзор. Детали — в связанных документах.  
> Метки: **FACT** / **ASSUMPTION** / **NEEDS VERIFICATION**.

---

## Назначение

**FACT:** Backend `kama-marketplaces-backend` синхронизирует карточки товаров, цены, склады, остатки и заказы с API маркетплейсов в PostgreSQL и отдаёт HTTP API для:

- справочника товаров (directory);
- стоп-листа отправок (авто- и ручные статусы);
- текущих/исторических остатков;
- динамики заказов;
- справочников (статусы, поставщики, контрагенты и т.п.).

**ASSUMPTION:** операционный контур для управления ассортиментом и пополнением на маркетплейсах РФ.

---



## Пользовательский интерфейс

**FACT:** в этом репозитории frontend отсутствует.

**FACT:** UI продукта — **Google Sheets + Google Apps Script**, вызывающие HTTP API бэкенда. Новый frontend в репозитории не создаётся. См. `[AI_CONTEXT.md](AI_CONTEXT.md)`.

---



## Архитектура (обзор)

**FACT:** modular monolith на NestJS.

```text
HTTP Controllers  (+ api-key на части маршрутов)
        ↓
Services          (бизнес-логика + @Cron + axios к МП)
        ↓
TypeORM DataSource / QueryRunner
        ↓
PostgreSQL
```

- Отдельного repository-слоя, очередей и workers **нет**.
- HTTP и фоновые sync-задачи работают **в одном процессе**.
- Схема БД только через TypeORM migrations (`synchronize: false`).

Подробнее: планируется `docs/architecture/` (ещё не создано). Модули сейчас: `Items`, `Orders`, `Stocks`, `Info`.

---



## Основные подсистемы


| Подсистема                                 | Модуль       | Роль                                             |
| ------------------------------------------ | ------------ | ------------------------------------------------ |
| Ассортимент / directory / stop-list / цены | `src/items`  | ядро; listing/prices/status на `marketplace_items` |
| Остатки                                    | `src/stocks` | sync снимков + API current / by-date             |
| Заказы                                     | `src/orders` | sync в `orders_v2` + API динамики                |
| Справочники и склады                       | `src/info`   | marketplaces, warehouses, statuses, suppliers, … |


---



## Технологии


|           | **FACT**                                    |
| --------- | ------------------------------------------- |
| Runtime   | Node.js (Docker: `node:21-alpine`)          |
| Framework | NestJS 11                                   |
| Language  | TypeScript                                  |
| ORM       | TypeORM 0.3                                 |
| DB        | PostgreSQL 16                               |
| HTTP к МП | axios                                       |
| Jobs      | `@nestjs/schedule` (in-process cron)        |
| Deploy    | Docker Compose + GitHub Actions (SSH/rsync) |


**FACT:** Redis, message broker, JWT/Passport, Sentry/Prometheus в проекте **не используются**.

---



## Внешние интеграции


| Система                     | Назначение                                             |
| --------------------------- | ------------------------------------------------------ |
| Wildberries Seller APIs     | карточки, trash, цены, склады, остатки, заказы         |
| Ozon Seller API             | атрибуты, archive, цены, склады, остатки, FBO postings |
| Yandex Market Partner API   | offer-mappings, склады, остатки, заказы (2 кабинета)   |
| PostgreSQL                  | хранилище                                              |
| Google Sheets / Apps Script | единственный UI (FACT)                                 |


**FACT:** вторые кабинеты:
- Yandex — title **`Yandex Tamov`**, env `yandexTamov*` (cards / stocks / orders_v2).
- Ozon — title **`Ozon Tamov`**, env `ozonTamovToken` / `ozonTamovClientId` (cards / stocks / orders_v2 / warehouses). Legacy `Ozon Second` / `ozonSecond*` снят.
- Warehouse identity для multi-cabinet: всегда с `marketplaceId` (не искать только по title / internal number).

Gaps обоих Tamov: stop-list PATCH / trash; у Ozon Tamov дополнительно price cron.

---



## Основные доменные сущности


| Сущность                                 | Смысл                                                              |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `items`                                  | marketplace-independent товар (1 на article после M5)                |
| `marketplace_items`                      | listing на МП: identity, listing, prices, send_status, archive     |
| `stocks`                                 | дневной снимок остатков                                            |
| `orders_v2`                              | актуальные заказы (**FACT:** пишут активные cron)                  |
| `warehouses`, `marketplaces`             | склады и справочник МП                                             |
| `statuses`, `suppliers`, …               | справочники операционного контура                                  |


**Критично:** переход `items` → `marketplace_items`. **M1–M5 ✔ на prod**. Сейчас **Milestone 6 — Cutover**: `items_sizes`, Tamov gaps (Ozon + Yandex), stocks v1. `items.isArchive` остаётся (product hide).
Источник истины:

- `[domain/items-and-marketplace-items.md](domain/items-and-marketplace-items.md)`
- `[roadmap/items-marketplace-items-migration.md](roadmap/items-marketplace-items-migration.md)`
- `[AI_CONTEXT.md](AI_CONTEXT.md)`

---



## Auth

**FACT:** задумана проверка заголовка `api-key`. Покрытие guard’ами **неполное** (часть маршрутов без проверки) — учитывать при изменениях API.

---



## Документация

- Навигация: `[README.md](README.md)`
- Оперативная память / решения: `[AI_CONTEXT.md](AI_CONTEXT.md)`
- AI workflow: `[ai/agent-guide.md](ai/agent-guide.md)`
- Правила агента: `[.cursor/rules/architecture.mdc](../.cursor/rules/architecture.mdc)`

