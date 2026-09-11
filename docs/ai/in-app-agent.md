# In-app LLM Agent

> HTTP-агент внутри бэкенда Kama: LLM + tool-calling к доменным сервисам.  
> **Не путать** с [`agent-guide.md`](agent-guide.md) — тот документ про Cursor AI при разработке репозитория.

Связанные: [`../AI_CONTEXT.md`](../AI_CONTEXT.md), [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md), [`../README.md`](../README.md).

Последнее обновление: 2026-09-11.

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
| Tool `compare_order_periods` → `orders_v2` | ✔ (2026-09-11) |
| Фильтр `article` во всех tools статистики (`orders_v2 → marketplace_items → items.article`) | ✔ (2026-09-11) |
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
│   ├─ get_order_statistics_by_marketplace
│   └─ compare_order_periods             │
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
| Schemas | `src/ai/tools/orders/dto/*.schema.ts` | zod-схемы аргументов (source of truth для LLM и типов); общий enum маркетплейсов — `marketplace-title.schema.ts` |
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
| `marketplaceTitle` | `MarketplaceTitleSchema` (enum `'Озон' \| 'WB' \| 'Yandex' \| 'Yandex Tamov' \| 'Ozon Tamov'`) | нет | каноническое название маркетплейса; нормализацию делает LLM по описанию поля |
| `article` | string | нет | артикул товара (`items.article`), точное совпадение; только если явно указан пользователем |
| `warehouseTitle` | string | нет | название конкретного склада, только если явно указан пользователем |
| `warehouseType` | `'FBO' \| 'FBS'` | нет | тип склада («наш склад» → FBS, «склад маркетплейса» → FBO) |

**FACT:** фильтр по дате — поле `marketplace_created_at` (timestamptz).

**FACT (2026-09-11):** фильтр `article` — через `LEFT JOIN orders.marketplaceItem → marketplaceItem.item`, условие `item.article = :article` (строгое равенство, без `ILIKE`/trim). Join'ы добавлены безусловно (many-to-one, строки не размножают); заказы без `marketplace_item_id` при фильтре по артикулу отсекаются. Аналогично в `get_order_statistics_by_marketplace` и `compare_order_periods`.

**DECISION (2026-09-11):** `marketplaceTitle` во всех схемах — `z.enum` из общего `MarketplaceTitleSchema` (`src/ai/tools/orders/dto/marketplace-title.schema.ts`), а не `z.string()`: нераспознанное название отклоняется на валидации, а не уходит в SQL пустым результатом. Список значений — `MARKETPLACE_TITLES`; при добавлении кабинета менять там.

**FACT:** отменённые заказы **не исключаются** (как в части существующей логики `getOrders`). При интерпретации цифр агентом учитывать.

**FACT:** system prompt передаёт текущую дату и `Europe/Moscow`; границы «сегодня» / «вчера» модель вычисляет относительно неё. SQL использует timestamptz — возможен сдвиг на границе суток без явной нормализации TZ в запросе.

### `get_order_statistics_by_marketplace`

**FACT:** количество заказов в разрезе маркетплейсов за период; без фильтров по складу/маркетплейсу.

Параметры (zod-схема `GetOrdersStatisticsByMarketplaceSchema`): `dateFrom`, `dateTo` — оба обязательные, `z.iso.datetime({ local: true, offset: true })`; `article` — опциональный, string (см. `get_order_statistics`).

**FACT (fixed, 2026-09-01):** изначально схемы использовали `z.iso.date()` (только `YYYY-MM-DD`), тогда как описания велят LLM передавать `2026-08-26T00:00:00` — валидация падала бы на каждом вызове. Исправлено на `z.iso.datetime({ local: true, offset: true })`: принимает локальное время без зоны, со смещением и `Z`. Date-only строки (`2026-08-26`) **не** принимаются — описания требуют полный datetime.

### `compare_order_periods`

**FACT:** сравнение агрегатов `orders_v2` за два периода одним SQL-запросом: `OrdersStatisticsService.comparePeriods` возвращает `{ period1: OrderStatistics; period2: OrderStatistics }` — для каждого периода `ordersCount`, `totalQuantity`, `totalPrice`, `totalPayout` (тот же набор, что у `get_order_statistics`).

Файлы: tool `src/ai/tools/orders/compare-order-periods.tool.ts` (`CompareOrderPeriodsTool`), схема `src/ai/tools/orders/dto/compare-order-periods.schema.ts` (`CompareOrderPeriodsSchema`).

Параметры:

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `period1DateFrom` | `z.iso.datetime({ local: true, offset: true })` | да | начало первого периода (inclusive) |
| `period1DateTo` | `z.iso.datetime({ local: true, offset: true })` | да | конец первого периода (exclusive) |
| `period2DateFrom` | `z.iso.datetime({ local: true, offset: true })` | да | начало второго периода (inclusive) |
| `period2DateTo` | `z.iso.datetime({ local: true, offset: true })` | да | конец второго периода (exclusive) |
| `marketplaceTitle` | `MarketplaceTitleSchema` (enum) | нет | общий фильтр для обоих периодов |
| `article` | string | нет | общий фильтр для обоих периодов (`items.article`, точное совпадение) |
| `warehouseTitle` | string | нет | общий фильтр для обоих периодов |
| `warehouseType` | `'FBO' \| 'FBS'` | нет | общий фильтр для обоих периодов |

**DECISION:** порядок периодов задаёт пользователь, backend его не меняет: «сравни август с июлем» → `period1` = август, `period2` = июль. Периоды могут быть разной длины и могут пересекаться — заказ из пересечения учитывается в обоих.

**DECISION:** разницу / процент изменения считает LLM, не backend. Формула в description tool: `(period1 − period2) / period2 × 100`; при `period2 = 0` процент не считается, сравнение по абсолютным значениям.

**FACT:** реализация — один запрос с условными агрегатами (`COUNT(CASE …)` / `SUM(CASE …)`) по `marketplace_created_at`, `WHERE` ограничен объединением обоих интервалов. Фильтры по маркетплейсу/складу/артикулу — те же, что в `get_order_statistics` (`marketplace.title`, `warehouse.title`, `warehouse.type`, `item.article`). Отменённые заказы не исключаются; замечание про TZ из `get_order_statistics` применимо.

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
| 2026-09-11 | Tool `compare_order_periods` (`CompareOrderPeriodsTool`, `OrdersStatisticsService.comparePeriods`): агрегаты за два периода одним запросом; сравнение/проценты — на стороне LLM. Фильтр `article` во всех трёх tools (`orders_v2 → marketplace_items → items.article`). `marketplaceTitle` → общий `z.enum` (`marketplace-title.schema.ts`) |
| 2026-09-01 | Zod-валидация аргументов tools: `AiTool.parameters: z.ZodType`, `AiToolExecutor`, схемы в `src/ai/tools/orders/dto/`; JSON Schema через `z.toJSONSchema`; DTO в orders удалены. Tool `get_order_statistics_by_marketplace`. Удалён Telegram-спайк (`src/telegram`, deps `nestjs-telegraf`/`telegraf`) |
| 2026-08-28 | Spike: `AiModule`, DeepSeek, `POST /api/ai/chat`, tool `get_order_statistics` |
