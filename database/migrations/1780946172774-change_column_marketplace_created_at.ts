import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeColumnMarketplaceCreatedAt1780946172774 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders_v2
      ALTER COLUMN marketplace_created_at
      TYPE timestamptz
      USING (
        CASE
          WHEN marketplace_id = 2
            THEN (marketplace_created_at - INTERVAL '3 hours')
          ELSE marketplace_created_at
        END
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders_v2
      ALTER COLUMN marketplace_created_at
      TYPE timestamp
      USING (
        CASE
          WHEN marketplace_id = 2
            THEN (marketplace_created_at + INTERVAL '3 hours')
          ELSE marketplace_created_at
        END
      )
    `);
  }
}
