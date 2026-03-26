import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnOzonMarketingPriceToItems1774508617018 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'price_with_discount_ozon',
        isNullable: true,
        type: 'float'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'price_with_discount_ozon');
  }

}
