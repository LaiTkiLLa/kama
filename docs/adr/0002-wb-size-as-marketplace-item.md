# WB размеры как отдельные `marketplace_items`

Статус: **принято** (схема `1789520000000`).  
Связано: supersedes size-grain path в [`0001-stocks-v2-size-grain.md`](0001-stocks-v2-size-grain.md) для остатков (writers `stocks_v2` сняты; таблица пока не drop).

## Контекст

Ozon / Yandex моделируют размер как отдельный оффер (`offer_id` / `offerId`). WB держит размеры (`chrtID`) внутри карточки `nmID`. Чтобы унифицировать зерно остатков/заказов, WB size-listings выровнены с Ozon/Yandex: **один sellable SKU = одна строка `marketplace_items`**.

## Решение

- `marketplace_identifier` = `nmID` (как раньше; у size-listings одной карточки одинаковый)
- `chrt_id` = `chrtID` (отличает размер; lookup stocks/orders)
- `size_name` / `size_value` = `techSize` / `wbSize`
- `getWbItems` создаёт/обновляет listings в цикле по `sizes[]`, **не** пишет в `marketplace_item_sizes`
- Миграция `178952` — только schema (`size_*`, index `chrt_id`); размножение size-listings — первый sync WB
- `stocks` пишется по size-listing (`chrt_id`); writers `stocks_v2` отключены
- Orders: матч по barcode; FBS tasks — по `chrt_id` (без fallback на `nmID`)
- Directory/ERP — flat: одна строка на listing, без вложенного массива sizes

## Последствия

- Несколько active `marketplace_items` на один `item_id` + WB — ожидаемо
- До первого `getWbItems` после деплоя size-listings могут быть неполными; заказы/остатки по размеру заработают после sync
- Drop `stocks_v2` / `marketplace_item_sizes` — отдельный шаг после подтверждения
