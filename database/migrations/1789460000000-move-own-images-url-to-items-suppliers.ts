import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * own_images_url: items → items_suppliers.
 * Backfill копирует значение на все строки связи по item_id (в т.ч. soft-deleted).
 */
export class MoveOwnImagesUrlToItemsSuppliers1789460000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const itemsSuppliersTable = await queryRunner.getTable('items_suppliers');
    if (!itemsSuppliersTable) {
      throw new Error('Table items_suppliers not found');
    }

    if (!itemsSuppliersTable.findColumnByName('own_images_url')) {
      await queryRunner.addColumn(
        'items_suppliers',
        new TableColumn({
          name: 'own_images_url',
          type: 'text',
          isNullable: true
        })
      );
    }

    const itemsTable = await queryRunner.getTable('items');
    if (!itemsTable?.findColumnByName('own_images_url')) {
      return;
    }

    await queryRunner.query(`
      UPDATE items_suppliers isup
      SET own_images_url = i.own_images_url
      FROM items i
      WHERE isup.item_id = i.id
    `);

    await queryRunner.dropColumn('items', 'own_images_url');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const itemsTable = await queryRunner.getTable('items');
    if (!itemsTable) {
      throw new Error('Table items not found');
    }

    if (!itemsTable.findColumnByName('own_images_url')) {
      await queryRunner.addColumn(
        'items',
        new TableColumn({
          name: 'own_images_url',
          type: 'text',
          isNullable: true
        })
      );
    }

    const itemsSuppliersTable = await queryRunner.getTable('items_suppliers');
    if (itemsSuppliersTable?.findColumnByName('own_images_url')) {
      await queryRunner.query(`
        UPDATE items i
        SET own_images_url = src.own_images_url
        FROM (
          SELECT DISTINCT ON (isup.item_id)
            isup.item_id,
            isup.own_images_url
          FROM items_suppliers isup
          ORDER BY isup.item_id, isup.id ASC
        ) src
        WHERE i.id = src.item_id
      `);

      await queryRunner.dropColumn('items_suppliers', 'own_images_url');
    }
  }
}
