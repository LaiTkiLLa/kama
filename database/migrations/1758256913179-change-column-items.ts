import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeColumnItems1758256913179 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE items ALTER COLUMN image_url DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE items ALTER COLUMN image_url SET NOT NULL`);
  }

}
