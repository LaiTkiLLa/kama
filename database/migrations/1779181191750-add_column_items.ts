import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnItems1779181191750 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'calculation_type',
        isNullable: true,
        type: 'varchar'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'calculation_type');
  }
}
