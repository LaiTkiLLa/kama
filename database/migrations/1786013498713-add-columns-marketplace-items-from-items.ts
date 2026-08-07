import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Dual-write шаг: копируем MP-related поля с items → marketplace_items.
 *
 * color, category, image_url, title.
 * send_status_id — отдельная миграция 1786097301320 (из master).
 *
 * Не удаляем колонки из items.
 * Цены и wb_created_at не трогаем.
 */
export class AddColumnsMarketplaceItemsFromItems1786013498713 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * ============================================================
     * 1. Добавляем колонки в marketplace_items
     * ============================================================
     */
    await queryRunner.addColumns('marketplace_items', [
      new TableColumn({
        name: 'color',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'category',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'image_url',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'title',
        type: 'varchar',
        isNullable: true
      })
    ]);

    /**
     * ============================================================
     * 2. Backfill из items по item_id
     *    (текущая модель: 1 items row ≈ 1 marketplace_items row)
     * ============================================================
     */
    await queryRunner.query(`
      UPDATE marketplace_items mi
      SET
        color = i.color,
        category = i.category,
        image_url = i.image_url,
        title = i.title,
        updated_at = now()
      FROM items i
      WHERE mi.item_id = i.id
    `);

    /**
     * ============================================================
     * 3. category / title на items NOT NULL —
     *    после backfill требуем NOT NULL и на marketplace_items
     * ============================================================
     */
    await queryRunner.query(`
      DO $$
      DECLARE
        missing_category integer;
        missing_title integer;
      BEGIN
        SELECT COUNT(*)
        INTO missing_category
        FROM marketplace_items
        WHERE category IS NULL;

        IF missing_category > 0 THEN
          RAISE EXCEPTION
            'Migration aborted: % marketplace_items rows have NULL category after backfill',
            missing_category;
        END IF;

        SELECT COUNT(*)
        INTO missing_title
        FROM marketplace_items
        WHERE title IS NULL;

        IF missing_title > 0 THEN
          RAISE EXCEPTION
            'Migration aborted: % marketplace_items rows have NULL title after backfill',
            missing_title;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE marketplace_items
        ALTER COLUMN category SET NOT NULL,
        ALTER COLUMN title SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('marketplace_items', [
      'color',
      'category',
      'image_url',
      'title'
    ]);
  }
}
