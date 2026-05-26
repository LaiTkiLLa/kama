import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddColumnWarehouses1779785593792 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameColumn('warehouses', 'marketplace_id', 'marketplace_internal_number');
    await queryRunner.addColumns('warehouses', [
      new TableColumn({
        name: 'marketplace_id',
        isNullable: true,
        type: 'int'
      })
    ]);
    new TableForeignKey({
      columnNames: ['marketplace_id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      referencedColumnNames: ['id'],
      referencedTableName: 'marketplaces'
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameColumn('warehouses', 'marketplace_internal_number', 'marketplace_id');
    await queryRunner.dropColumn('warehouses', 'marketplace_id');
  }
}
