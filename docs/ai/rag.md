# RAG — база знаний для in-app агента

> Индексация операторской документации (Google Sheets / GAS) в векторную БД для retrieval в LLM-агенте.  
> **Не путать**: `docs/rag/*.md` — **корпус для операторов** (индексируется); этот файл — **dev-документ** про модуль `src/rag`.

Связанные: [`in-app-agent.md`](in-app-agent.md), [`../AI_CONTEXT.md`](../AI_CONTEXT.md), [`../README.md`](../README.md).

Последнее обновление: 2026-09-21 (reranker, payload `section`/`keywords`).

---

## Назначение

**FACT:** модуль `src/rag` собирает markdown из `docs/rag/`, режет на чанки (секция + breadcrumb заголовков, лимит длины), получает embeddings через Hugging Face Inference API и складывает в коллекцию Qdrant. Триггер — HTTP `POST /api/rag/index` (с `api-key`).

**FACT:** retrieval подключён к агенту: tool `search_documentation` (`AiModule` импортирует `RagModule`) → `RagService.searchDocumentation` → embedding вопроса (HF) → `QdrantService.search` (10 кандидатов, `score_threshold`) → `RerankerService.rerank` (cross-encoder `BAAI/bge-reranker-v2-m3`, HF) → top-3 по `rerankScore`. Оператор через `POST /api/ai/chat` спрашивает «как добавить товар?» / «что за лист Поставщики — SKU?» — агент отвечает по найденным чанкам.

---

## Статус

| Область | Статус |
|---------|--------|
| Модуль `RagModule`, endpoint `POST /api/rag/index` (`api-key`) | ✔ |
| Загрузка `docs/rag/*.md` (`DocumentLoaderService`) | ✔ |
| Чанкинг: секции + breadcrumb + лимит 500 символов (`ChunkerService`) | ✔ (2026-09-18) |
| Embeddings HF `paraphrase-multilingual-MiniLM-L12-v2` (`EmbeddingService`) | ✔ |
| Qdrant: lazy init коллекции + payload index `source` (`QdrantService`) | ✔ (2026-09-18) |
| Переиндексация без stale-чанков (`deleteBySources` перед upsert) | ✔ (2026-09-18) |
| Поиск по вопросу (`RagService.searchDocumentation`, `score_threshold`) | ✔ |
| Reranking кандидатов (`RerankerService`, HF `BAAI/bge-reranker-v2-m3`) | ✔ код (2026-09-21); □ NEEDS VERIFICATION на реальных запросах (формат входа, доступность модели на `hf-inference`) |
| Payload `section` (тема документа) и `keywords` в Qdrant | `section` ✔ (2026-09-21); `keywords` — только тип/payload, чанкер не заполняет |
| Tool `search_documentation` в `AiModule` | ✔ |
| Ошибки tools → `{ error }` для LLM вместо HTTP 500 (`AiToolExecutor`) | ✔ (2026-09-18) |
| `Dockerfile` → `node:22` (требование qdrant-client) | ✔ (2026-09-18) |
| Qdrant | **внешний** сервис (отдельный docker вне репозитория); в `docker-compose.yml` его **нет** — DECISION |
| Корпус: `master-data.md`, `product-creation.md` | ✔ 2 документа, 13 чанков |
| Калибровка `MIN_SIMILARITY` / `TOP_K` / порога `rerankScore` на реальных вопросах | □ NEEDS VERIFICATION (сейчас 0.5 / 3 / порога нет; `similarity` и `rerankScore` пишутся в лог) |
| Батчи / retry для HF при росте корпуса | □ backlog |

---

## Конфигурация

### Переменные окружения

| Переменная | Ключ в `configuration.ts` | Назначение |
|------------|---------------------------|------------|
| `HUGGING_FACE_TOKEN` | `huggingFaceToken` | токен HF Inference API; общий для `EmbeddingService` и `RerankerService`. **Не коммитить.** Без него `embedChunks` / `embedQuery` / `rerank` бросают ошибку при вызове. |
| `QDRANT_URL` | `qdrantUrl` | URL внешнего Qdrant (например `http://localhost:6333` или адрес контейнера в общей docker-сети). **Необязателен для старта**: без него `QdrantService` пишет warning, а индексация/поиск возвращают ошибку при вызове. |
| `QDRANT_COLLECTION` | `qdrantCollection` | имя коллекции; default `documentation`. |
| `apiKey` | *(читается напрямую `process.env.apiKey`, как в других контроллерах)* | заголовок `api-key` для `POST /api/rag/index`. |

**DECISION (2026-09-18):** приложение **не зависит** от Qdrant при старте. Раньше `QdrantService` бросал в конструкторе и ходил в Qdrant в `onModuleInit` — недоступный Qdrant валил весь бэкенд вместе с cron'ами маркетплейсов. Теперь клиент создаётся лениво, коллекция проверяется/создаётся при первом обращении (memoized promise со сбросом при ошибке), ошибка доходит до вызывающего (`/rag/index` → 500; tool → `{ error }` для LLM).

### Зависимости

| Пакет | Роль |
|-------|------|
| `@huggingface/inference` ^4.13 | `InferenceClient.featureExtraction` (embeddings), `InferenceClient.textClassification` (reranker) |
| `@qdrant/js-client-rest` ^1.19 | REST-клиент Qdrant (`engines.node >= 22`) |

**FACT:** `Dockerfile` — `node:22-alpine` (поднят с 21 под требование qdrant-client). Локально Node 24.

### Локальный запуск

1. Поднять Qdrant **отдельно** (он не входит в `docker-compose.yml` этого репозитория): например `docker run -d -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant`.
2. Токен на [huggingface.co](https://huggingface.co/settings/tokens).
3. В `.env`:

```env
HUGGING_FACE_TOKEN=hf_...
QDRANT_URL=http://localhost:6333
# QDRANT_COLLECTION=documentation
```

4. `npm run start:dev`.
5. `POST /api/rag/index` с заголовком `api-key` → индексация; коллекция создастся при первом вызове.

**DECISION (2026-09-18):** Qdrant живёт в **отдельном docker вне этого репозитория**; в `docker-compose.yml` сервис не добавляем, `depends_on` нет. Бэкенд знает о нём только через `QDRANT_URL`. Коллекцию бэкенд создаёт сам при первом обращении (`ensureCollection`), так что от внешнего Qdrant требуется только доступность по URL.

---

## HTTP API

Global prefix: `/api`.

### `POST /api/rag/index`

Заголовок `api-key` обязателен (тот же паттерн, что `GET /api/orders/dynamic`: сравнение с `process.env.apiKey`, иначе `403`). Без body.

Полный проход: load → chunk → embed → `deleteBySources` → upsert. Ответ:

```json
{ "documents": ["master-data.md", "product-creation.md"], "chunksCount": 13 }
```

---

## Архитектура

### Индексация

```text
POST /api/rag/index (api-key)
        ↓
RagController → RagService.makeIndexDocumentation
        ↓
DocumentLoaderService     docs/rag/*.md → { source: <filename>, content }
        ↓
ChunkerService            секции по заголовкам → breadcrumb + тело; тело > 500 симв. → делится по абзацам/строкам
        ↓
EmbeddingService.embedChunks   HF featureExtraction (все чанки одним запросом) → number[384][]
        ↓
QdrantService.deleteBySources(sources)   удалить старые точки этих документов (filter payload.source)
        ↓
QdrantService.upsertChunks   point { id: sha256(source:content)[0..32], vector, payload: { content, source, heading, section, keywords } }
```

### Retrieval (из агента)

```text
POST /api/ai/chat → AiService (tool loop) → AiToolExecutor (try/catch → { error })
        ↓
SearchDocumentationTool { query }            src/ai/tools/rag/
        ↓
RagService.searchDocumentation(args)         TOP_K = 3, MIN_SIMILARITY = 0.5, кандидатов 10
   ├─ EmbeddingService.embedQuery(query)     → HF → number[384]
   ├─ QdrantService.search(vector, 10, 0.5)  → client.query(limit 10, score_threshold 0.5, with_payload)
   │     log "Qdrant": source#heading=similarity
   └─ RerankerService.rerank(query, candidates)
         → HF textClassification(bge-reranker-v2-m3, `${query}\n${content}`, sigmoid) на каждый чанк (Promise.all)
         → sort by rerankScore desc
         log "Reranked": source#heading=rerankScore
        ↓
slice(0, 3) → RerankedChunk[] { content, source, heading?, section?, keywords?, similarity, rerankScore }
```

| Слой | Файл | Роль |
|------|------|------|
| Module | `src/rag/rag.module.ts` | providers; `exports: [RagService]` — единственная точка входа для `AiModule` |
| Controller | `src/rag/rag.controller.ts` | `POST /rag/index`, `api-key` |
| Orchestration | `src/rag/rag.service.ts` | `makeIndexDocumentation()`, `searchDocumentation(args)`: embed → Qdrant (10 кандидатов) → rerank → top-`TOP_K`; константы `TOP_K`, `MIN_SIMILARITY` (число кандидатов `10` пока литерал) |
| Loader | `src/rag/document-loader.service.ts` | `readdir(process.cwd()/docs/rag)`, только `*.md` |
| Chunker | `src/rag/chunker.service.ts` | секции → breadcrumb + sub-chunks; `MAX_CHUNK_CHARS = 500`; `section = breadcrumb[0]` (первый `#` документа) |
| Embeddings | `src/rag/embedding.service.ts` | HF `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, provider `hf-inference`; `embedChunks`, `embedQuery`; `VECTOR_SIZE = 384`; клиент создаётся один раз |
| Reranker | `src/rag/reranker.service.ts` | HF `BAAI/bge-reranker-v2-m3` через `textClassification` (`top_k: 1`, `function_to_apply: 'sigmoid'`); `rerank(query, chunks)` → `RerankedChunk[]` по убыванию `rerankScore`; свой lazy `InferenceClient` на том же `huggingFaceToken` |
| Vector store | `src/rag/qdrant.service.ts` | lazy `ensureCollection` (`size: VECTOR_SIZE, Cosine` + payload index `source: keyword`); `search(vector, topK, minSimilarity)`; `deleteBySources`; `upsertChunks(wait: true)`; payload `{ content, source, heading, section, keywords }` |
| Types | `src/rag/interfaces/` | `document-chunk.interface.ts` — `DocumentChunk` (`content, source, heading?, section?, keywords?`) и `Section` (промежуточная единица разбора в чанкере); `retrieved-chunk.interface.ts` — `RetrievedChunk = DocumentChunk & { similarity }`, `RerankedChunk = RetrievedChunk & { rerankScore }`; `index-documentation-result.interface.ts` — ответ `/rag/index`. Сервисы типов не объявляют, только импортируют |
| AI tool | `src/ai/tools/rag/search-documentation.tool.ts` + `dto/search-documentation.schema.ts` | `search_documentation`; zod `{ query: string.trim().min(1) }` |

**DECISION (2026-09-18):** `EmbeddingService` — только векторизация, **без** зависимости от `QdrantService`. Оркестрация embed → search собрана в `RagService`; порог и topK — константы там же (одно место, без дублирования defaults).

**DECISION (2026-09-18):** порог отдаётся Qdrant как `score_threshold`, а не пост-фильтром по 10 кандидатам.

**DECISION (2026-09-21):** two-stage retrieval. Qdrant (bi-encoder, cosine) отбирает 10 кандидатов с `similarity ≥ MIN_SIMILARITY`, затем cross-encoder `bge-reranker-v2-m3` переоценивает пару «вопрос + чанк» и финальный top-3 берётся по `rerankScore`, а не по cosine. Мотив: `paraphrase-multilingual-MiniLM` (128 токенов, paraphrase-задача) плохо ранжирует между близкими секциями одного документа; cross-encoder видит вопрос и текст вместе. `RerankerService` — отдельный провайдер (как `EmbeddingService`), без зависимости от Qdrant; оркестрация в `RagService`. Подробности — раздел «Reranking».

**FACT:** `RagService.searchDocumentation(params: SearchDocumentationArgs)` импортирует тип из `src/ai/tools/rag/dto/` — тот же компромисс «домен зависит от ai-схем», что у `orders` / `items` / `stocks` (см. [`in-app-agent.md`](in-app-agent.md)).

**FACT:** путь к корпусу — `process.cwd()/docs/rag`. В Docker `WORKDIR /app` и `COPY . .` — папка попадает в образ. При запуске не из корня репо loader упадёт с `ENOENT`.

**FACT:** размерность вектора — `EmbeddingService.VECTOR_SIZE = 384`, `QdrantService` берёт её оттуда при создании коллекции. Смена модели → менять `model` + `VECTOR_SIZE` **и пересоздавать коллекцию** (Qdrant не даст upsert с другой размерностью).

**DECISION (spike):** отдельный `RagModule`, а не часть `AiModule`: индексация — инфраструктурная операция, retrieval подключён к агенту через `exports`.

**DECISION (spike):** id точки детерминированный — `sha256("<source>:<content>")` (первые 32 hex). Повторная индексация неизменённого чанка перезаписывает ту же точку. Так как id зависит от содержимого, перед upsert вызывается `deleteBySources` — иначе изменённые секции оставались бы в коллекции.

**FACT:** `deleteBySources` удаляет только документы, которые **есть** в `docs/rag/` на момент индексации. Файл, удалённый из папки, в Qdrant останется — для такого случая пересоздать коллекцию вручную (или удалить точки по `source` через API Qdrant).

**NEEDS VERIFICATION:** Qdrant принимает строковый id только как UUID. 32 hex без дефисов соответствует «simple» формату UUID и должен парситься; проверить на первом реальном запуске (в ответе Qdrant id вернётся в hyphenated виде).

---

## Чанкинг

**FACT (2026-09-18):** `ChunkerService.chunkDocument`:

1. Секция = текст от заголовка (`#`–`######`) до следующего заголовка любого уровня. Текст до первого заголовка — отдельная секция без `heading`.
2. Стек заголовков по уровням даёт **breadcrumb**: `Для чего служат листы в Master Data > 2. Поставщики — SKU`. Breadcrumb добавляется в начало `content` каждого чанка (и уходит в embedding, и виден LLM). Пропуски уровней (`#` → `###`) допустимы.
3. Тело секции длиннее `MAX_CHUNK_CHARS = 500` делится по абзацам (пустая строка), абзацы упаковываются жадно; абзац длиннее лимита (длинный список) делится по строкам. Все sub-chunks получают тот же breadcrumb и `heading`.

**ASSUMPTION:** 500 символов ≈ 110–130 токенов XLM-R sentencepiece для русского → укладывается в `max_seq_length = 128` модели с учётом breadcrumb. Точную токенизацию не считаем; при смене модели на окно 512 лимит можно поднять.

**FACT:** на текущем корпусе — 13 чанков: `master-data.md` — 8 (секция «Поставщики — SKU» разбита на 2: 429 + 213 символов), `product-creation.md` — 5. Максимальный чанк 464 символа.

### Payload чанка

**FACT (2026-09-21):** `DocumentChunk` расширен полями `section?: string` и `keywords?: string[]`; оба уходят в payload Qdrant (`upsertChunks`) и читаются обратно в `search`.

- `section` — `breadcrumb[0]`, т.е. первый `#` документа («тема»: `Для чего служат листы в Master Data`). Заполняется чанкером для всех чанков, у которых есть хотя бы один заголовок; преамбула до первого `#` — `section: undefined`. Сейчас **никем не используется** (ни фильтр Qdrant, ни LLM) — заготовка под фильтрацию по теме / группировку результатов.
- `keywords` — **только тип и payload**: `ChunkerService` его не заполняет, в Qdrant всегда `null`. Заготовка под ручные/LLM-ключевые слова для гибридного поиска.

**FACT:** после добавления полей нужен повторный `POST /api/rag/index` — у старых точек `section` в payload нет.

---

## Reranking

**FACT (2026-09-21):** `RerankerService.rerank(query, chunks)`:

1. Пустой вход → `[]` (без запроса в HF).
2. На **каждый** кандидат — отдельный запрос `InferenceClient.textClassification({ model: 'BAAI/bge-reranker-v2-m3', inputs: `${query}\n${chunk.content}`, parameters: { top_k: 1, function_to_apply: 'sigmoid' } })`; запросы параллельно через `Promise.all`.
3. `rerankScore = result[0]?.score ?? 0` — sigmoid от logit'а cross-encoder'а, диапазон 0..1.
4. Результат сортируется по `rerankScore` desc; `RagService` берёт первые `TOP_K = 3`. **Порога по `rerankScore` нет** — если Qdrant вернул хоть что-то, LLM получит до 3 чанков независимо от их rerank-оценки.

**FACT:** `RagService.searchDocumentation` пишет два лога на запрос: `Qdrant "<query>": [source#heading=similarity, …]` (10 кандидатов, cosine) и `Reranked "<query>": [source#heading=rerankScore, …]` (те же чанки в новом порядке). По ним сравнивать, меняет ли reranker порядок и насколько разнесены оценки.

**NEEDS VERIFICATION (критично):** `bge-reranker-v2-m3` — cross-encoder на **пару** (query, passage). Через `textClassification` в `@huggingface/inference` вход типизирован как `string`, поэтому пара склеена через `\n` в одну строку. Это не то же самое, что `[CLS] query [SEP] passage [SEP]` — модель может выдавать смещённые оценки. Проверить на реальном запуске: (а) отвечает ли `hf-inference` для этой модели задачей `text-classification` вообще (для reranker'ов HF часто требует отдельный endpoint / `sentence-similarity`); (б) разнесены ли `rerankScore` между релевантным и нерелевантным чанком (ожидание: >0.5 vs <0.1). Если формат не подходит — варианты: передавать `inputs` как `{ text, text_pair }` через `request()` напрямую, либо dedicated Inference Endpoint, либо локальная модель.

**NEEDS VERIFICATION:** `sigmoid` через `function_to_apply` — параметр pipeline transformers; на `hf-inference` он может игнорироваться, тогда `score` — softmax по одному label (всегда 1.0). Признак: все `rerankScore` в логе ≈ 1.000.

**FACT:** на каждый вопрос оператора — 1 запрос embeddings + до 10 запросов reranker в HF. При холодном старте модели (`503 model loading`) любой из них падает → весь `rerank` падает → tool возвращает `{ error }`, **fallback на порядок Qdrant нет**.

---

## Tool `search_documentation`

**FACT:** read-only tool агента. Файлы: `src/ai/tools/rag/search-documentation.tool.ts` (`SearchDocumentationTool`), схема `src/ai/tools/rag/dto/search-documentation.schema.ts` (`SearchDocumentationSchema`), domain `RagService.searchDocumentation`.

Параметры:

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `query` | `z.string().trim().min(1)` | да | поисковый запрос, сформулированный LLM по вопросу пользователя; без добавления того, чего в вопросе нет |

**FACT (2026-09-21):** ответ — до `TOP_K = 3` чанков в порядке `rerankScore` desc. Сигнатура объявлена как `RetrievedChunk[]`, фактически объекты — `RerankedChunk`: `{ content, source, heading?, section?, keywords?, similarity, rerankScore }` — все поля уходят LLM как результат tool. `content` начинается с breadcrumb. `source` — имя файла; `similarity` — cosine Qdrant (первая стадия); `rerankScore` — оценка cross-encoder'а (вторая стадия, по ней порядок). Пустой массив = ничего с `similarity ≥ MIN_SIMILARITY` на первой стадии.

**FACT:** каждый вызов пишет два лога: `Qdrant "<query>": [source#heading=similarity, …]` и `Reranked "<query>": [source#heading=rerankScore, …]` — по ним калибровать `MIN_SIMILARITY` и решать, нужен ли порог по `rerankScore`.

**DECISION (2026-09-21):** system prompt дополнен: не описывать процесс поиска, фрагменты, chunks, similarity, reranking и другие внутренние детали; не говорить «по найденному фрагменту» / «по результатам поиска»; если документации недостаточно — кратко сообщить; если документация покрывает часть вопроса — сначала известное из документации, затем чего не хватает. Мотив: в результат tool уходят `similarity`/`rerankScore`/`source`, и LLM без запрета пересказывала их пользователю.

**DECISION:** description tool и system prompt разводят источники: **документация** — про правила / процессы / термины / инструкции; **данные системы** (заказы, остатки, товары, статистика, цены) — только через соответствующие tools; документацию как источник текущих данных не использовать. Разрешено вызывать несколько tools, если нужны и инструкция, и данные.

**DECISION:** system prompt требует не утверждать то, чего в найденных чанках нет, и не выдумывать ответ при пустом результате поиска.

**NEEDS VERIFICATION:** порог `0.5` для cosine у `paraphrase-multilingual-MiniLM-L12-v2` на русских запросах не откалиброван — у multilingual paraphrase-моделей релевантные пары часто дают 0.35–0.6. Риск: ложные «в документации нет». Смотреть `similarity` в логах на реальных вопросах и при необходимости снизить `RagService.MIN_SIMILARITY`.

**FACT (2026-09-18):** ошибки внутри tool (HF 503 «model loading», Qdrant недоступен, `QDRANT_URL`/`HUGGING_FACE_TOKEN` не заданы) перехватываются `AiToolExecutor` и возвращаются LLM как `{ error: "Инструмент временно недоступен: …" }`; chat не падает. Это общее поведение для всех tools — см. [`in-app-agent.md`](in-app-agent.md).

---

## Корпус `docs/rag/`

**FACT:** аудитория — **операторы** Google Sheets, не разработчики. Язык — русский, терминология — из UI (листы, «Меню → …»). Все `.md` из папки индексируются автоматически; dev-документацию туда **не класть**.

| Файл | Тема | Чанков |
|------|------|--------|
| `master-data.md` | назначение листов таблицы Master Data (Товары, Поставщики — SKU, Логистика — SKU, Поставщики, Контрагенты), правило «жёлтые ячейки» + скрипт «Изменить данные» | 8 |
| `product-creation.md` | путь появления артикула: создать на WB → авто-синк → Master Data → «Товары → Получить данные» | 5 |

**FACT (проверено кодом):** «обновление раз в 40 минут» в `product-creation.md` соответствует `@Cron('0 */40 * * * *')` на `ItemsService.getWbItems` — запуск в :00 и :40 каждого часа, т.е. ожидание **до 40 минут**.

**NEEDS VERIFICATION:** пункты меню GAS («Изменить данные», «Товары → Получить данные») и состав полей листов — вне этого репозитория, кодом не проверяются.

### Правила для корпуса

- Один файл = одна тема; первый `#` — название темы, он попадает в breadcrumb каждого чанка.
- Заголовки `##`/`###` — единицы retrieval; секция должна быть понятна по «breadcrumb + текст», без соседей.
- Секция — коротко (≤ ~500 символов); длиннее — чанкер разрежет по абзацам, но лучше разбить подзаголовками.
- Не писать секреты, внутренние id, названия таблиц БД — читатель оператор.
- После правок — повторный `POST /api/rag/index`. Удалённый файл — см. FACT про `deleteBySources`.

---

## Known issues

| Issue | Суть |
|-------|------|
| **Порог `MIN_SIMILARITY = 0.5` не откалиброван** | см. раздел Tool; смотреть `similarity` в логах. |
| **Удалённые из `docs/rag/` файлы остаются в Qdrant** | `deleteBySources` чистит только текущие документы; пересоздать коллекцию вручную. |
| **Один запрос HF на весь корпус** | `embedChunks` шлёт все тексты одним `featureExtraction`. На 13 чанках ок; при росте — батчи + retry (HF `hf-inference` даёт 503 «model loading» на холодном старте). |
| **Reranker: формат входа не проверен** | пара (query, passage) склеена в одну строку через `\n` вместо `text`/`text_pair`; доступность `bge-reranker-v2-m3` как `text-classification` на `hf-inference` и эффект `function_to_apply: sigmoid` не подтверждены. См. раздел Reranking. |
| **Reranker без fallback** | ошибка любого из ≤10 параллельных HF-запросов валит весь `rerank` → tool `{ error }`; кандидаты Qdrant при этом уже есть, но не используются. Добавить `try/catch` → вернуть порядок Qdrant + warning в лог. |
| **До 10 HF-запросов на один вопрос** | `Promise.all` по кандидатам; латентность ≈ один запрос, но rate-limit HF на free tier достигается быстро. Вариант: батч через `request()` или ограничить кандидатов 5–6. |
| Нет порога по `rerankScore` | после reranking в LLM уходит top-3 всегда, даже если все оценки низкие. С cross-encoder'ом логичнее снизить `MIN_SIMILARITY` (шире воронка) и отсекать по `rerankScore` — после калибровки по логам. |
| `keywords` не заполняется | поле есть в типе и payload, чанкер его не пишет; в Qdrant `null`. Либо заполнить (вручную во frontmatter / LLM при индексации), либо убрать. |
| Число кандидатов `10` — литерал | в `RagService.searchDocumentation` вместо константы рядом с `TOP_K` / `MIN_SIMILARITY`. |
| Лимит чанка в символах, не в токенах | 500 символов — оценка под 128 токенов; для текста с латиницей/цифрами запас больше, для длинных русских слов — меньше. |
| Payload index `source` создаётся только вместе с коллекцией | у коллекции, созданной до 2026-09-18, индекса нет — `deleteBySources` работает (full scan), просто медленнее; можно создать индекс вручную. |

---

## Ограничения и запреты

- **Не коммитить** `HUGGING_FACE_TOKEN` / `QDRANT_URL` с credentials.
- В `docs/rag/` — только операторская документация; dev-docs — в `docs/ai/`, `docs/domain/`, `docs/roadmap/`.
- Retrieval в агент — только через `search_documentation` → `RagService`; без прямого обращения к `EmbeddingService` / `QdrantService` / `RerankerService` из `src/ai` (`RagModule.exports` = `[RagService]`).
- `RerankerService` не должен знать про Qdrant — вход и выход только чанки; оркестрация двух стадий — в `RagService`.
- Смена embedding-модели = смена `VECTOR_SIZE` = **пересоздание коллекции**; не менять «на лету» без плана.
- Не возвращать зависимость старта приложения от Qdrant (`OnModuleInit` / throw в конструкторе).
- Не убирать lazy `ensureCollection` из `QdrantService`: без него на чистом Qdrant `upsert`/`query` падают с «Collection not found», а без `QDRANT_URL` — `TypeError` на undefined-клиенте вместо понятной ошибки.
- Qdrant в `docker-compose.yml` не добавлять — внешний сервис.

---

## Следующие шаги (предложение)

1. Проверить reranker на реальном запуске: формат входа (`text`/`text_pair` vs склейка), доступность модели на `hf-inference`, разброс `rerankScore` в логах. При проблемах — `request()` с парой напрямую либо другой хостинг модели.
2. Fallback в `RagService`: ошибка reranker'а → порядок Qdrant + warning, а не `{ error }`.
3. Калибровка по логам `Qdrant` / `Reranked`: `MIN_SIMILARITY` (возможно снизить, т.к. фильтрует теперь reranker), порог по `rerankScore`, число кандидатов (вынести в константу).
4. Решить судьбу `keywords`: заполнять при индексации или убрать из типа/payload.
5. Батчи + retry (`503 model loading`) в `EmbeddingService.embedChunks` при росте корпуса.
6. Опция «полная пересборка» в `/rag/index` (recreate collection) для случая удалённых файлов.
7. Расширение корпуса: остальные операторские процессы (стоп-лист, остатки, заказы в Sheets).

---

## История

| Дата | Итог |
|------|------|
| 2026-09-21 | Two-stage retrieval: новый `RerankerService` (`src/rag/reranker.service.ts`, HF `BAAI/bge-reranker-v2-m3` через `textClassification`, sigmoid, `Promise.all` по кандидатам) в `RagModule.providers`; `RagService.searchDocumentation` — Qdrant 10 кандидатов (`MIN_SIMILARITY 0.5`) → rerank → `slice(0, TOP_K)`; два лога `Qdrant`/`Reranked`; убраны `console.log`. Типы: `RerankedChunk = RetrievedChunk & { rerankScore }`; `DocumentChunk` + `section?` (= `breadcrumb[0]`, пишет чанкер) и `keywords?` (не заполняется); оба поля в payload Qdrant (`upsertChunks`/`search`). System prompt: запрет упоминать процесс поиска / chunks / similarity / reranking, правило «известное из документации → чего не хватает». Known: формат входа reranker'а и доступность модели на `hf-inference` не проверены; нет fallback и порога по `rerankScore` |
| 2026-09-18 | Ревью после правок: Qdrant — **внешний** (сервис из `docker-compose.yml` убран, DECISION); типы вынесены в `src/rag/interfaces/` (`DocumentChunk` + `Section`, `RetrievedChunk`, `IndexDocumentationResult`), дубликаты в `chunker.service.ts` удалены, импорты переведены на interfaces; в `QdrantService` восстановлены lazy `getReadyClient`/`ensureCollection` (после правок коллекция не создавалась, `client` был non-optional и падал `TypeError` без `QDRANT_URL`) |
| 2026-09-18 | Hardening по ревью: `QdrantService` — lazy init (без `OnModuleInit`/throw в конструкторе), `collectionExists` + payload index `source`, `deleteBySources` перед upsert, `score_threshold` в `search`; `EmbeddingService` — только `embedChunks`/`embedQuery`, `VECTOR_SIZE`, без зависимости от Qdrant; оркестрация и константы `TOP_K`/`MIN_SIMILARITY` в `RagService`, лог `similarity`; `ChunkerService` — breadcrumb заголовков + лимит 500 символов (sub-chunks по абзацам/строкам); `POST /rag/index` — `api-key`, ответ `{ documents, chunksCount }`; `AiToolExecutor` — try/catch → `{ error }` для LLM (+ фикс lint `no-unsafe-assignment`); `configuration.ts` — `qdrantUrl` / `qdrantCollection`, убран `telegramBotToken`; `Dockerfile` → `node:22-alpine`; удалена пустая `src/rag/services/`. (Qdrant в compose добавлялся, но в тот же день убран — внешний сервис) |
| 2026-09-18 | Retrieval: tool `search_documentation` (`SearchDocumentationTool`, zod `{ query }`) → `RagService.searchDocumentation` (embed вопроса + Qdrant Query API, top-3, `similarity ≥ 0.5`). `AiModule` импортирует `RagModule`; `RagModule.exports` сужен до `[RagService]`. `RetrievedChunk` → `src/rag/interfaces/`; удалены `cosineSimilarity` и закомментированный код; убраны `console.log`. System prompt: разделение «документация vs данные системы», запрет утверждать то, чего нет в найденных чанках |
| 2026-09-18 | Spike индексации: `RagModule` (`src/rag`), `POST /api/rag/index`; HF `paraphrase-multilingual-MiniLM-L12-v2` (384) → Qdrant `documentation` (Cosine); корпус `docs/rag/master-data.md`, `docs/rag/product-creation.md`. Env `HUGGING_FACE_TOKEN`, `QDRANT_URL`, опц. `QDRANT_COLLECTION`. Deps `@huggingface/inference`, `@qdrant/js-client-rest`. Физически удалён `src/telegram/*` + deps `nestjs-telegraf` / `telegraf` (в docs было отмечено 2026-09-01) |
