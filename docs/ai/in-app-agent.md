# In-app LLM Agent

> HTTP-агент внутри бэкенда Kama: LLM + tool-calling к доменным сервисам.  
> **Не путать** с [`agent-guide.md`](agent-guide.md) — тот документ про Cursor AI при разработке репозитория.

Связанные: [`../AI_CONTEXT.md`](../AI_CONTEXT.md), [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md), [`../README.md`](../README.md).

Последнее обновление: 2026-09-18.

---

## Назначение

**FACT:** модуль `src/ai` даёт endpoint для «чата» с LLM, который может вызывать tools и читать данные из PostgreSQL через существующие domain-сервисы. Tools в основном read-only; единственный write-tool — `create_test_item` (расчётный товар, не реальная карточка).

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
| Tool `create_test_item` → `ItemsAiToolsService.createTestItem` (первый write-tool; расчётный товар) | ✔ (2026-09-12) |
| Tool `get_current_stocks` → `stocks` «сегодня» | ✔ (2026-09-15) |
| Auth (`api-key`) на chat | □ backlog |
| Ошибки tools → `{ error }` для LLM, chat не падает (`AiToolExecutor`) | ✔ (2026-09-18) |
| Лимит итераций tool-loop, таймаут | □ backlog |
| История диалога (multi-turn) | □ backlog |
| Write-tools на реальные данные (stop-list, цены, PATCH, карточки МП) | ✖ без явного плана |
| Tool `search_documentation` → `RagService` (Qdrant + HF embeddings) | ✔ (2026-09-18), см. [`rag.md`](rag.md) |

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
│   ├─ compare_order_periods             │
│   │     └─ OrdersStatisticsService     │  ← orders_v2
│   ├─ get_current_stocks                │
│   │     └─ StocksStatisticsService     │  ← stocks (снимок «сегодня»)
│   ├─ create_test_item                  │
│   │     └─ ItemsAiToolsService         │  ← items / marketplace_items / items_suppliers (write)
│   └─ search_documentation             │
│         └─ RagService                  │  ← HF embeddings + Qdrant (docs/rag/*.md)
└────────────────────────────────────────┘
```

**FACT:** `AiModule` импортирует `OrdersModule`, `ItemsModule`, `StocksModule` и `RagModule`; tools получают domain-сервисы через DI (`OrdersStatisticsService`, `ItemsAiToolsService`, `StocksStatisticsService`, `RagService`) — сервис должен быть в `exports` доменного модуля.

**DECISION (2026-09-12):** domain-логика для AI tools в `items` живёт в отдельном `ItemsAiToolsService` (`src/items/services/items-ai-tools.service.ts`), а не в `ItemsService`: контракт и поведение legacy endpoint'ов (`POST /api/items` и др.) не трогаем. Цена — частичное дублирование `ItemsService.createTestItem` (та же схема listings на все кабинеты + `Системный поставщик`); при правке одного проверять другой.

Слои:

| Слой | Путь | Роль |
|------|------|------|
| Controller | `src/ai/ai.controller.ts` | HTTP |
| Orchestration | `src/ai/ai.service.ts` | system prompt, цикл tool-calls |
| Executor | `src/ai/tools/ai-tool-executor.ts` | lookup tool в registry, `JSON.parse` аргументов, zod-валидация, вызов `execute`; любая ошибка → `{ error }` (см. ниже) |
| Provider | `src/ai/providers/deepseek.provider.ts` | вызов DeepSeek API |
| Tools | `src/ai/tools/**` | контракт tool (`ai-tool.interface.ts`) + registry; tools сгруппированы по домену: `orders/`, `items/`, `stocks/`, `rag/` |
| Schemas | `src/ai/tools/<domain>/dto/*.schema.ts` | zod-схемы аргументов (source of truth для LLM и типов); общий enum маркетплейсов — `orders/dto/marketplace-title.schema.ts` |
| Domain | `src/orders/services/orders-statistics.service.ts`, `src/items/services/items-ai-tools.service.ts`, `src/stocks/services/stocks-statistics.service.ts`, `src/rag/rag.service.ts` | SQL к `orders_v2`; создание тестового товара; снимок остатков «сегодня»; поиск по документации |

**DECISION (spike):** провайдер LLM отделён от tools; смена модели/вендора — через реализацию `LlmProvider`, без правок домена.

**DECISION (2026-09-01):** параметры tool описываются zod-схемой (`AiTool.parameters: z.ZodType`), а не рукописной JSON Schema. Для провайдера JSON Schema генерируется через `z.toJSONSchema()` в `DeepSeekToolMapper`. Схема — единый источник: описание для LLM (`.describe(...)`), runtime-валидация (`.parse`) и статические типы (`z.infer`). Интерфейсы `GetOrderStatisticsDto` / `GetOrdersStatisticsByMarketplaceDto` удалены; `OrdersStatisticsService` типизирован `GetOrderStatisticsArgs` / `GetOrdersStatisticsByMarketplaceArgs` из схем.

**FACT:** из-за этого `src/orders` импортирует типы из `src/ai/tools/orders/dto/` — доменный модуль зависит от ai-модуля. Пока принято как компромисс spike; при росте — вынести типы аргументов в orders или в общий слой. Тот же паттерн у `items`: `ItemsAiToolsService.createTestItem(args: CreateTestItemArgs)` импортирует тип из `src/ai/tools/items/dto/`. И у `stocks`: `StocksStatisticsService.getCurrentStocks(args: GetCurrentStocksArgs)` импортирует тип из `src/ai/tools/stocks/dto/`. И у `rag`: `RagService.searchDocumentation(params: SearchDocumentationArgs)` — из `src/ai/tools/rag/dto/`.

**FACT:** валидация выполняется дважды: в `AiToolExecutor.execute` и повторно внутри `execute` каждого tool (`Schema.parse(args)`). Избыточно, но безвредно.

**DECISION (2026-09-18):** `AiToolExecutor.execute` **не пробрасывает** исключения. Tool не найден / аргументы не JSON / `ZodError` / любая ошибка внутри `tool.execute` → возвращается `{ error: string }` (`AiToolError`), который `AiService` кладёт в `tool`-сообщение как обычный результат; LLM по system prompt сообщает пользователю понятную причину. Раньше исключение из tool валило весь `chat` в HTTP 500 — критично для tools с внешними вызовами (`search_documentation`: HF + Qdrant). `ZodError` разворачивается в `path: message`, чтобы LLM могла исправить аргументы и повторить вызов; прочие ошибки логируются со stack (`Logger.error`) и уходят как `Инструмент временно недоступен: <message>`.

**NEEDS VERIFICATION:** текст `message` внешних ошибок (HF/Qdrant/TypeORM) попадает к LLM; system prompt запрещает раскрывать технические детали пользователю, но фильтрации на backend нет.

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

### `create_test_item`

**FACT (2026-09-12):** единственный **write**-tool. Создаёт тестовый (расчётный) товар: `items` с `created_for_calculation = true`, по одному `marketplace_items` на каждый кабинет (`WB` / `Озон` / `Yandex` / `Yandex Tamov` / `Ozon Tamov`) и связь с `Системный поставщик` в `items_suppliers`. Это **не** реальная карточка на маркетплейсе и не создание через `product-creation` (см. [`../roadmap/marketplace-product-creation.md`](../roadmap/marketplace-product-creation.md)).

Файлы: tool `src/ai/tools/items/create-test-item.tool.ts` (`CreateTestItemTool`), схема `src/ai/tools/items/dto/create-test-item.schema.ts` (`CreateTestItemSchema`), domain `ItemsAiToolsService.createTestItem(args: CreateTestItemArgs)` (`src/items/services/items-ai-tools.service.ts`).

Параметры (все обязательны для LLM):

| Поле | Тип | Описание |
|------|-----|----------|
| `length` | `numericString` | длина, см |
| `width` | `numericString` | ширина, см |
| `height` | `numericString` | высота, см |
| `weight` | `numericString` | вес, кг |
| `category` | `z.string().trim().min(1)` | категория; пишется в `items.category` **и** `marketplace_items.category` всех listings |

**DECISION:** габариты — строки (`numericString` = `z.string().trim().regex(/^\d+(\.\d+)?$/)` + `> 0`), а не числа: значение как есть уходит в `marketplace_items.dimensions` (строка), а regex не пускает `"abc"` / `"1,5"` / `"0"` — иначе `Number()` в сервисе дал бы `NaN`/`0` в `volume`. В JSON Schema для DeepSeek поле уходит как `type: string` с `pattern`; число (`145.5` без кавычек) валидацию **не** пройдёт — описания полей велят LLM передавать строку.

**FACT:** запись по МП повторяет формат card sync: `marketplace_items.dimensions = "length/width/height/weight"`, `volume` в литрах с `toFixed(2)`. WB: `ceil(L)·ceil(W)·ceil(H)/1000` (WB округляет габариты вверх); Ozon / Ozon Tamov: `L·W·H/1000`. Yandex-listings — без dimensions/volume (как в legacy `POST /api/items`).

**FACT:** legacy `POST /api/items` (`ItemsService.createTestItem()`, без body) **не менялся**: категория `'тестовая категория'`, без dimensions/volume, ответ `{ id }`.

**FACT:** артикул — `тестовый артикул <items.id>`, title — `тестовое название <items.id>`; tool возвращает `{ id, article }`, LLM сообщает пользователю `article`. `article` берётся из локальной переменной после `update`, не из entity (`createItem.article` после `save` остаётся `'тестовый артикул'` без id). Транзакция: всё или ничего (rollback при отсутствии кабинета или системного поставщика).

**NEEDS VERIFICATION:** известный риск из `AI_CONTEXT` «Card sync find by article — без `created_for_calculation = false`» к тестовым артикулам не применим (`тестовый артикул N` не совпадёт с реальным), но unique-ограничений на article нет.

### `get_current_stocks`

**FACT (2026-09-15):** read-only tool. Снимок остатков **на сегодня**: `marketplace_items` + `stocks` за календарный день `CURRENT_DATE`. Ответ — **агрегат** (как order-statistics), не построчный список listing’ов. `article` **опционален**.

Файлы: tool `src/ai/tools/stocks/get-current-stocks.tool.ts` (`GetCurrentStocksTool`), схема `src/ai/tools/stocks/dto/get-current-stocks.schema.ts` (`GetCurrentStocksSchema`), domain `StocksStatisticsService.getCurrentStocks` (`src/stocks/services/stocks-statistics.service.ts`). HTTP `GET /api/stocks/v2/current` / `StocksService.getStocks` **не менялись**.

Параметры (все опциональны):

| Поле | Тип | Описание |
|------|-----|----------|
| `article` | string | `items.article`, точное совпадение; только если явно указан пользователем |
| `marketplaceTitle` | `MarketplaceTitleSchema` (enum) | каноническое название кабинета; если не передан — разрез по всем кабинетам в `byMarketplace` |
| `warehouseTitle` | string | название конкретного склада, только если явно указан |
| `warehouseType` | `'FBO' \| 'FBS'` | тип склада («наш склад» → FBS, «склад маркетплейса» → FBO) |

**DECISION:** `article` и `marketplaceTitle` опциональны. Без артикула tool возвращает суммы по ассортименту в рамках остальных фильтров, а не дамп SKU. В HTTP `GET /api/stocks/v2/current` маркетплейс обязателен и ответ построчный — контракт AI tool другой намеренно.

**FACT:** форма ответа:

| Поле | Описание |
|------|----------|
| `listingsCount` | число listing’ов, попавших под фильтры |
| `quantityFull` | сумма `stocks.current_value` по неисключённым складам |
| `inWayToClient` | сумма `stocks.reserved` |
| `inWayFromClient` | сумма `stocks.promised` |
| `byMarketplace[]` | те же суммы + `fbsWarehouses` / `fboWarehouses` (`{ title, value }`, value = сумма по `warehouse.title` внутри кабинета; сортировка по value desc) |

**FACT:** окно даты — `stocks.created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'`, тот же приём, что `StocksService.getStocks` и `GET /api/stocks/by-warehouses`. Историю / остатки на прошлую дату tool **не** отдаёт (DECISION 2026-08-15: stocks by-date / v1 **не возвращаем**). Описание tool явно запрещает вызов для прошлой даты.

**FACT:** timezone сессии PostgreSQL — `Europe/Moscow` (`SHOW timezone`); `CURRENT_DATE` совпадает с датой в system prompt агента.

**FACT:** отбор listings: `marketplace_items.deleted_at IS NULL`, `items.created_for_calculation = false`. `items.isArchive` **не** фильтруется — как v2/current; в `GET /api/stocks/by-warehouses` `isArchive = false` есть. Поставщики не join'ятся (в v2/current фильтр `suppliers` есть).

**FACT:** hardcoded `excludeWarehouses` скопирован из `StocksService.getStocks` (сравнение с `stocks.warehouse_id` = PK `warehouses.id`). Склады из списка не входят ни в суммы, ни в warehouse-массивы. Список **длиннее**, чем в `getStocksByWarehouse`. Известный mismatch PK vs `marketplaceInternalNumber` — см. [`../roadmap/google-sheets-api.md`](../roadmap/google-sheets-api.md); для этого tool поведение как у v2/current.

**FACT:** join остатков — `LEFT JOIN` на сегодняшний снимок. Listing без остатков сегодня увеличивает `listingsCount`, но даёт 0 в суммах. Фильтры `warehouseTitle` / `warehouseType` в `WHERE` (не в `JOIN ON`) — listing без подходящего склада отсекается.

### `search_documentation`

**FACT (2026-09-21):** read-only tool. Семантический поиск по операторской документации (`docs/rag/*.md`, проиндексировано в Qdrant). Единственный параметр — `query: string` (trim, min 1). Two-stage: Qdrant отбирает 10 кандидатов с cosine `similarity ≥ 0.5`, затем HF cross-encoder `bge-reranker-v2-m3` переоценивает пары «вопрос + чанк». Ответ — до 3 чанков `{ content, source, heading?, section?, keywords?, similarity, rerankScore }` в порядке `rerankScore` desc; пустой массив, если ничего не прошло порог Qdrant.

**DECISION (2026-09-21):** system prompt запрещает описывать процесс поиска, фрагменты, chunks, similarity, reranking и формулировки «по найденному фрагменту» / «по результатам поиска» — поля `similarity` / `rerankScore` / `source` уходят LLM в результате tool, и без запрета она их пересказывала. При частичном покрытии вопроса: сначала известное из документации, затем кратко — чего не хватает.

Файлы: `src/ai/tools/rag/search-documentation.tool.ts` (`SearchDocumentationTool`), схема `src/ai/tools/rag/dto/search-documentation.schema.ts`, domain `RagService.searchDocumentation`. Детали pipeline, порог, known issues — [`rag.md`](rag.md).

**DECISION:** документация — источник **правил, процессов, терминов, инструкций**; текущие данные (заказы, остатки, товары, статистика, цены) — только через data-tools. System prompt и description tool это разводят явно; допускается вызвать оба типа tools в одном ответе. LLM обязан не утверждать того, чего нет в найденных чанках, и не выдумывать ответ при пустом результате.

**NEEDS VERIFICATION:** порог `0.5` (`RagService.MIN_SIMILARITY`) не откалиброван на русских запросах; возможны ложные «в документации нет». `similarity` найденных чанков пишется в лог на каждый вызов.

---

## Ограничения и запреты

- **Не коммитить** `DEEPSEEK_API_KEY` и не хардкодить в коде.
- **Не добавлять write-tools на реальные данные** (PATCH directory, stop-list, цены, создание карточек МП) без Implementation Plan и явного подтверждения. Исключение (DECISION, 2026-09-12): `create_test_item` — пишет только расчётный товар (`created_for_calculation = true`), на маркетплейсы ничего не уходит.
- **Не создавать frontend** в репозитории — только HTTP API для GAS.
- Новые tools — через domain-сервисы, без прямого SQL из tool-класса. Read-логику переиспользовать из существующих сервисов; логику, специфичную для AI (как `create_test_item`), — в отдельном `*AiToolsService` доменного модуля, не меняя контракт существующих endpoint'ов.
- Изменения API держать совместимыми с GAS (стабильный контракт request/response после стабилизации spike).

---

## Добавление нового tool (когда понадобится)

1. Domain-логика в соответствующем модуле (`src/orders`, `src/items`, `src/stocks`, …) — метод существующего сервиса (read) или отдельный `*AiToolsService` (AI-specific / write); сервис должен быть в `exports` модуля, иначе Nest не разрешит DI в `AiModule`.
2. Zod-схема аргументов в `src/ai/tools/<domain>/dto/<tool>.schema.ts` (+ `z.infer`-тип); описания полей для LLM — через `.describe(...)`. Импорт — `from 'zod'` (не `zod/index` и т.п.: иначе два экземпляра типов и `parameters` не совместим с `AiTool`).
3. Класс tool в `src/ai/tools/<domain>/`, implements `AiTool` (`parameters` = zod-схема). `name` / `description` — **присваивать** (`readonly name = '...'`), не аннотировать типом (`readonly name: '...'` оставит `undefined` в runtime → registry положит tool под ключ `undefined`).
4. Домен-модуль в `imports` `AiModule`; tool в `providers` и в `inject` + `register` фабрики `AiToolRegistry`.
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
| 2026-09-21 | `search_documentation`: two-stage retrieval (Qdrant 10 кандидатов → HF reranker `bge-reranker-v2-m3` → top-3 по `rerankScore`), в ответе tool добавлены `rerankScore`, `section`, `keywords`. System prompt: запрет раскрывать процесс поиска / chunks / similarity / reranking; правило частичного ответа по документации. Детали и known issues — [`rag.md`](rag.md) |
| 2026-09-18 | `AiToolExecutor`: try/catch → `{ error }` для LLM вместо исключения (tool not found / bad JSON / `ZodError` с path / runtime error со stack в лог); фикс lint `no-unsafe-assignment`. RAG hardening (lazy Qdrant, stale-чанки, chunker, `api-key`) — см. [`rag.md`](rag.md) |
| 2026-09-18 | Tool `search_documentation` (`SearchDocumentationTool` → `RagService.searchDocumentation`): семантический поиск по `docs/rag/*.md` через HF embeddings + Qdrant, top-3 при `similarity ≥ 0.5`. `RagModule` в `imports` `AiModule`. System prompt: разделение «документация (правила/процессы) vs данные системы (data-tools)», запрет утверждать то, чего нет в найденных чанках. См. [`rag.md`](rag.md) |
| 2026-09-15 | Tool `get_current_stocks` (`GetCurrentStocksTool`, `StocksStatisticsService.getCurrentStocks`): снимок остатков «сегодня»; ответ — агрегат (`listingsCount` / `quantityFull` / `inWay*` + `byMarketplace` со складами); `article` опционален. `StocksService` / HTTP stocks API не менялись. Регистрация в `AiModule` (`StocksModule` в `imports`). System prompt: запрет ASCII-таблиц |
| 2026-09-12 | Tool `create_test_item` (`CreateTestItemTool`) — первый write-tool: расчётный товар с габаритами и категорией через отдельный `ItemsAiToolsService` (`ItemsModule.exports`); legacy `POST /api/items` / `ItemsService` не тронуты. `AiTool` interface → `src/ai/tools/ai-tool.interface.ts` (из `orders/`); tools сгруппированы по домену (`orders/`, `items/`). System prompt: общие правила для инструментов-действий (не выдумывать параметры, спрашивать недостающие, сообщать результат/ошибку без тех. деталей) |
| 2026-09-11 | Tool `compare_order_periods` (`CompareOrderPeriodsTool`, `OrdersStatisticsService.comparePeriods`): агрегаты за два периода одним запросом; сравнение/проценты — на стороне LLM. Фильтр `article` во всех трёх tools (`orders_v2 → marketplace_items → items.article`). `marketplaceTitle` → общий `z.enum` (`marketplace-title.schema.ts`) |
| 2026-09-01 | Zod-валидация аргументов tools: `AiTool.parameters: z.ZodType`, `AiToolExecutor`, схемы в `src/ai/tools/orders/dto/`; JSON Schema через `z.toJSONSchema`; DTO в orders удалены. Tool `get_order_statistics_by_marketplace`. Удалён Telegram-спайк (`src/telegram`, deps `nestjs-telegraf`/`telegraf`) |
| 2026-08-28 | Spike: `AiModule`, DeepSeek, `POST /api/ai/chat`, tool `get_order_statistics` |
