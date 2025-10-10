import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnsItems1759999494804 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'volume_wb',
        isNullable: true,
        type: 'varchar'
      }),
      new TableColumn({
        name: 'volume_ozon',
        isNullable: true,
        type: 'varchar'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'volume_wb');
    await queryRunner.dropColumn('items', 'volume_ozon');
  }
}
