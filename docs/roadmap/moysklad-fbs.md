# Roadmap: Мой склад → FBS (WB)

> Метки: **FACT** / **ASSUMPTION** / **NEEDS VERIFICATION** / **DECISION**.  
> Связанные: [`../AI_CONTEXT.md`](../AI_CONTEXT.md).

Последнее обновление: 2026-08-26.

---

## Goal

Источник FBS-остатков — **Мой склад**. Пуш available на WB FBS-склад. Заказ покупателя в МС (резерв) при FBS-заказе; отмена → `applicable: false`. Ozon — позже.

## Scope v1

| Включено | Отложено |
|---|---|
| WB FBS | Ozon FBS warehouses / orders / stock push |
| Маппинг 1 store МС ↔ 1 `warehouses` | Yandex, demand/отгрузка, GAS UI |

## Schema (FACT, `1789450000000`)

- `moysklad_warehouse_mappings` — `moysklad_store_id` ↔ `warehouse_id` (1:1)
- `moysklad_item_links` — `item_id` ↔ assortment UUID МС
- `moysklad_outbox` — `create_customer_order` / `cancel_customer_order`

### Outbox rules (DECISION)

FBS для МС = `orders_v2.warehouse_id` ∈ `moysklad_warehouse_mappings`.

- Insert заказа → enqueue `create_customer_order`
- Cancel (`cancel_reason_id` set) → enqueue `cancel_customer_order`
- Unique `(type, orders_v2_id)`; FBO / вне mapping → не пишем
- `status`: `pending` (не отправлено) | `done` (отправлено). Без `attempts` / `next_retry_at` — при ошибке остаётся `pending`, текст в `last_error`.

## Known mapping (FACT)

| МС store | WB warehouse title |
|---|---|
| `33807737-9724-11f1-0a80-05ba001dd13f` «ФБС Е-фулфилмент (Назаров)» | «Быково (Тамов) УФО» |

Env: `moyskladToken`, `moyskladOrganizationId` (`6b546503-…`), `moyskladAgentId` (`42a6a21e-…` ВАЙЛДБЕРРИЗ).

Seed mapping — SQL после миграции (не хардкодить `warehouses.id` в миграции).

## Status

| Шаг | Статус |
|---|---|
| Таблицы + entities | ✔ |
| MoySkladClient / stock push WB | ✔ cron `syncStocksToMarketplaces`; publisher WB |
| Enqueue + worker customerorder | □ |
| Ozon FBS warehouses sync | ✔ `/v2/warehouse/list` → `type=FBS` |
| Ozon FBS stock push / orders | □ later |
