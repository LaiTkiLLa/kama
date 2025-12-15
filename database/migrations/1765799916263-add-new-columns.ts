import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNewColumns1765799916263 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'created_for_calculation',
        isNullable: false,
        type: 'boolean',
        default: false
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'created_for_calculation');
  }
}
