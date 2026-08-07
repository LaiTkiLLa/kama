# Items ↔ MarketplaceItems

> Roadmap: [`../roadmap/items-marketplace-items-migration.md`](../roadmap/items-marketplace-items-migration.md).  
> Решения: [`../AI_CONTEXT.md`](../AI_CONTEXT.md).

---

## Зачем

**FACT:** listing-слой для stocks/orders через `marketplace_item_id`.  
**DECISION:** полный переход на MarketplaceItems; возврат к `item == listing` запрещён.

---

## Целевая архитектура

```text
Item (marketplace-independent, 1 на article)
 ├── MarketplaceItem (WB)   ← category, title, color, imageUrl, send_status_id, prices…
 ├── MarketplaceItem (Ozon)
 ├── MarketplaceItem (Yandex)
 └── MarketplaceItem (Yandex Tamov)   ← второй кабинет YM (FACT: title в marketplaces)
        ├── Stocks
        └── OrdersV2
```

**FACT:** второй кабинет Yandex — отдельный `marketplaces.title = 'Yandex Tamov'`, отдельные env (`yandexTamovToken` / `yandexTamovCLientId` / `yandexTamovBusinessId`) и cron’ы карточек / остатков / orders_v2. Не путать с `Yandex`.

### Поля на `items` (DECISION)

Marketplace-independent: `id`, `article`, `articleOld`, `ownCategory`, `title`, логистика/сроки, `directionId`, classification/virality/planning, общие габариты/объём, себестоимость/таможня, `ownImagesUrl`, `downloadCalculationMethod`, audit.

**Не целевые на `items`:** `sendStatusId`, `category`, `color`, `imageUrl`, MP-identity, MP-габариты, цены — dual-write / legacy до cutover.

### Поля на `marketplace_items`

| Уже в entity (FACT) | Дальше |
|---------------------|--------|
| identity, dimensions, volume, chrt, deleted_at | цены, `wbCreatedAt` |
| `category`, `title`, `color`, `image_url`, `send_status_id` | drop зеркал с `items` на cutover |

**Архив:** `deleted_at` (не `isArchive`).

---

## Текущий transition state (FACT)

1. Sync создаёт отдельную строку `items` на МП + `marketplace_items` 1:1.
2. Identity dual-write (barcode/sku/dimensions) — да.
3. **Listing-поля** на entity; `category`/`title` **nullable** (`1786107580847`). Card sync **create** заполняет listing fields; **update** — ещё только identity/dimensions → partial dual-write gap (M4b).
4. Stocks / Orders: lookup и uniqueness по `marketplace_item_id`.
5. Directory: `marketplacesInfo` читает category/barcode/image/color/itemTitle с **mp items**.
6. Stop-list: полный контур `send_status` на mp (+ dual-write items); v2 image/title/color пока с **`item`**.

### Stop-list (FACT)

| Endpoint / код | Статус |
|----------------|--------|
| `GET …/stop-list` v1 | отключён |
| `GET …/v2/stop-list` | ✔ `mpItems.sendStatus`; image/title/color с `item` |
| `PATCH …/stop-list` | ✔ find → update by id, dual-write, без continue |
| `updateItemSendStatus` | ✔ mp root + dual-write + mp aggregations + `orders_v2` |

---

## Milestones

| # | Статус |
|---|--------|
| 1. MarketplaceItems | ✔ |
| 2. Stocks | ✔ |
| 3. Orders | ✔ |
| 4. StopList (send_status) | ✔ |
| **4b. listing fields** | **schema ✔; create dual-write ✔; update / v2 selects □ ← мы здесь** |
| 5. Consolidation | □ |
| 6. Cutover | □ |

---

## Legacy

| Область | Legacy |
|---------|--------|
| Card sync create | listing fields → `items` + `marketplace_items` |
| Card sync update | listing fields только в `items`; mp — identity/dimensions |
| Card sync update mp key | по `{ itemId }` (безопасно только при 1:1) |
| v2 stop-list image/title/color | с `item` |
| dual-write `send_status` на `items` | до cutover |
| Prices | на `items` |

---

## Glossary

| Термин | Значение |
|--------|----------|
| **Listing archive** | `marketplace_items.deleted_at` |
| **Send status** | `marketplace_items.send_status_id` (+ dual на items) |
| **Stop-list v2** | единственный read |
| **Dual-write gap** | create пишет listing fields; update mp — ещё нет |

---

## Правило для изменений

1. `AI_CONTEXT` + этот документ + roadmap.  
2. Исследовать `src/` и migrations.  
3. Plan → изменения → обновить docs.
