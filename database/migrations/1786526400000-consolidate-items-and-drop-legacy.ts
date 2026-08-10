import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Milestone 5 — схлопывание items + cleanup legacy.
 *
 * 1. 1 article → 1 item (created_for_calculation = false не трогаем как отдельные строки)
 * 2. Repoint marketplace_items / stocks / orders_v2 / items_sizes / items_suppliers
 * 3. DROP legacy orders, directions
 * 4. DROP MP-колонок с items
 *
 * Требует: 1786522800000-move-prices-to-marketplace-items (цены уже на mp).
 * Irreversible.
 */
export class ConsolidateItemsAndDropLegacy1786526400000 implements MigrationInterface {
  private async dropForeignKeysForColumns(
    queryRunner: QueryRunner,
    tableName: string,
    columnNames: string[]
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (!table) {
      return;
    }

    for (const columnName of columnNames) {
      for (const foreignKey of table.foreignKeys) {
        if (foreignKey.columnNames.includes(columnName)) {
          await queryRunner.dropForeignKey(tableName, foreignKey);
        }
      }
    }
  }

  private async dropColumnIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (table?.findColumnByName(columnName)) {
      await queryRunner.dropColumn(tableName, columnName);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * ============================================================
     * 0. Preflight: сколько дублей будет схлопнуто
     * ============================================================
     */
    await queryRunner.query(`
      DO $$
      DECLARE
        duplicate_groups integer;
        rows_to_delete integer;
      BEGIN
        SELECT COUNT(*)
        INTO duplicate_groups
        FROM (
          SELECT article
          FROM items
          WHERE created_for_calculation = false
          GROUP BY article
          HAVING COUNT(*) > 1
        ) t;

        SELECT COUNT(*)
        INTO rows_to_delete
        FROM items i
        WHERE i.created_for_calculation = false
          AND i.id NOT IN (
            SELECT DISTINCT ON (article) id
            FROM items
            WHERE created_for_calculation = false
            ORDER BY
              article,
              CASE
                WHEN marketplace_id = (SELECT id FROM marketplaces WHERE title = 'WB' LIMIT 1) THEN 0
                ELSE 1
              END,
              id
          );

        RAISE NOTICE
          'Consolidation preflight: duplicate article groups=%, items rows to delete=%',
          duplicate_groups,
          rows_to_delete;
      END $$;
    `);

    /**
     * ============================================================
     * 1. Canonical item per article (prefer WB row)
     * ============================================================
     */
    await queryRunner.query(`
      CREATE TEMP TABLE item_consolidation_map ON COMMIT DROP AS
      WITH wb_marketplace AS (
        SELECT id
        FROM marketplaces
        WHERE title = 'WB'
        LIMIT 1
      ),
      canonical_items AS (
        SELECT DISTINCT ON (i.article)
          i.id AS canonical_item_id,
          i.article
        FROM items i
        WHERE i.created_for_calculation = false
        ORDER BY
          i.article,
          CASE
            WHEN i.marketplace_id = (SELECT id FROM wb_marketplace) THEN 0
            ELSE 1
          END,
          i.id
      )
      SELECT
        i.id AS old_item_id,
        c.canonical_item_id
      FROM items i
      INNER JOIN canonical_items c ON c.article = i.article
      WHERE i.created_for_calculation = false
        AND i.id <> c.canonical_item_id
    `);

    /**
     * ============================================================
     * 2. Merge marketplace-independent fields into canonical row
     * ============================================================
     */
    await queryRunner.query(`
      UPDATE items canonical
      SET
        wb_created_at = COALESCE(canonical.wb_created_at, src.wb_created_at),
        own_images_url = COALESCE(canonical.own_images_url, src.own_images_url),
        updated_at = now()
      FROM item_consolidation_map m, items src
      WHERE src.id = m.old_item_id
        AND canonical.id = m.canonical_item_id
    `);

    /**
     * ============================================================
     * 3. Repoint child tables
     * ============================================================
     */
    await queryRunner.query(`
      UPDATE marketplace_items mi
      SET item_id = m.canonical_item_id, updated_at = now()
      FROM item_consolidation_map m
      WHERE mi.item_id = m.old_item_id
    `);

    await queryRunner.query(`
      UPDATE stocks s
      SET item_id = m.canonical_item_id, updated_at = now()
      FROM item_consolidation_map m
      WHERE s.item_id = m.old_item_id
    `);

    await queryRunner.query(`
      UPDATE orders_v2 o
      SET item_id = m.canonical_item_id, updated_at = now()
      FROM item_consolidation_map m
      WHERE o.item_id = m.old_item_id
    `);

    await queryRunner.query(`
      UPDATE items_sizes sz
      SET item_id = m.canonical_item_id, updated_at = now()
      FROM item_consolidation_map m
      WHERE sz.item_id = m.old_item_id
        AND NOT EXISTS (
          SELECT 1
          FROM items_sizes existing
          WHERE existing.item_id = m.canonical_item_id
            AND existing.chrt_id IS NOT DISTINCT FROM sz.chrt_id
            AND existing.tech_size IS NOT DISTINCT FROM sz.tech_size
        )
    `);

    await queryRunner.query(`
      DELETE FROM items_sizes sz
      USING item_consolidation_map m
      WHERE sz.item_id = m.old_item_id
    `);

    await queryRunner.query(`
      UPDATE items_suppliers isup
      SET item_id = m.canonical_item_id
      FROM item_consolidation_map m
      WHERE isup.item_id = m.old_item_id
        AND NOT EXISTS (
          SELECT 1
          FROM items_suppliers existing
          WHERE existing.item_id = m.canonical_item_id
            AND existing.supplier_id = isup.supplier_id
        )
    `);

    await queryRunner.query(`
      DELETE FROM items_suppliers isup
      USING item_consolidation_map m
      WHERE isup.item_id = m.old_item_id
    `);

    /**
     * ============================================================
     * 4. Dedup marketplace_items (item_id + marketplace_id)
     * ============================================================
     */
    await queryRunner.query(`
      CREATE TEMP TABLE marketplace_items_duplicates ON COMMIT DROP AS
      SELECT
        mi.id AS duplicate_mp_id,
        keep.id AS keep_mp_id
      FROM marketplace_items mi
      INNER JOIN marketplace_items keep
        ON keep.item_id = mi.item_id
       AND keep.marketplace_id = mi.marketplace_id
       AND keep.id < mi.id
    `);

    await queryRunner.query(`
      UPDATE stocks s
      SET marketplace_item_id = d.keep_mp_id, updated_at = now()
      FROM marketplace_items_duplicates d
      WHERE s.marketplace_item_id = d.duplicate_mp_id
    `);

    await queryRunner.query(`
      UPDATE orders_v2 o
      SET marketplace_item_id = d.keep_mp_id, updated_at = now()
      FROM marketplace_items_duplicates d
      WHERE o.marketplace_item_id = d.duplicate_mp_id
    `);

    await queryRunner.query(`
      DELETE FROM marketplace_items mi
      USING marketplace_items_duplicates d
      WHERE mi.id = d.duplicate_mp_id
    `);

    /**
     * ============================================================
     * 5. Delete duplicate items
     * ============================================================
     */
    await queryRunner.query(`
      DELETE FROM items i
      USING item_consolidation_map m
      WHERE i.id = m.old_item_id
    `);

    /**
     * ============================================================
     * 6. Verification
     * ============================================================
     */
    await queryRunner.query(`
      DO $$
      DECLARE
        duplicate_articles integer;
        duplicate_mp_pairs integer;
        orphan_mp_items integer;
      BEGIN
        SELECT COUNT(*)
        INTO duplicate_articles
        FROM (
          SELECT article
          FROM items
          WHERE created_for_calculation = false
          GROUP BY article
          HAVING COUNT(*) > 1
        ) t;

        IF duplicate_articles > 0 THEN
          RAISE EXCEPTION
            'Migration aborted: % articles still have multiple items rows',
            duplicate_articles;
        END IF;

        SELECT COUNT(*)
        INTO duplicate_mp_pairs
        FROM (
          SELECT item_id, marketplace_id
          FROM marketplace_items
          GROUP BY item_id, marketplace_id
          HAVING COUNT(*) > 1
        ) t;

        IF duplicate_mp_pairs > 0 THEN
          RAISE EXCEPTION
            'Migration aborted: % duplicate marketplace_items (item_id, marketplace_id) pairs',
            duplicate_mp_pairs;
        END IF;

        SELECT COUNT(*)
        INTO orphan_mp_items
        FROM marketplace_items mi
        LEFT JOIN items i ON i.id = mi.item_id
        WHERE i.id IS NULL;

        IF orphan_mp_items > 0 THEN
          RAISE EXCEPTION
            'Migration aborted: % marketplace_items without items row',
            orphan_mp_items;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_items_article_not_calculation"
      ON items (article)
      WHERE created_for_calculation = false
    `);

    /**
     * ============================================================
     * 7. Drop legacy orders
     * ============================================================
     */
    const ordersTable = await queryRunner.getTable('orders');
    if (ordersTable) {
      await queryRunner.dropTable('orders', true, true, true);
    }

    /**
     * ============================================================
     * 8. Drop MP / direction / send_status columns from items
     * ============================================================
     */
    await this.dropForeignKeysForColumns(queryRunner, 'items', [
      'marketplace_id',
      'send_status_id',
      'direction_id'
    ]);

    const legacyItemColumns = [
      'category',
      'title',
      'barcode',
      'sku',
      'color',
      'marketplace_identifier',
      'marketplace_id',
      'dimensions_wb',
      'dimensions_ozon',
      'dimensions_yandex',
      'volume_wb',
      'volume_ozon',
      'volume_yandex',
      'chrt_id',
      'image_url',
      'send_status_id',
      'direction_id'
    ];

    for (const column of legacyItemColumns) {
      await this.dropColumnIfExists(queryRunner, 'items', column);
    }

    /**
     * ============================================================
     * 9. Drop directions
     * ============================================================
     */
    const directionsTable = await queryRunner.getTable('directions');
    if (directionsTable) {
      await queryRunner.dropTable('directions', true, true, true);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'ConsolidateItemsAndDropLegacy1786526400000 is irreversible: items merge and legacy drops cannot be rolled back safely.'
    );
  }
}
