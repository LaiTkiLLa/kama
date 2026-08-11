# Kama — Documentation

Backend-сервис синхронизации товаров, остатков, цен и заказов с маркетплейсами (Wildberries, Ozon, Yandex Market) и HTTP API для операционного контура (справочник, стоп-лист, остатки, динамика заказов).

Репозиторий: NestJS + TypeORM + PostgreSQL. Пользовательский интерфейс находится **вне** этого репозитория.

---

## Как устроена документация

Документы отвечают на вопрос **«почему»** и фиксируют инварианты. Детали реализации — в коде (`src/`, `database/migrations/`).

Легенда меток достоверности:

| Метка | Значение |
|-------|----------|
| **FACT** | Подтверждено кодом, миграциями или конфигом |
| **ASSUMPTION** | Разумное предположение, не подтверждённое явно |
| **NEEDS VERIFICATION** | Недостаточно данных — проверить до изменений |

---

## Источники истины

| Тема | Источник истины |
|------|-----------------|
| Схема БД | `database/migrations/` (+ entities как отражение) |
| Поведение API / cron | `src/**/*.service.ts`, `src/**/*.controller.ts` |
| Модель Items ↔ MarketplaceItems | [`domain/items-and-marketplace-items.md`](domain/items-and-marketplace-items.md) |
| Статус миграции модели | [`roadmap/items-marketplace-items-migration.md`](roadmap/items-marketplace-items-migration.md) |
| Решения продукта / что нельзя ломать | [`AI_CONTEXT.md`](AI_CONTEXT.md) |
| Ограничения для AI | [`.cursor/rules/architecture.mdc`](../.cursor/rules/architecture.mdc) + [`ai/agent-guide.md`](ai/agent-guide.md) |
| Краткий обзор проекта | [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) |

Код важнее устаревшего текста в docs. При расхождении — исследовать repository и обновить документ.

---

## Что читать в зависимости от задачи

| Задача | Читать сначала |
|--------|----------------|
| Любая задача (старт) | Этот README → [`AI_CONTEXT.md`](AI_CONTEXT.md) → [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) → [`ai/agent-guide.md`](ai/agent-guide.md) |
| Items / MarketplaceItems / dual-write | [`domain/items-and-marketplace-items.md`](domain/items-and-marketplace-items.md) → [`roadmap/items-marketplace-items-migration.md`](roadmap/items-marketplace-items-migration.md) |
| Схема / миграции TypeORM | *(пока)* domain + migrations в репо; раздел `database/` — следующий этап |
| Стоп-лист / автостатусы / listing fields (M4b) | domain Items/MP + roadmap + `src/items/items.service.ts` (v2 read only; dual-write gap) |
| Интеграции МП | `src/items`, `src/stocks`, `src/orders`, `src/info` |
| Архитектурные изменения | agent-guide → Implementation Plan → явное подтверждение |

---

## Навигация

### Есть сейчас

- [`AI_CONTEXT.md`](AI_CONTEXT.md) — оперативная память и принятые решения
- [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) — краткий обзор
- [`domain/items-and-marketplace-items.md`](domain/items-and-marketplace-items.md) — доменная модель и transition
- [`roadmap/items-marketplace-items-migration.md`](roadmap/items-marketplace-items-migration.md) — статус миграции Items/MP
- [`roadmap/google-sheets-api.md`](roadmap/google-sheets-api.md) — отдельный roadmap API для Google Sheets / GAS
- [`ai/agent-guide.md`](ai/agent-guide.md) — workflow для AI Agent
- [`.cursor/rules/architecture.mdc`](../.cursor/rules/architecture.mdc) — жёсткие правила агента

### Планируется (ещё не создано)

- `architecture/` — слои, модули, data flows, jobs
- `database/` — schema overview, conventions, performance
- `api/` — endpoints, auth
- `integrations/` — WB / Ozon / Yandex
- `domain/` — stop-list, stocks, orders, business-rules, glossary
- `operations/` — setup, env names, deploy, commands
- `roadmap/` — tech-debt, current product roadmap
- `decisions/` — ADR

---

## Правила поддержки docs

1. Не дублировать код и списки полей entity.
2. Не писать секреты и значения env.
3. Бизнес-правила и ADR меняет разработчик; AI обновляет факты из кода и помечает неопределённость.
4. После шага миграции Items/MP — обновить roadmap checklist.
