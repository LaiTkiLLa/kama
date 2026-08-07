# Items ↔ MarketplaceItems

> Главный документ доменной модели ассортимента.  
> Roadmap: `[../roadmap/items-marketplace-items-migration.md](../roadmap/items-marketplace-items-migration.md)`.  
> Решения: `[../AI_CONTEXT.md](../AI_CONTEXT.md)`.

---

## Зачем появилась `marketplace_items`

**FACT:** слой **listing’а на конкретном маркетплейсе**; stocks и orders ссылаются на `marketplace_item_id`.

**DECISION:** полностью перейти на MarketplaceItems. Возврат к «item == listing» **запрещён**.

---

## Целевая архитектура

```text
Item (marketplace-independent, 1 на article)
 ├── MarketplaceItem (WB)   ← category, imageUrl, send_status_id, prices, …
 ├── MarketplaceItem (Ozon)
 └── MarketplaceItem (Yandex)
        ├── Stocks
        └── OrdersV2
```



### Поля на `items` (DECISION)

Marketplace-independent:


| Группа                       | Поля                                                                                                                                                                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Идентичность                 | `id`, `article`, `articleOld`, `ownCategory`, `title`                                                                                                                                                                                                                                                                    |
| Логистика / сроки            | `consolidation`, `payment`, `assembling`, `fullfillmentAcceptance`, `marketplaceAcceptance`, `production`, `buffer`, `daysDeliveryToRussia`                                                                                                                                                                              |
| Классификация / планирование | `directionId`, `classification`, `multiplicity`, `boxNumber`, `virality`, `createdForCalculation`                                                                                                                                                                                                                        |
| Габариты / объём (общие)     | `dimensionsFact`, `dimensionsMasterBox`, `volume`                                                                                                                                                                                                                                                                        |
| Себестоимость / таможня      | `costInYuan`, `costInYuanWhite`, `costInRub`, `codeTNVED`, `replenishmentPeriod`, `remainingBalance`, `volumePerUnit`, `weightPerUnit`, `transportRateUsd`, `dutyPercentage`, `density`, `tariffWeight`, `costCalculationType`, `calculationType`, `seasonalityForExport`, `seasonalityForOrder`, `supplierMinimumOrder` |
| Прочее                       | `ownImagesUrl`, `downloadCalculationMethod`                                                                                                                                                                                                                                                                              |


Плюс audit: `createdAt`, `updatedAt`.

**Не на** `items` **в целевой модели:** `sendStatusId` — переносится на mp item (**DECISION**).

### Поля на `marketplace_items` (DECISION)

Все marketplace-specific данные, включая:


| Уже есть (FACT) | В процессе / дальше |
|-----------------|---------------------|
| identity, dimensions, volume, chrt, deleted_at | `category`, `imageUrl`, title-on-mp, цены, `wbCreatedAt` |
| **`send_status_id`** (entity + migration `1786097301320`) | drop с `items` — только cutover |




### Архив listing’а (DECISION)

- **Целевой механизм:** `marketplace_items.deleted_at`
- `isArchive` **на** `items`**:** не нужен в будущем; не использовать как primary archive flag

**FACT:** v2 stop-list уже фильтрует `mpItems.deletedAt IS NULL` (без `isArchive`).

---



## Текущий transition state (FACT)

1. Sync создаёт отдельную строку `items` на каждый МП + `marketplace_items` 1:1.
2. Stocks / Orders sync: lookup/uniqueness по `marketplace_item_id` (Yandex findStock использует `item.marketplaceItemId`).
3. `send_status_id`: полный контур на mp (entity, migration, PATCH dual-write, autostatus, v2 read `mpItems.sendStatus`); dual-write на `items` до cutover.
4. category / imageUrl / title — ещё на `items`.

### Stop-list (FACT)

| Endpoint / код | Статус |
|----------------|--------|
| `GET …/stop-list` v1 | отключён |
| `GET …/v2/stop-list` | ✔ `mpItems.sendStatus` |
| `PATCH …/stop-list` | ✔ find → update by id, dual-write, без continue |
| `updateItemSendStatus` | ✔ mp root + dual-write + mp aggregations + `orders_v2` |


---



## Milestones


| #                   | Статус                                                           |
| ------------------- | ---------------------------------------------------------------- |
| 1. MarketplaceItems | ✔                                                                |
| 2. Stocks           | ✔                                                                |
| 3. Orders           | ✔                                                                |
| 4. StopList | ✔ send_status track; дальше category/imageUrl/title |
| 5. Consolidation    | □                                                                |
| 6. Cutover          | □                                                                |


[roadmap](../roadmap/items-marketplace-items-migration.md)

---



## Legacy (ещё не снято)


| Область            | Legacy                                                  |
| ------------------ | ------------------------------------------------------- |
| Autostatus / PATCH / v2 sendStatus | ✔ на `marketplace_items` (+ dual-write items) |
| Prices / category / imageUrl | ещё на `items` |


---



## Glossary


| Термин              | Значение                                           |
| ------------------- | -------------------------------------------------- |
| **Listing archive** | `marketplace_items.deleted_at` (не `isArchive`)    |
| **Send status**     | Целевое место — `marketplace_items.send_status_id` |
| **Stop-list v2**    | Единственный read API стоп-листа                   |


---



## Правило для изменений

1. `AI_CONTEXT` + этот документ + roadmap.
2. Исследовать `src/` и migrations.
3. Plan → изменения  → обновить roadmap и AI_CONTEXT при новом решении → обновить docs.

