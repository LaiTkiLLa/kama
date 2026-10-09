import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * WB size-grain listings: schema only.
 * - size_name / size_value на marketplace_items
 * - index на chrt_id
 * Данные (размножение size-listings) — из getWbItems при первом sync.
 * stocks_v2 / marketplace_item_sizes не дропаем (отдельный cutover).
 */
export class WbSizeListingsCardIdentifier1789520000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('marketplace_items', [
      new TableColumn({
        name: 'size_name',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'size_value',
        type: 'varchar',
        isNullable: true
      })
    ]);

    await queryRunner.createIndex(
      'marketplace_items',
      new TableIndex({
        name: 'IDX_marketplace_items_chrt_id',
        columnNames: ['chrt_id']
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('marketplace_items', 'IDX_marketplace_items_chrt_id');
    await queryRunner.dropColumn('marketplace_items', 'size_value');
    await queryRunner.dropColumn('marketplace_items', 'size_name');
  }
}
