import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * contaminants: add contract column (varchar, nullable).
 */
export class AddContractToContaminants1789380000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('contaminants');
    if (!table) {
      throw new Error('Table contaminants not found');
    }

    if (!table.findColumnByName('contract')) {
      await queryRunner.addColumn(
        'contaminants',
        new TableColumn({
          name: 'contract',
          type: 'varchar',
          isNullable: true
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('contaminants');
    if (table?.findColumnByName('contract')) {
      await queryRunner.dropColumn('contaminants', 'contract');
    }
  }
}
