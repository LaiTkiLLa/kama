import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Перенос send_status_id: items → marketplace_items (dual-write этап).
 *
 * Не удаляет send_status_id с items.
 * Включает backfill + integrity checks.
 */
export class AddSendStatusIdToMarketplaceItems1786097301320 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * ============================================================
     * 1. Колонка marketplace_items.send_status_id
     * ============================================================
     */
    // await queryRunner.addColumn(
    //   'marketplace_items',
    //   new TableColumn({
    //     name: 'send_status_id',
    //     type: 'integer',
    //     isNullable: true
    //   })
    // );

    /**
     * ============================================================
     * 2. Backfill из items по item_id
     *    (текущая модель: 1 items ≈ 1 marketplace_items)
     * ============================================================
     */
    // await queryRunner.query(`
    //   UPDATE marketplace_items mi
    //   SET
    //     send_status_id = i.send_status_id,
    //     updated_at = now()
    //   FROM items i
    //   WHERE mi.item_id = i.id
    // `);

    /**
     * ============================================================
     * 3. Проверка: нет orphan marketplace_items без items
     * ============================================================
     */
    await queryRunner.query(`
      DO $$
      DECLARE
        orphan_count integer;
      BEGIN
        SELECT COUNT(*)
        INTO orphan_count
        FROM marketplace_items mi
        WHERE NOT EXISTS (
          SELECT 1 FROM items i WHERE i.id = mi.item_id
        );

        IF orphan_count > 0 THEN
          RAISE EXCEPTION
            'Migration aborted: % marketplace_items have no parent items',
            orphan_count;
        END IF;
      END $$;
    `);

    /**
     * ============================================================
     * 4. Проверка: у каждого items есть mp item на тот же marketplace
     * ============================================================
     */
    await queryRunner.query(`
      DO $$
      DECLARE
        missing_count integer;
      BEGIN
        SELECT COUNT(*)
        INTO missing_count
        FROM items i
        WHERE NOT EXISTS (
          SELECT 1
          FROM marketplace_items mi
          WHERE mi.item_id = i.id
            AND mi.marketplace_id = i.marketplace_id
        );

        IF missing_count > 0 THEN
          RAISE EXCEPTION
            'Migration aborted: % items rows have no matching marketplace_items',
            missing_count;
        END IF;
      END $$;
    `);

    /**
     * ============================================================
     * 5. Проверка: send_status_id совпадает с items
     *    (NULL-safe через IS DISTINCT FROM)
     * ============================================================
     */
    // await queryRunner.query(`
    //   DO $$
    //   DECLARE
    //     mismatch_count integer;
    //   BEGIN
    //     SELECT COUNT(*)
    //     INTO mismatch_count
    //     FROM marketplace_items mi
    //     INNER JOIN items i ON i.id = mi.item_id
    //     WHERE mi.send_status_id IS DISTINCT FROM i.send_status_id;

    //     IF mismatch_count > 0 THEN
    //       RAISE EXCEPTION
    //         'Migration aborted: % marketplace_items.send_status_id mismatch items.send_status_id',
    //         mismatch_count;
    //     END IF;
    //   END $$;
    // `);

    /**
     * ============================================================
     * 6. Проверка: marketplace_id listing’а == items.marketplace_id
     * ============================================================
     */
    await queryRunner.query(`
      DO $$
      DECLARE
        mismatch_count integer;
      BEGIN
        SELECT COUNT(*)
        INTO mismatch_count
        FROM marketplace_items mi
        INNER JOIN items i ON i.id = mi.item_id
        WHERE mi.marketplace_id IS DISTINCT FROM i.marketplace_id;

        IF mismatch_count > 0 THEN
          RAISE EXCEPTION
            'Migration aborted: % marketplace_items.marketplace_id != items.marketplace_id',
            mismatch_count;
        END IF;
      END $$;
    `);

    /**
     * ============================================================
     * 7. Проверка: нет битых FK на statuses
     * ============================================================
     */
    // await queryRunner.query(`
    //   DO $$
    //   DECLARE
    //     invalid_count integer;
    //   BEGIN
    //     SELECT COUNT(*)
    //     INTO invalid_count
    //     FROM marketplace_items mi
    //     WHERE mi.send_status_id IS NOT NULL
    //       AND NOT EXISTS (
    //         SELECT 1 FROM statuses s WHERE s.id = mi.send_status_id
    //       );

    //     IF invalid_count > 0 THEN
    //       RAISE EXCEPTION
    //         'Migration aborted: % marketplace_items have send_status_id not present in statuses',
    //         invalid_count;
    //     END IF;
    //   END $$;
    // `);

    /**
     * ============================================================
     * 8. FK + index
     * ============================================================
     */
    // await queryRunner.createForeignKey(
    //   'marketplace_items',
    //   new TableForeignKey({
    //     name: 'FK_marketplace_items_send_status',
    //     columnNames: ['send_status_id'],
    //     referencedTableName: 'statuses',
    //     referencedColumnNames: ['id'],
    //     onDelete: 'CASCADE',
    //     onUpdate: 'CASCADE'
    //   })
    // );

    // await queryRunner.createIndex(
    //   'marketplace_items',
    //   new TableIndex({
    //     name: 'IDX_marketplace_items_send_status_id',
    //     columnNames: ['send_status_id']
    //   })
    // );

    // await queryRunner.query(`
    //   DO $$
    //   DECLARE
    //     total_mp bigint;
    //     with_status bigint;
    //   BEGIN
    //     SELECT COUNT(*) INTO total_mp FROM marketplace_items;
    //     SELECT COUNT(*) INTO with_status FROM marketplace_items WHERE send_status_id IS NOT NULL;

    //     RAISE NOTICE
    //       'send_status_id migration OK: marketplace_items=% with_status=%',
    //       total_mp,
    //       with_status;
    //   END $$;
    // `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('marketplace_items');
    const fk = table?.foreignKeys.find(f => f.name === 'FK_marketplace_items_send_status');
    if (fk) {
      await queryRunner.dropForeignKey('marketplace_items', fk);
    }

    const index = table?.indices.find(i => i.name === 'IDX_marketplace_items_send_status_id');
    if (index) {
      await queryRunner.dropIndex('marketplace_items', 'IDX_marketplace_items_send_status_id');
    }

    await queryRunner.dropColumn('marketplace_items', 'send_status_id');
  }
}
