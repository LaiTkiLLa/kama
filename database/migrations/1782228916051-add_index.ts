import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndex1782228916051 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX CONCURRENTLY idx_stocks_created_item ON stocks (created_at, item_id);'
    );
    await queryRunner.query(
      'CREATE INDEX CONCURRENTLY idx_stocks_item_created ON stocks (item_id, created_at);'
    );
    await queryRunner.query(
      'CREATE INDEX CONCURRENTLY idx_orders_item_created ON orders (created_at, item_id);'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_stocks_created_item;`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_stocks_item_created;`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_orders_item_created;`);
  }
}
