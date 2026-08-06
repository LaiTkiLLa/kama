# Items ↔ MarketplaceItems

> Главный документ доменной модели.  
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
 └── MarketplaceItem (Yandex)
        ├── Stocks
        └── OrdersV2
```

### Поля на `items` (DECISION)

Marketplace-independent: `id`, `article`, `articleOld`, `ownCategory`, `title`, логистика/сроки, `directionId`, classification/virality/planning, общие габариты/объём, себестоимость/таможня, `ownImagesUrl`, `downloadCalculationMethod`, audit.

**Не целевые на `items`:** `sendStatusId`, `category`, `color`, `imageUrl`, MP-identity, MP-габариты, цены — остаются до cutover как legacy dual-write.

### Поля на `marketplace_items`

| Уже в схеме / entity (FACT) | Ещё не переносим |
|-----------------------------|------------------|
| identity: identifier, barcode, sku, dimensions, volume, chrt, marketplace_id, item_id, deleted_at | цены, `wb_created_at` |
| **новое:** `category`, `title`, `color`, `image_url`, `send_status_id` | |

**Архив:** `deleted_at` (не `isArchive`).

---

## Текущий transition state (FACT)

1. Sync карточек всё ещё создаёт **отдельную** строку `items` на МП + `marketplace_items` 1:1.
2. **Identity dual-write** (barcode/sku/dimensions/…) — да.
3. **Новые поля** (`category/title/color/imageUrl/sendStatusId`) — на entity + migrations; **card sync create/update `MarketplaceItems` их не заполняет** (только identity/dimensions) → dual-write gap.
4. Stocks / Orders sync: lookup и uniqueness по `marketplace_item_id`; `item_id` всё ещё пишется (dual keys).
5. Directory: `marketplacesInfo` читает category/barcode/image/color/itemTitle с **mp items**.
6. Stop-list read: v2 only; image/title/color/`sendStatus` всё ещё с **`item`**.
7. Stop-list write / autostatus: legacy `items.send_status_id` / `orders`.

### Stop-list

| Endpoint / код | Статус |
|----------------|--------|
| `GET …/stop-list` v1 | отключён |
| `GET …/v2/stop-list` | активен (mp-centric stocks/orders_v2) |
| `PATCH …/stop-list` | пишет `items.send_status_id` |
| `updateItemSendStatus` | legacy `orders` + `items` |

### Stocks / Orders sync

| Поток | Статус |
|-------|--------|
| WB/Ozon/Yandex stocks create | `marketplaceItemId` обязателен; без mp item — skip |
| WB FBS list | `MarketplaceItems` + `deletedAt IS NULL` |
| Yandex stocks **find** existing row | **bug:** в цикле `result` используется `findMarketplaceItem.id` внешнего цикла, не `item.marketplaceItemId` |
| Orders v2 find/create | по `marketplaceItemId` |

---

## Milestones

| # | Статус |
|---|--------|
| 1. MarketplaceItems | ✔ |
| 2. Stocks | ✔ *(Yandex findStock bug)* |
| 3. Orders | ✔ |
| 4. StopList + listing fields | **in progress** |
| 5. Consolidation | □ |
| 6. Cutover | □ |

---

## Glossary

| Термин | Значение |
|--------|----------|
| **Listing archive** | `marketplace_items.deleted_at` |
| **Send status** | цель — `marketplace_items.send_status_id` |
| **Stop-list v2** | единственный read |
| **Dual-write gap** | новые колонки на mp items есть, sync карточек их ещё не заполняет |

---

## Правило для изменений

1. `AI_CONTEXT` + этот документ + roadmap.  
2. Исследовать `src/` и migrations.  
3. Plan → изменения → обновить docs.
