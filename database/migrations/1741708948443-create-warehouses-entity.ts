import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateWarehousesEntity1741708948443 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'warehouses',
        columns: [
          {
            name: 'id',
            type: 'int',
            generatedIdentity: 'ALWAYS',
            isPrimary: true,
            isGenerated: true,
            isUnique: true,
            generationStrategy: 'identity'
          },
          {
            name: 'title',
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

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
