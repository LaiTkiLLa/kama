import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnsItems1769577814539 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'production',
        isNullable: false,
        default: 10,
        type: 'int'
      }),
      new TableColumn({
        name: 'buffer',
        isNullable: false,
        default: 10,
        type: 'int'
      })
    ]);
    await queryRunner.dropColumn('items', 'seasonality');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('items', ['production', 'buffer']);
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'seasonality',
        isNullable: true,
        type: 'float'
      })
    ]);
  }
}
