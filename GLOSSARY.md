# Kama

Домен операций с маркетплейсами: товары, листинги, размеры и снимки остатков (WB / Ozon / Yandex).

## Язык

**Товар (Item)**:
Продукт без привязки к маркетплейсу; один на артикул (кроме расчётных товаров).
_Не использовать_: Product (двусмысленно), SKU

**Листинг (Listing)**:
Sellable SKU в кабинете маркетплейса (`marketplace_items`). У WB — один listing на размер: `marketplace_identifier`=`nmID`, `chrt_id`=`chrtID`. У Ozon/Yandex listing ≈ оффер.
_Не использовать_: «строка marketplace item» (деталь реализации), карточка (только UI)

**Карточка WB (Card)**:
Группа size-listings с одним `marketplace_identifier` (= `nmID`). Не отдельная таблица.
_Не использовать_: Listing (это размер/оффер)

**Размер МП (Marketplace Size)** _(legacy)_:
Ранее `marketplace_item_sizes`; для WB runtime источник — size-listing. Таблица ещё в схеме.
_Не использовать_: как primary source для новых writers

**Снимок остатков**:
Дневное количество по листингу (size/offer) на складе (`stocks`).
_Не использовать_: `stocks_v2` (writers сняты; таблица legacy)
