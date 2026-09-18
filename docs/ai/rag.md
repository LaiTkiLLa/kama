# RAG — база знаний для in-app агента

> Индексация операторской документации (Google Sheets / GAS) в векторную БД для retrieval в LLM-агенте.  
> **Не путать**: `docs/rag/*.md` — **корпус для операторов** (индексируется); этот файл — **dev-документ** про модуль `src/rag`.

Связанные: [`in-app-agent.md`](in-app-agent.md), [`../AI_CONTEXT.md`](../AI_CONTEXT.md), [`../README.md`](../README.md).

Последнее обновление: 2026-09-18.

---

## Назначение

**FACT:** модуль `src/rag` собирает markdown из `docs/rag/`, режет по заголовкам, получает embeddings через Hugging Face Inference API и складывает в коллекцию Qdrant. Триггер — HTTP `POST /api/rag/index`.

**ASSUMPTION:** целевой сценарий — оператор задаёт агенту (`POST /api/ai/chat`) вопрос по работе с таблицами («как добавить товар?», «что за лист Поставщики — SKU?»), агент достаёт релевантные чанки из Qdrant и отвечает по документации, а не по догадкам.

**FACT:** retrieval-часть **ещё не реализована**: в агенте (`AiModule`) `RagModule` не импортируется, tool/поиск по Qdrant отсутствует. Сейчас это только индексация.

---

## Статус

| Область | Статус |
|---------|--------|
| Модуль `RagModule`, endpoint `POST /api/rag/index` | ✔ spike (2026-09-18) |
| Загрузка `docs/rag/*.md` (`DocumentLoaderService`) | ✔ |
| Чанкинг по markdown-заголовкам (`ChunkerService`) | ✔ (без лимита размера) |
| Embeddings HF `paraphrase-multilingual-MiniLM-L12-v2` (`EmbeddingService`) | ✔ |
| Qdrant: создание коллекции при старте + upsert (`QdrantService`) | ✔ |
| Корпус: `master-data.md`, `product-creation.md` | ✔ 2 документа |
| Поиск по вопросу (`search` / `embedQuery`) | □ код закомментирован / не используется |
| Интеграция в `AiService` (tool или инъекция контекста в prompt) | □ backlog |
| Удаление устаревших чанков при переиндексации | □ backlog (см. Known issues) |
| Auth (`api-key`) на `/rag/index` | □ backlog |
| Qdrant в `docker-compose.yml` | □ нет |

---

## Конфигурация

### Переменные окружения

| Переменная | Ключ в `configuration.ts` | Назначение |
|------------|---------------------------|------------|
| `HUGGING_FACE_TOKEN` | `huggingFaceToken` | токен HF Inference API. **Не коммитить.** |
| `QDRANT_URL` | `QDRANT_URL` | URL Qdrant (например `http://localhost:6333`). **Обязателен**: без него `QdrantService` бросает исключение в конструкторе и приложение **не стартует**. |
| `QDRANT_COLLECTION` | *(нет; читается напрямую через `ConfigService.get`)* | имя коллекции; default `documentation`. |

**FACT:** `QDRANT_URL` — единственный ключ в `configuration.ts` в UPPER_CASE (остальные camelCase). `QDRANT_COLLECTION` в `configuration.ts` не объявлен — работает за счёт fallback `ConfigService` в `process.env`.

**FACT:** в `configuration.ts` остался `telegramBotToken` — потребителей нет (Telegram-спайк удалён, `src/telegram/*` в этом же changeset).

### Зависимости

| Пакет | Роль |
|-------|------|
| `@huggingface/inference` ^4.13 | `InferenceClient.featureExtraction` |
| `@qdrant/js-client-rest` ^1.19 | REST-клиент Qdrant |

**NEEDS VERIFICATION:** `@qdrant/js-client-rest@1.19` объявляет `engines.node >= 22`, `Dockerfile` — `node:21-alpine`. Локально Node 24. `npm install` даст `EBADENGINE` warning (не fail), но prod-образ надо либо поднять до `node:22`, либо проверить, что клиент работает на 21.

### Локальный запуск

1. Поднять Qdrant (например `docker run -p 6333:6333 qdrant/qdrant`) — в `docker-compose.yml` сервиса **нет**.
2. Получить токен на [huggingface.co](https://huggingface.co/settings/tokens).
3. В `.env`:

```env
HUGGING_FACE_TOKEN=hf_...
QDRANT_URL=http://localhost:6333
# QDRANT_COLLECTION=documentation
```

4. `npm run start:dev` → при старте `QdrantService.onModuleInit` создаёт коллекцию, если её нет.
5. `POST /api/rag/index` → индексация.

---

## HTTP API

Global prefix: `/api`.

### `POST /api/rag/index`

Без body. Полный проход: load → chunk → embed → upsert. Ответ — пустой (`makeIndexDocumentation` ничего не возвращает).

**FACT:** заголовок `api-key` **не проверяется** (как и у `POST /api/ai/chat`). Перед prod — тот же паттерн, что у `GET /api/orders/dynamic`.

**FACT:** в `RagService.makeIndexDocumentation` остались `console.log('start' | 'first' | 'second' | 'end')` — отладочные, заменить на `Logger` или убрать.

---

## Архитектура

```text
POST /api/rag/index
        ↓
RagController → RagService.makeIndexDocumentation
        ↓
DocumentLoaderService   docs/rag/*.md  → { source: <filename>, content }
        ↓
ChunkerService          split по /^#{1,6}\s/ → DocumentChunk { content, source, heading? }
        ↓
EmbeddingService        HF featureExtraction (все чанки одним запросом) → number[384][]
        ↓
QdrantService.upsertChunks   point { id: sha256(source:content)[0..32], vector, payload: { content, source, heading } }
```

| Слой | Файл | Роль |
|------|------|------|
| Module | `src/rag/rag.module.ts` | providers; `exports: [EmbeddingService, QdrantService]` (пока никем не импортируется) |
| Controller | `src/rag/rag.controller.ts` | `POST /rag/index` |
| Orchestration | `src/rag/rag.service.ts` | pipeline индексации |
| Loader | `src/rag/document-loader.service.ts` | `readdir(process.cwd()/docs/rag)`, только `*.md` |
| Chunker | `src/rag/chunker.service.ts` | один чанк = одна секция от заголовка до следующего |
| Embeddings | `src/rag/embedding.service.ts` | HF `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, provider `hf-inference` |
| Vector store | `src/rag/qdrant.service.ts` | коллекция `size: 384, distance: Cosine`; `upsert(wait: true)` |

**FACT:** путь к корпусу — `process.cwd()/docs/rag`. В Docker `WORKDIR /app` и `COPY . .` — папка попадает в образ. При запуске не из корня репо loader упадёт с `ENOENT`.

**FACT:** размер вектора `384` захардкожен в `QdrantService` и совпадает с размерностью выбранной модели. Смена модели → менять оба места и пересоздавать коллекцию (Qdrant не даст upsert с другой размерностью).

**DECISION (spike):** отдельный `RagModule`, а не часть `AiModule`: индексация — инфраструктурная операция, retrieval потом подключается к агенту через exports.

**DECISION (spike):** id точки детерминированный — `sha256("<source>:<content>")` (первые 32 hex). Повторная индексация неизменённого чанка перезаписывает ту же точку, дубликатов не создаёт.

**NEEDS VERIFICATION:** Qdrant принимает строковый id только как UUID. 32 hex без дефисов соответствует «simple» формату UUID и должен парситься; проверить на первом реальном запуске (в ответе Qdrant id вернётся в hyphenated виде).

---

## Корпус `docs/rag/`

**FACT:** аудитория — **операторы** Google Sheets, не разработчики. Язык — русский, терминология — из UI (листы, «Меню → …»). Все `.md` из папки индексируются автоматически; dev-документацию туда **не класть**.

| Файл | Тема | Секций (чанков) |
|------|------|-----------------|
| `master-data.md` | назначение листов таблицы Master Data (Товары, Поставщики — SKU, Логистика — SKU, Поставщики, Контрагенты), правило «жёлтые ячейки» + скрипт «Изменить данные» | 8 |
| `product-creation.md` | путь появления артикула: создать на WB → авто-синк → Master Data → «Товары → Получить данные» | 5 |

**FACT (проверено кодом):** «обновление раз в 40 минут» в `product-creation.md` соответствует `@Cron('0 */40 * * * *')` на `ItemsService.getWbItems` — запуск в :00 и :40 каждого часа, т.е. ожидание **до 40 минут**.

**NEEDS VERIFICATION:** пункты меню GAS («Изменить данные», «Товары → Получить данные») и состав полей листов — вне этого репозитория, кодом не проверяются.

### Правила для корпуса

- Один файл = одна тема; заголовки `##`/`###` — единицы retrieval, каждая секция должна быть понятна **без** соседних (в чанк не попадает родительский заголовок).
- Секция — коротко: модель обрезает вход на ~128 токенов (см. Known issues). Длинные списки лучше разбить на подзаголовки.
- Не писать секреты, внутренние id, названия таблиц БД — читатель оператор.
- После правок — повторный `POST /api/rag/index`.

---

## Known issues

| Issue | Суть |
|-------|------|
| **Жёсткая зависимость старта от Qdrant** | `QdrantService` бросает в конструкторе без `QDRANT_URL` и ходит в Qdrant в `onModuleInit`. Недоступный Qdrant = не поднимается **весь** бэкенд (crons WB/Ozon/Yandex тоже). Для prod нужен либо lazy init / `try-catch` с warning, либо feature-flag. |
| **Stale-чанки** | id зависит от содержимого. Изменил текст секции → новая точка, старая остаётся в коллекции и продолжает попадать в поиск. Нужен `delete` по фильтру `payload.source` перед upsert (или пересоздание коллекции). |
| **Обрезка по длине** | `paraphrase-multilingual-MiniLM-L12-v2` — `max_seq_length = 128` токенов; чанкер лимита нет. Секции вроде «Поставщики — SKU» (10+ пунктов списка) на русском почти наверняка длиннее → хвост секции в вектор не попадает. Варианты: sub-chunking по абзацам/пунктам с overlap, либо модель с большим окном (`multilingual-e5-*`, 512). |
| **Потеря контекста заголовка** | чанк `## 2. Поставщики — SKU` не знает, что он про Master Data. Добавить breadcrumb (`# Title > ## Section`) в начало `content` или в payload и в текст для embedding. |
| **Мёртвый код** | `EmbeddingService.search` закомментирован; `embedQuery` (private), `cosineSimilarity`, `RetrievedChunk` не используются — cosine считает Qdrant. Оставить только `embedQuery` (публичным) для retrieval. |
| **Один запрос HF на весь корпус** | `embedChunks` шлёт все тексты одним `featureExtraction`. На 13 чанках ок; при росте — батчи + retry (HF `hf-inference` даёт 503 «model loading» на холодном старте). |
| **Node engine** | `@qdrant/js-client-rest` требует Node ≥ 22, `Dockerfile` — `node:21-alpine`. |
| `POST /rag/index` без auth | любой, кто дошёл до порта, может триггерить платные вызовы HF. |
| Debug `console.log` в `RagService` | заменить на `Logger`. |
| `telegramBotToken` в `configuration.ts` | leftover после удаления Telegram-спайка. |

---

## Ограничения и запреты

- **Не коммитить** `HUGGING_FACE_TOKEN` / `QDRANT_URL` с credentials.
- В `docs/rag/` — только операторская документация; dev-docs — в `docs/ai/`, `docs/domain/`, `docs/roadmap/`.
- Retrieval в агент — через отдельный tool или явный контекст в system prompt по правилам [`in-app-agent.md`](in-app-agent.md) («Добавление нового tool»); без прямого обращения к Qdrant из `AiService`.
- Смена embedding-модели = смена размерности = **пересоздание коллекции**; не менять «на лету» без плана.

---

## Следующие шаги (предложение)

1. Retrieval: `EmbeddingService.embedQuery` (public) + `QdrantService.search(vector, topK, scoreThreshold)` → tool `search_documentation` в `AiModule` (импорт `RagModule`).
2. Переиндексация без мусора: `deleteBySource(source)` перед upsert или `recreateCollection` на полном проходе.
3. Chunker: лимит по длине + breadcrumb заголовков.
4. Отвязать старт приложения от Qdrant (lazy `ensureCollection` при первом вызове / warning вместо throw).
5. `Dockerfile` → `node:22-alpine`; Qdrant-сервис в `docker-compose.yml` (volume под `/qdrant/storage`).
6. `api-key` на `/rag/index`; убрать `console.log`.

---

## История

| Дата | Итог |
|------|------|
| 2026-09-18 | Spike индексации: `RagModule` (`src/rag`), `POST /api/rag/index`; HF `paraphrase-multilingual-MiniLM-L12-v2` (384) → Qdrant `documentation` (Cosine); корпус `docs/rag/master-data.md`, `docs/rag/product-creation.md`. Env `HUGGING_FACE_TOKEN`, `QDRANT_URL`, опц. `QDRANT_COLLECTION`. Deps `@huggingface/inference`, `@qdrant/js-client-rest`. Физически удалён `src/telegram/*` + deps `nestjs-telegraf` / `telegraf` (в docs было отмечено 2026-09-01). Retrieval и связь с `AiService` — ещё нет |
