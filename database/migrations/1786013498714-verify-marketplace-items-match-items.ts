import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Контрольная проверка после копирования полей items → marketplace_items.
 *
 * Сравнивает данные listing’а на items с marketplace_items
 * в текущей модели 1:1 (item_id + marketplace_id).
 *
 * При любом расхождении — RAISE EXCEPTION (миграция не проходит).
 * Данные не изменяет.
 */
export class VerifyMarketplaceItemsMatchItems1786013498714 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * ============================================================
     * 1. Нет дублей marketplace_items на (item_id, marketplace_id)
     * ============================================================
     */
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM marketplace_items
          GROUP BY item_id, marketplace_id
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION
            'Verification aborted: duplicate marketplace_items for item_id + marketplace_id';
        END IF;
      END $$;
    `);

    /**
     * ============================================================
     * 2. У каждого item есть marketplace_item на тот же marketplace_id
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
            'Verification aborted: % items rows have no matching marketplace_items',
            missing_count;
        END IF;
      END $$;
    `);

    /**
     * ============================================================
     * 3. У каждого marketplace_item есть items
     *    (orphan mp items)
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
          SELECT 1
          FROM items i
          WHERE i.id = mi.item_id
        );

        IF orphan_count > 0 THEN
          RAISE EXCEPTION
            'Verification aborted: % marketplace_items rows have no parent items',
            orphan_count;
        END IF;
      END $$;
    `);

    /**
     * ============================================================
     * 4. marketplace_id listing’а совпадает с items.marketplace_id
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
            'Verification aborted: % marketplace_items have marketplace_id != items.marketplace_id',
            mismatch_count;
        END IF;
      END $$;
    `);

    /**
     * ============================================================
     * 5. Скопированные поля совпадают
     *    color, category, image_url, title
     *    (send_status_id проверяется в 1786097301320)
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
        WHERE mi.color IS DISTINCT FROM i.color
           OR mi.category IS DISTINCT FROM i.category
           OR mi.image_url IS DISTINCT FROM i.image_url
           OR mi.title IS DISTINCT FROM i.title;

        IF mismatch_count > 0 THEN
          RAISE EXCEPTION
            'Verification aborted: % marketplace_items rows mismatch items on color/category/image_url/title',
            mismatch_count;
        END IF;
      END $$;
    `);

    /**
     * ============================================================
     * 6. Ранее перенесённые identity-поля тоже совпадают
     *    (регрессия dual-write)
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
        WHERE mi.marketplace_identifier IS DISTINCT FROM i.marketplace_identifier
           OR mi.barcode IS DISTINCT FROM i.barcode
           OR mi.sku IS DISTINCT FROM i.sku
           OR mi.chrt_id IS DISTINCT FROM i.chrt_id;

        IF mismatch_count > 0 THEN
          RAISE EXCEPTION
            'Verification aborted: % marketplace_items rows mismatch items on marketplace_identifier/barcode/sku/chrt_id',
            mismatch_count;
        END IF;
      END $$;
    `);

    /**
     * ============================================================
     * 7. Сводка (в лог миграции, без fail)
     * ============================================================
     */
    await queryRunner.query(`
      DO $$
      DECLARE
        items_count bigint;
        mp_items_count bigint;
      BEGIN
        SELECT COUNT(*) INTO items_count FROM items;
        SELECT COUNT(*) INTO mp_items_count FROM marketplace_items;

        RAISE NOTICE
          'Verification OK: items=% marketplace_items=%',
          items_count,
          mp_items_count;
      END $$;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // no-op: verification only
  }
}
