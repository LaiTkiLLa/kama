# In-app LLM Agent

> HTTP-агент внутри бэкенда Kama: LLM + tool-calling к доменным сервисам.  
> **Не путать** с [`agent-guide.md`](agent-guide.md) — тот документ про Cursor AI при разработке репозитория.

Связанные: [`../AI_CONTEXT.md`](../AI_CONTEXT.md), [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md), [`../README.md`](../README.md).

Последнее обновление: 2026-09-01.

---

## Назначение

**FACT:** модуль `src/ai` даёт endpoint для «чата» с LLM, который может вызывать read-only tools и читать данные из PostgreSQL через существующие domain-сервисы.

**FACT:** UI в этом репозитории **не создаётся**. Потребитель — Google Sheets / GAS или другой HTTP-клиент, как у остального API.

**ASSUMPTION:** целевой сценарий — оператор задаёт вопрос на естественном языке («сколько заказов за вчера на WB?»), агент сам выбирает tool и возвращает ответ текстом.

---

## Статус

| Область | Статус |
|---------|--------|
| Модуль `AiModule`, endpoint `POST /api/ai/chat` | ✔ spike |
| Провайдер DeepSeek (`deepseek-chat`) | ✔ |
| Tool `get_order_statistics` → `orders_v2` | ✔ |
| Tool `get_order_statistics_by_marketplace` → `orders_v2` | ✔ |
| Валидация аргументов tools (zod, `AiToolExecutor`) | ✔ (2026-09-01) |
| Auth (`api-key`) на chat | □ backlog |
| Лимит итераций tool-loop, таймаут | □ backlog |
| История диалога (multi-turn) | □ backlog |
| Write-tools (stop-list, цены, PATCH) | ✖ без явного плана |

---

## Конфигурация

### Переменные окружения

| Переменная | Назначение |
|------------|------------|
| `DEEPSEEK_API_KEY` | API-ключ DeepSeek. **Не коммитить.** Задаётся в `.env` на сервере / локально. |

**FACT:** провайдер читает ключ из `process.env.DEEPSEEK_API_KEY` и ходит в `https://api.deepseek.com` через SDK `openai` (OpenAI-compatible API).

**NEEDS VERIFICATION:** при отсутствии ключа приложение стартует, но запросы к LLM падают в runtime — fail-fast ещё не сделан.

### Локальный запуск

1. Получить ключ в [DeepSeek Platform](https://platform.deepseek.com/).
2. Добавить в `.env` (файл в `.gitignore`, в репозиторий не класть):

```env
DEEPSEEK_API_KEY=sk-...
```

3. Запустить бэкенд как обычно (`npm run start:dev`).

Значение ключа в документацию и git **не писать**.

---

## HTTP API

Global prefix: `/api` (`src/main.ts`).

### `POST /api/ai/chat`

**Request body:**

```json
{
  "message": "Сколько заказов было вчера?"
}
```

**Response (as-is, spike):**

```json
{
  "response": {
    "role": "assistant",
    "content": "...",
    "toolCalls": [...],
    "rawMessage": { ... }
  }
}
```

**FACT:** сейчас проверка заголовка `api-key` **не реализована** (в отличие от части других маршрутов). Перед prod/GAS — добавить тот же паттерн, что у `GET /api/orders/dynamic`.

**NEEDS VERIFICATION:** для GAS достаточно отдавать только `content`; `rawMessage` — внутренний артефакт провайдера.

---

## Архитектура

```text
HTTP POST /api/ai/chat
        ↓
AiController
        ↓
AiService          (tool loop: LLM → execute tools → LLM …)
        ↓
┌───────────────────┴────────────────────┐
│ LlmProvider (DeepseekProvider)         │  ← DEEPSEEK_API_KEY
│ AiToolExecutor → AiToolRegistry        │  ← zod-валидация аргументов
│   ├─ get_order_statistics              │
│   └─ get_order_statistics_by_marketplace
│         └─ OrdersStatisticsService     │  ← orders_v2
└────────────────────────────────────────┘
```

Слои:

| Слой | Путь | Роль |
|------|------|------|
| Controller | `src/ai/ai.controller.ts` | HTTP |
| Orchestration | `src/ai/ai.service.ts` | system prompt, цикл tool-calls |
| Executor | `src/ai/tools/ai-tool-executor.ts` | lookup tool в registry, `JSON.parse` аргументов, zod-валидация, вызов `execute` |
| Provider | `src/ai/providers/deepseek.provider.ts` | вызов DeepSeek API |
| Tools | `src/ai/tools/**` | контракт tool + registry |
| Schemas | `src/ai/tools/orders/dto/*.schema.ts` | zod-схемы аргументов (source of truth для LLM и типов) |
| Domain | `src/orders/services/orders-statistics.service.ts` | SQL к `orders_v2` |

**DECISION (spike):** провайдер LLM отделён от tools; смена модели/вендора — через реализацию `LlmProvider`, без правок домена.

**DECISION (2026-09-01):** параметры tool описываются zod-схемой (`AiTool.parameters: z.ZodType`), а не рукописной JSON Schema. Для провайдера JSON Schema генерируется через `z.toJSONSchema()` в `DeepSeekToolMapper`. Схема — единый источник: описание для LLM (`.describe(...)`), runtime-валидация (`.parse`) и статические типы (`z.infer`). Интерфейсы `GetOrderStatisticsDto` / `GetOrdersStatisticsByMarketplaceDto` удалены; `OrdersStatisticsService` типизирован `GetOrderStatisticsArgs` / `GetOrdersStatisticsByMarketplaceArgs` из схем.

**FACT:** из-за этого `src/orders` импортирует типы из `src/ai/tools/orders/dto/` — доменный модуль зависит от ai-модуля. Пока принято как компромисс spike; при росте — вынести типы аргументов в orders или в общий слой.

**FACT:** валидация выполняется дважды: в `AiToolExecutor.execute` и повторно внутри `execute` каждого tool (`Schema.parse(args)`). Избыточно, но безвредно.

---

## Tools (текущие)

### `get_order_statistics`

**FACT:** агрегат по `orders_v2`: количество заказов, сумма `quantity`, `price`, `payout` за период `[dateFrom, dateTo)`.

Параметры (zod-схема `GetOrderStatisticsSchema`, `src/ai/tools/orders/dto/get-order-statistics.schema.ts`):

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `dateFrom` | string (`z.iso.datetime({ local: true, offset: true })`) | да | начало периода |
| `dateTo` | string (`z.iso.datetime({ local: true, offset: true })`) | да | конец периода (exclusive в SQL) |
| `marketplaceTitle` | string | нет | каноническое название маркетплейса (`"Озон"`, `"WB"`, `"Yandex"`, `"Yandex Tamov"`, `"Ozon Tamov"`); нормализацию делает LLM по описанию поля |
| `warehouseTitle` | string | нет | название конкретного склада, только если явно указан пользователем |
| `warehouseType` | `'FBO' \| 'FBS'` | нет | тип склада («наш склад» → FBS, «склад маркетплейса» → FBO) |

**FACT:** фильтр по дате — поле `marketplace_created_at` (timestamptz).

**FACT:** отменённые заказы **не исключаются** (как в части существующей логики `getOrders`). При интерпретации цифр агентом учитывать.

**FACT:** system prompt передаёт текущую дату и `Europe/Moscow`; границы «сегодня» / «вчера» модель вычисляет относительно неё. SQL использует timestamptz — возможен сдвиг на границе суток без явной нормализации TZ в запросе.

### `get_order_statistics_by_marketplace`

**FACT:** количество заказов в разрезе маркетплейсов за период; без фильтров по складу/маркетплейсу.

Параметры (zod-схема `GetOrdersStatisticsByMarketplaceSchema`): `dateFrom`, `dateTo` — оба обязательные, `z.iso.datetime({ local: true, offset: true })`.

**FACT (fixed, 2026-09-01):** изначально схемы использовали `z.iso.date()` (только `YYYY-MM-DD`), тогда как описания велят LLM передавать `2026-08-26T00:00:00` — валидация падала бы на каждом вызове. Исправлено на `z.iso.datetime({ local: true, offset: true })`: принимает локальное время без зоны, со смещением и `Z`. Date-only строки (`2026-08-26`) **не** принимаются — описания требуют полный datetime.

---

## Ограничения и запреты

- **Не коммитить** `DEEPSEEK_API_KEY` и не хардкодить в коде.
- **Не добавлять write-tools** (PATCH directory, stop-list, цены, создание карточек) без Implementation Plan и явного подтверждения.
- **Не создавать frontend** в репозитории — только HTTP API для GAS.
- Новые tools — только read-only на первом этапе, через существующие domain-сервисы, без прямого SQL из tool-класса где можно переиспользовать service.
- Изменения API держать совместимыми с GAS (стабильный контракт request/response после стабилизации spike).

---

## Добавление нового tool (когда понадобится)

1. Domain-логика в соответствующем модуле (`src/orders`, `src/stocks`, …) — отдельный service method.
2. Zod-схема аргументов в `src/ai/tools/<domain>/dto/<tool>.schema.ts` (+ `z.infer`-тип); описания полей для LLM — через `.describe(...)`.
3. Класс tool в `src/ai/tools/<domain>/`, implements `AiTool` (`parameters` = zod-схема).
4. Регистрация в `AiModule` → `AiToolRegistry`.
5. Обновить этот документ (таблица tools) и при необходимости [`../AI_CONTEXT.md`](../AI_CONTEXT.md).

---

## Связь с Cursor Agent

| Документ | Для кого |
|----------|----------|
| [`agent-guide.md`](agent-guide.md) | AI в Cursor при **разработке** репозитория |
| **этот файл** | **runtime** LLM-агент внутри NestJS для операторов через GAS |

---

## История

| Дата | Итог |
|------|------|
| 2026-09-01 | Zod-валидация аргументов tools: `AiTool.parameters: z.ZodType`, `AiToolExecutor`, схемы в `src/ai/tools/orders/dto/`; JSON Schema через `z.toJSONSchema`; DTO в orders удалены. Tool `get_order_statistics_by_marketplace`. Удалён Telegram-спайк (`src/telegram`, deps `nestjs-telegraf`/`telegraf`) |
| 2026-08-28 | Spike: `AiModule`, DeepSeek, `POST /api/ai/chat`, tool `get_order_statistics` |
