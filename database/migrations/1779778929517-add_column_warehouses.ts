import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnWarehouses1779778929517 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('warehouses', [
      new TableColumn({
        name: 'type',
        isNullable: false,
        type: 'varchar',
        default: "'FBO'"
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('warehouses', 'type');
  }
}
