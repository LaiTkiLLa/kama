# AI Agent Guide

Руководство для AI Agent по работе с репозиторием **kama**.  
Жёсткие ограничения: `[.cursor/rules/architecture.mdc](../../.cursor/rules/architecture.mdc)`.  
Оперативная память: `[../AI_CONTEXT.md](../AI_CONTEXT.md)`.  
Обзор: `[../PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)`.  
Навигация: `[../README.md](../README.md)`.

---

## Обязательный workflow

```text
1. Прочитать AI_CONTEXT.md (решения, запреты, открытые вопросы)
2. Исследовать repository (код, миграции, вызовы)
3. Прочитать релевантную документацию
4. Построить Implementation Plan (что / почему / риски / rollback)
5. Только после этого предлагать или вносить изменения
```

**Нельзя** начинать с правок кода «по памяти» или по одному фрагменту docs без проверки фактов в `src/` и `database/migrations/`.

При недостатке данных: помечать **FACT / ASSUMPTION / NEEDS VERIFICATION / UNKNOWN**. Не додумывать бизнес-логику и архитектуру.

---



## Что читать перед типом задачи



### Любая задача

1. `[../AI_CONTEXT.md](../AI_CONTEXT.md)`
2. `[../README.md](../README.md)`
3. `[../PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)`
4. Этот guide + `.cursor/rules/architecture.mdc`



### Изменение Items / MarketplaceItems / dual-write / v1–v2 ассортимента

```text
AI_CONTEXT.md
        ↓
domain/items-and-marketplace-items.md
        ↓
roadmap/items-marketplace-items-migration.md  (текущий milestone / sprint)
        ↓
src/items/** (service, entities, controllers)
        ↓
связанные stocks / orders writes (marketplace_item_id)
```



### Изменение схемы БД / новая миграция

```text
domain/items-and-marketplace-items.md   (если затрагивает items/mp items)
        ↓
database/migrations/                    (последние релевантные + pattern)
        ↓
src/**/entities/
        ↓
Implementation Plan → явное подтверждение на destructive шаги
```

`synchronize: false` — схема **только** через TypeORM migrations.

### Стоп-лист / автостатусы / send_status

```text
AI_CONTEXT.md  (v1 read retired; send_status → mp_items)
        ↓
domain/items-and-marketplace-items.md
        ↓
roadmap (Milestone 4)
        ↓
src/items/items.service.ts
  (getItemStopsListV2, updateItemSendStatus, updateItemsStopList)
        ↓
src/info (statuses)
```

**FACT:** `GET /api/items/stop-list` (v1) отключён. Read только `GET /api/items/v2/stop-list`.



### Остатки

```text
AI_CONTEXT + domain (mp-item centric sync; dual keys)
        ↓
src/stocks/**
        ↓
v1 vs v2 API; exclusion warehouses; Yandex findStock bug (см. AI_CONTEXT)
```



### Заказы / динамика

```text
PROJECT_CONTEXT
        ↓
src/orders/**  (OrdersV2 vs legacy Orders)
        ↓
не оживлять запись в legacy `orders` без явного плана
```



### Интеграция маркетплейса (WB / Ozon / Yandex)

```text
PROJECT_CONTEXT (список интеграций)
        ↓
соответствующий service (items / stocks / orders / info)
        ↓
не коммитить секреты; не хардкодить токены
```

Раздел `docs/integrations/` ещё не создан — источник: код.

### Архитектурные изменения (новый слой, cutover, drop legacy)

```text
agent-guide + architecture.mdc
        ↓
domain + roadmap
        ↓
Implementation Plan
        ↓
явное подтверждение пользователя
```



### Документация

```text
docs/README.md (структура)
        ↓
обновить только затронутые файлы; без дублирования кода
        ↓
при шаге миграции модели — обязательно roadmap checklist
```

---



## Implementation Plan (минимум)

Перед нетривиальными изменениями план должен содержать:

1. **Цель** и затронутые инварианты
2. **Факты из кода** (файлы / поведение as-is)
3. **Шаги** (порядок, dual-write / совместимость)
4. **Риски** и что может сломать Sheets/API/cron
5. **Проверка** (как убедиться, что не разъехались v1/v2 и keys)
6. **Rollback** (если применимо)

Не выполнять destructive действия (drop table/column, truncate, force cutover, удаление legacy без замены) без явного подтверждения пользователя.

---



## Приоритеты при конфликте целей

1. Корректность данных (остатки, заказы, стоп-лист)
2. Обратная совместимость API и dual-write
3. Соответствие целевой модели Items/MP
4. Чистота кода / «улучшения»

«Упростить модель» ценой скрытого breaking change — **запрещено** без плана и подтверждения.

---



## После выполнения задачи

- Если затронута миграция Items/MP — обновить `[../roadmap/items-marketplace-items-migration.md](../roadmap/items-marketplace-items-migration.md)`.
- Если изменился transition narrative — обновить `[../domain/items-and-marketplace-items.md](../domain/items-and-marketplace-items.md)`.
- Не раздувать docs копипастой из diff.
- AI должен проверить:

1. Требуется ли обновить документацию.
2. Требуется ли обновить roadmap.
3. Требуется ли обновить ADR.
4. Требуется ли обновить правила проекта. Если нет — явно сообщить: "Документация остаётся актуальной."

