import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNewColumns1764076546736 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'volume_per_unit',
        isNullable: true,
        type: 'float'
      }),
      new TableColumn({
        name: 'weight_per_unit',
        isNullable: true,
        type: 'float'
      }),
      new TableColumn({
        name: 'transport_rate_usd',
        isNullable: true,
        type: 'float'
      }),
      new TableColumn({
        name: 'duty_percentage',
        isNullable: true,
        type: 'float'
      }),
      new TableColumn({
        name: 'volume_per_container',
        isNullable: true,
        type: 'float'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'volume_per_unit');
    await queryRunner.dropColumn('items', 'weight_per_unit');
    await queryRunner.dropColumn('items', 'transport_rate_usd');
    await queryRunner.dropColumn('items', 'duty_percentage');
    await queryRunner.dropColumn('items', 'volume_per_container');
  }
}
