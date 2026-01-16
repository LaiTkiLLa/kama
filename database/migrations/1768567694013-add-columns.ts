import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumns1768567694013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'dimensions_master_box',
        isNullable: true,
        type: 'varchar'
      }),
      new TableColumn({
        name: 'volume_master_box',
        isNullable: true,
        type: 'varchar'
      })
    ]);
    await queryRunner.renameColumn('items', 'volume_per_container', 'density');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'volume_master_box');
    await queryRunner.dropColumn('items', 'dimensions_master_box');
    await queryRunner.renameColumn('items', 'density', 'volume_per_container');
  }
}
