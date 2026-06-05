import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnOrdersV21780663776255 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('orders_v2', [
      new TableColumn({
        type: 'timestampz',
        name: 'marketplace_created_at',
        isNullable: false
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('orders_v2', 'marketplace_created_at');
  }
}
