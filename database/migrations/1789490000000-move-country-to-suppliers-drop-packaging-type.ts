import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * country: items → suppliers (backfill «Китай»).
 * packaging_type: drop с items (не используется).
 */
export class MoveCountryToSuppliersDropPackagingType1789490000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const suppliersTable = await queryRunner.getTable('suppliers');
    if (!suppliersTable) {
      throw new Error('Table suppliers not found');
    }

    if (!suppliersTable.findColumnByName('country')) {
      await queryRunner.addColumn(
        'suppliers',
        new TableColumn({
          name: 'country',
          type: 'varchar',
          isNullable: true
        })
      );
    }

    await queryRunner.query(`UPDATE "suppliers" SET "country" = 'Китай'`);

    const itemsTable = await queryRunner.getTable('items');
    if (!itemsTable) {
      throw new Error('Table items not found');
    }

    for (const columnName of ['country', 'packaging_type']) {
      if (itemsTable.findColumnByName(columnName)) {
        await queryRunner.dropColumn('items', columnName);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const itemsTable = await queryRunner.getTable('items');
    if (!itemsTable) {
      throw new Error('Table items not found');
    }

    if (!itemsTable.findColumnByName('country')) {
      await queryRunner.addColumn(
        'items',
        new TableColumn({
          name: 'country',
          type: 'varchar',
          isNullable: true
        })
      );
    }

    if (!itemsTable.findColumnByName('packaging_type')) {
      await queryRunner.addColumn(
        'items',
        new TableColumn({
          name: 'packaging_type',
          type: 'varchar',
          isNullable: true
        })
      );
    }

    const suppliersTable = await queryRunner.getTable('suppliers');
    if (suppliersTable?.findColumnByName('country')) {
      await queryRunner.dropColumn('suppliers', 'country');
    }
  }
}
