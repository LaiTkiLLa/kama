import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnItems1771930919580 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'supplier_minimum_order',
        isNullable: true,
        type: 'int'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'supplier_minimum_order');
  }
}
