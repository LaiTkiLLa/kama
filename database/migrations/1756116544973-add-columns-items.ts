import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnsItems1756116544973 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'classification',
        isNullable: true,
        type: 'varchar'
      }),
      new TableColumn({
        name: 'multiplicity',
        isNullable: true,
        type: 'varchar'
      }),
      new TableColumn({
        name: 'box_number',
        isNullable: true,
        type: 'varchar'
      }),
      new TableColumn({
        name: 'dimensions_fact',
        isNullable: true,
        type: 'varchar'
      }),
      new TableColumn({
        name: 'volume',
        isNullable: true,
        type: 'varchar'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'classification');
    await queryRunner.dropColumn('items', 'multiplicity');
    await queryRunner.dropColumn('items', 'box_number');
    await queryRunner.dropColumn('items', 'dimensions_fact');
    await queryRunner.dropColumn('items', 'volume');
  }
}
