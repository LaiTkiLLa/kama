import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnItems1779721894683 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'chrt_id',
        isNullable: true,
        type: 'varchar'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'chrt_id');
  }

}
