import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * warehouses: soft-delete (deleted_at).
 */
export class AddDeletedAtToWarehouses1789410000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('warehouses');
    if (!table) {
      throw new Error('Table warehouses not found');
    }

    if (!table.findColumnByName('deleted_at')) {
      await queryRunner.addColumn(
        'warehouses',
        new TableColumn({
          name: 'deleted_at',
          type: 'timestamptz',
          isNullable: true
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('warehouses');
    if (table?.findColumnByName('deleted_at')) {
      await queryRunner.dropColumn('warehouses', 'deleted_at');
    }
  }
}
