import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnsOrders1742124362579 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('orders', [
      new TableColumn({
        name: 'total_price',
        default: 0,
        isNullable: false,
        type: 'float'
      }),
      new TableColumn({
        name: 'spp',
        default: 0,
        isNullable: false,
        type: 'float'
      }),
      new TableColumn({
        name: 'price_with_disc',
        default: 0,
        isNullable: false,
        type: 'float'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('orders', ['total_price', 'spp', 'price_with_disc']);
  }
}
