import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ослабляем NOT NULL на marketplace_items.category / title.
 *
 * 1786013498713 ставил NOT NULL после backfill.
 * На transition-этапе create/update ещё не всегда заполняют эти поля —
 * nullable безопаснее до полного dual-write (в т.ч. update).
 *
 * Entity уже: nullable: true.
 */
export class AllowNullCategoryTitleOnMarketplaceItems1786107580847 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE marketplace_items
        ALTER COLUMN category DROP NOT NULL,
        ALTER COLUMN title DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /**
     * Down восстанавливает NOT NULL только если нет NULL-строк.
     * Иначе миграция abort — иначе потеряли бы данные / упали бы на constraint.
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
            'Down aborted: % marketplace_items rows have NULL category — backfill before restoring NOT NULL',
            missing_category;
        END IF;

        SELECT COUNT(*)
        INTO missing_title
        FROM marketplace_items
        WHERE title IS NULL;

        IF missing_title > 0 THEN
          RAISE EXCEPTION
            'Down aborted: % marketplace_items rows have NULL title — backfill before restoring NOT NULL',
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
}
