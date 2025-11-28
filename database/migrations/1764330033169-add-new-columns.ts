import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNewColumns1764330033169 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'tariff_weight');
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'tariff_weight',
        isNullable: true,
        type: 'varchar'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'tariff_weight');
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'tariff_weight',
        isNullable: true,
        type: 'float'
      })
    ]);
  }
}
