import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfill product-level размеры: marketplace_item_sizes → item_characteristics.
 *
 * Правило (WB techSize в marketplace_item_sizes.name):
 * - name = '0' → one-size товар, вариаций нет → item_characteristics не создаём
 * - name != '0' → каждая вариация → строка item_characteristics (value = wbSize или techSize)
 *
 * Источник: активные marketplace_item_sizes + marketplace_items (deleted_at IS NULL).
 * Приоритет listing: WB, затем остальные кабинеты.
 */
export class BackfillItemSizesFromMarketplaceItemSizes1789360000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO characteristics (name, type, created_at, updated_at)
      SELECT 'Размер', 'string', now(), now()
      WHERE NOT EXISTS (
        SELECT 1 FROM characteristics WHERE name = 'Размер' AND deleted_at IS NULL
      )
    `);

    await queryRunner.query(`
      WITH size_characteristic AS (
        SELECT id FROM characteristics
        WHERE name = 'Размер' AND deleted_at IS NULL
        LIMIT 1
      ),
      active_mp_sizes AS (
        SELECT
          mi.item_id,
          mis.name AS tech_size,
          mis.value AS wb_size,
          m.title AS marketplace_title
        FROM marketplace_item_sizes mis
        INNER JOIN marketplace_items mi ON mi.id = mis.marketplace_item_id
        INNER JOIN marketplaces m ON m.id = mi.marketplace_id
        WHERE mis.deleted_at IS NULL
          AND mi.deleted_at IS NULL
      ),
      item_variations AS (
        SELECT item_id
        FROM active_mp_sizes
        GROUP BY item_id
        HAVING COUNT(*) FILTER (WHERE tech_size IS DISTINCT FROM '0') > 0
      ),
      variation_rows AS (
        SELECT DISTINCT ON (ams.item_id, normalized_value)
          ams.item_id,
          TRIM(
            COALESCE(NULLIF(TRIM(ams.wb_size), ''), NULLIF(TRIM(ams.tech_size), ''))
          ) AS normalized_value
        FROM active_mp_sizes ams
        INNER JOIN item_variations iv ON iv.item_id = ams.item_id
        WHERE ams.tech_size IS DISTINCT FROM '0'
          AND TRIM(COALESCE(NULLIF(TRIM(ams.wb_size), ''), NULLIF(TRIM(ams.tech_size), ''))) <> ''
        ORDER BY
          ams.item_id,
          TRIM(COALESCE(NULLIF(TRIM(ams.wb_size), ''), NULLIF(TRIM(ams.tech_size), ''))),
          CASE WHEN ams.marketplace_title = 'WB' THEN 0 ELSE 1 END
      )
      INSERT INTO item_characteristics (item_id, characteristic_id, value, created_at, updated_at)
      SELECT
        vr.item_id,
        sc.id,
        vr.normalized_value,
        now(),
        now()
      FROM variation_rows vr
      CROSS JOIN size_characteristic sc
      WHERE NOT EXISTS (
        SELECT 1
        FROM item_characteristics ic
        WHERE ic.item_id = vr.item_id
          AND ic.characteristic_id = sc.id
          AND ic.value = vr.normalized_value
          AND ic.deleted_at IS NULL
      )
    `);

    await queryRunner.query(`
      UPDATE characteristics
      SET type = 'string', updated_at = now()
      WHERE name = 'Размер' AND deleted_at IS NULL AND type <> 'string'
    `);

    await queryRunner.query(`
      INSERT INTO characteristic_values (characteristic_id, value, created_at, updated_at)
      SELECT DISTINCT
        c.id,
        ic.value,
        now(),
        now()
      FROM item_characteristics ic
      INNER JOIN characteristics c ON c.id = ic.characteristic_id
      WHERE c.name = 'Размер'
        AND c.deleted_at IS NULL
        AND ic.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM characteristic_values cv
          WHERE cv.characteristic_id = c.id
            AND cv.value = ic.value
            AND cv.deleted_at IS NULL
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE item_characteristics ic
      SET deleted_at = now(), updated_at = now()
      FROM characteristics c
      WHERE ic.characteristic_id = c.id
        AND c.name = 'Размер'
        AND c.deleted_at IS NULL
        AND ic.deleted_at IS NULL
    `);

    await queryRunner.query(`
      UPDATE characteristic_values cv
      SET deleted_at = now(), updated_at = now()
      FROM characteristics c
      WHERE cv.characteristic_id = c.id
        AND c.name = 'Размер'
        AND c.deleted_at IS NULL
        AND cv.deleted_at IS NULL
    `);
  }
}
