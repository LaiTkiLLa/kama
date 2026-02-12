import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnsItems1770823779816 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'price_wb',
        isNullable: true,
        type: 'float'
      }),
      new TableColumn({
        name: 'discount_wb',
        isNullable: true,
        type: 'float'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'price_wb');
    await queryRunner.dropColumn('items', 'discount_wb');
  }
}
