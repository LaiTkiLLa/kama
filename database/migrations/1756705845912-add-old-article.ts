import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOldArticle1756705845912 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'article_old',
        type: 'varchar',
        isNullable: true
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('items', 'article_old');
  }
}
