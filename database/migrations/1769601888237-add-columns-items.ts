import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnsItems1769601888237 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'days_delivery_to_Russia',
        isNullable: false,
        default: 10,
        type: 'int'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'days_delivery_to_Russia');
  }
}
