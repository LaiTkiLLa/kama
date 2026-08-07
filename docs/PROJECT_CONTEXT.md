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
| Ассортимент / directory / stop-list / цены | `src/items`  | ядро + dual-write `items` / `marketplace_items`  |
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
| Yandex Market Partner API   | offer-mappings, склады, остатки, заказы                |
| PostgreSQL                  | хранилище                                              |
| Google Sheets / Apps Script | единственный UI (FACT)                                 |


Часть jobs для **Ozon Second** в коде закомментирована; env для второго кабинета есть.

---



## Основные доменные сущности


| Сущность                                 | Смысл                                                              |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `items`                                  | товар / listing (исторически 1 строка ≈ 1 МП) + бизнес-поля        |
| `marketplace_items`                      | listing на конкретном маркетплейсе                                 |
| `stocks`                                 | дневной снимок остатков                                            |
| `orders_v2`                              | актуальные заказы (**FACT:** пишут активные cron)                  |
| `orders`                                 | legacy (**FACT:** активные cron не пишут; часть логики ещё читает) |
| `warehouses`, `marketplaces`             | склады и справочник МП                                             |
| `statuses`, `directions`, `suppliers`, … | справочники операционного контура                                  |


**Критично:** модель в **transition state** `items` ↔ `marketplace_items`.  
**Текущий шаг roadmap:** Milestone **4b** (listing fields: dual-write card sync → v2 read с mp). M1–M4 ✔.  
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

