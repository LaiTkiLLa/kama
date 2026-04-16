import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddItems1776336545448 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'cost_calculation_type',
        isNullable: true,
        type: 'varchar'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'cost_calculation_type');
  }
}
