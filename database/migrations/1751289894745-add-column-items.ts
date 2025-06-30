import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnItems1751289894745 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'color',
        isNullable: true,
        type: 'varchar'
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'color');
  }
}
