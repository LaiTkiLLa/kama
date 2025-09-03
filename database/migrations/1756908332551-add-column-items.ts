import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnItems1756908332551 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'is_archive',
        isNullable: false,
        default: false,
        type: 'boolean'
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'is_archive');
  }
}
