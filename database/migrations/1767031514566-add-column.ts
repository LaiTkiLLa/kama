import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumn1767031514566 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'cost_in_yuan_white',
        isNullable: true,
        type: 'float'
      }),
      new TableColumn({
        name: 'cost_tnved',
        isNullable: true,
        type: 'varchar'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'cost_in_yuan_white');
    await queryRunner.dropColumn('items', 'cost_tnved');
  }
}
