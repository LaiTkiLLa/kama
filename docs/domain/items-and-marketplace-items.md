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


| Уже есть (FACT)                                                                                                          | Будут перенесены / добавлены (DECISION)                                       |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `marketplace_identifier`, `barcode`, `sku`, `dimensions`, `volume`, `chrt_id`, `marketplace_id`, `item_id`, `deleted_at` | `category`, `imageUrl`, `send_status_id`, цены, MP-габариты, `wbCreatedAt`, … |




### Архив listing’а (DECISION)

- **Целевой механизм:** `marketplace_items.deleted_at`
- `isArchive` **на** `items`**:** не нужен в будущем; не использовать как primary archive flag

**FACT:** v2 stop-list уже фильтрует `mpItems.deletedAt IS NULL` (без `isArchive`).

---



## Текущий transition state (FACT)

1. Sync создаёт отдельную строку `items` на каждый МП.
2. `marketplace_items` ≈ 1:1 к такой строке.
3. `stocks` / `orders_v2`: dual keys + `marketplace_item_id`.
4. MP-поля (`send_status_id`, `imageUrl`, `category`, …) **ещё на** `items`.
5. Stop-list read: только **v2**; v1 закомментирован.



### Stop-list (FACT)


| Endpoint / код                  | Статус                                                                      |
| ------------------------------- | --------------------------------------------------------------------------- |
| `GET /api/items/stop-list` (v1) | **отключён** (закомментирован)                                              |
| `GET /api/items/v2/stop-list`   | **активен** — mp-item centric, `orders_v2`, stocks по `marketplace_item_id` |
| `PATCH /api/items/stop-list`    | **активен** — пишет `items.send_status_id` (legacy)                         |
| `updateItemSendStatus` (cron)   | **legacy** — `orders`, `items.send_status_id`, stocks по `item_id`          |


---



## Milestones


| #                   | Статус                                                           |
| ------------------- | ---------------------------------------------------------------- |
| 1. MarketplaceItems | ✔                                                                |
| 2. Stocks           | ✔                                                                |
| 3. Orders           | ✔                                                                |
| 4. StopList         | **in progress** — read v1 ✔ retired; autostatus + write path — □ |
| 5. Consolidation    | □                                                                |
| 6. Cutover          | □                                                                |


[roadmap](../roadmap/items-marketplace-items-migration.md)

---



## Legacy (ещё не снято)


| Область            | Legacy                                                  |
| ------------------ | ------------------------------------------------------- |
| Autostatus         | `orders` + `items.send_status_id` + stocks по `item_id` |
| PATCH stop-list    | `items.send_status_id`                                  |
| v2 read sendStatus | join на `item.sendStatus` (до переноса колонки)         |
| Stocks API v1      | `GET /api/stocks/current`                               |
| Prices             | на `items`                                              |


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

