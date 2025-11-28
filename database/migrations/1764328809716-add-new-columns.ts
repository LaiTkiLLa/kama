import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNewColumns1764328809716 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'tariff_weight',
        isNullable: true,
        type: 'float'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'tariff_weight');
  }
}
