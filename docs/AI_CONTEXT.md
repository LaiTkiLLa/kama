# AI_CONTEXT — оперативная память проекта

> Оперативные решения. При противоречии с кодом — верить коду.

---

## Принятые решения

- `items` + `marketplace_items`; возврат к `item == listing` запрещён.
- `send_status_id` целевое место — `marketplace_items`; dual-write на `items` до cutover.
- Архив listing — `marketplace_items.deleted_at`.
- UI — Google Sheets + GAS.
- Stop-list read — только `GET /api/items/v2/stop-list`.

---

## Завершено (FACT, 2026-08-07)

| Область | Статус |
|---------|--------|
| Stocks/Orders sync по `marketplace_item_id` | ✔ |
| Stop-list v1 read retired | ✔ |
| Entity + migration `send_status_id` (`1786097301320`) | ✔ (прогон — NEEDS VERIFICATION) |
| PATCH stop-list: find → update by id, dual-write; без `continue` | ✔ |
| Autostatus: mp root, dual-write, `orders_v2`, aggregations по `marketplace_item_id` | ✔ |
| v2 stop-list read `sendStatus` с `mpItems` | ✔ |
| category / imageUrl / title на mp | □ |
| Drop `items.send_status_id` | □ cutover |

---

## Known issues / next

| Issue | Суть |
|-------|------|
| Migration run | применить `1786097301320` до прод-использования dual-write |
| category / imageUrl / title | ещё на `items`; следующий перенос полей |
| dual-write `send_status` | держать до Consolidation/Cutover |

---

## История

| Дата | Итог |
|------|------|
| 2026-08-07 | StopList send_status: PATCH/autostatus/v2 read на mp items |
| 2026-08-07 | migration send_status_id; stocks mp-centric |
