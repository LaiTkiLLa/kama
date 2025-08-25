import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnsItems1756145376933 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'dimensions_wb',
        isNullable: true,
        type: 'varchar'
      }),
      new TableColumn({
        name: 'dimensions_ozon',
        isNullable: true,
        type: 'varchar'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'dimensions_wb');
    await queryRunner.dropColumn('items', 'dimensions_ozon');
  }
}
