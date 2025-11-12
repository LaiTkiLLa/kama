import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNewColumnsItems1762959592032 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'volume_yandex',
        isNullable: true,
        type: 'varchar'
      }),
      new TableColumn({
        name: 'dimensions_yandex',
        isNullable: true,
        type: 'varchar'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'volume_yandex');
    await queryRunner.dropColumn('items', 'dimensions_yandex');
  }
}
