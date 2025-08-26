import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnsItems1756183779410 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'wb_created_at',
        type: 'timestamptz',
        isNullable: true
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'wb_created_at');
  }
}
