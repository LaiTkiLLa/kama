import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * appeared_at на marketplace_items — первое появление listing в остатках (qty > 0) на этом МП.
 * Backfill для текущих: копируем items.wb_created_at на все mp-items товара.
 */
export class AddAppearedAtToMarketplaceItems1789500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('marketplace_items');
    if (!table) {
      throw new Error('Table marketplace_items not found');
    }

    if (!table.findColumnByName('appeared_at')) {
      await queryRunner.addColumn(
        'marketplace_items',
        new TableColumn({
          name: 'appeared_at',
          type: 'timestamptz',
          isNullable: true
        })
      );
    }

    await queryRunner.query(`
      UPDATE marketplace_items mi
      SET appeared_at = i.wb_created_at
      FROM items i
      WHERE mi.item_id = i.id
        AND i.wb_created_at IS NOT NULL
        AND mi.appeared_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('marketplace_items');
    if (!table) {
      throw new Error('Table marketplace_items not found');
    }

    if (table.findColumnByName('appeared_at')) {
      await queryRunner.dropColumn('marketplace_items', 'appeared_at');
    }
  }
}
