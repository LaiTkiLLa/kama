import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNewColumnItems1761765098242 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'own_images_url',
        isNullable: true,
        type: 'text'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'own_images_url');
  }

}
