import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnItems1780398942575 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'download_calculation_method',
        isNullable: true,
        type: 'varchar'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'download_calculation_method');
  }
}
