import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * suppliers: add contract column (varchar, nullable).
 */
export class AddContractToSuppliers1789212000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('suppliers');
    if (!table) {
      throw new Error('Table suppliers not found');
    }

    if (!table.findColumnByName('contract')) {
      await queryRunner.addColumn(
        'suppliers',
        new TableColumn({
          name: 'contract',
          type: 'varchar',
          isNullable: true
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('suppliers');
    if (table?.findColumnByName('contract')) {
      await queryRunner.dropColumn('suppliers', 'contract');
    }
  }
}
