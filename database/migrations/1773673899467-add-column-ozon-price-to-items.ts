import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnOzonPriceToItems1773673899467 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'price_ozon',
        isNullable: true,
        type: 'float'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'price_ozon');
  }

}
