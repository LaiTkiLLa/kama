import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnToItems1755712348194 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'own_category',
        isNullable: true,
        type: 'varchar'
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'own_category');
  }
}
