import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnsItems1770226048110 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'planned_turnover',
        isNullable: false,
        default: 90,
        type: 'int'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'planned_turnover');
  }
}
