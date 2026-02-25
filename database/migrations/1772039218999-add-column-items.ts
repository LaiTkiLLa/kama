import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnItems1772039218999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'seasonality_for_export',
        isNullable: true,
        type: 'float'
      }),
      new TableColumn({
        name: 'seasonality_for_order',
        isNullable: true,
        type: 'float'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'seasonality_for_export');
    await queryRunner.dropColumn('items', 'seasonality_for_order');
  }
}
