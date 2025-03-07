import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateEntityMarketplace1741277280270 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'marketplaces',
        columns: [
          {
            name: 'id',
            isNullable: false,
            type: 'int',
            generationStrategy: 'identity',
            generatedIdentity: 'ALWAYS',
            isPrimary: true,
            isGenerated: true,
            isUnique: true
          },
          {
            name: 'title',
            isNullable: false,
            type: 'varchar'
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false
          }
        ]
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('marketplaces');
  }
}
