import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateEntityItems1741376993326 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'items',
        columns: [
          {
            name: 'id',
            type: 'int',
            generationStrategy: 'identity',
            generatedIdentity: 'ALWAYS',
            isGenerated: true,
            isPrimary: true,
            isUnique: true
          },
          {
            name: 'article',
            type: 'varchar',
            isNullable: false
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: false
          },
          {
            name: 'title',
            type: 'varchar',
            isNullable: false
          },
          {
            name: 'barcode',
            type: 'varchar',
            isNullable: false
          },
          {
            name: 'sku',
            type: 'varchar',
            isNullable: false
          },
          {
            name: 'marketplace_identifier',
            type: 'varchar',
            isNullable: false
          },
          {
            name: 'image_url',
            type: 'varchar',
            isNullable: false
          },
          {
            name: 'production_time',
            type: 'int',
            isNullable: false,
            default: 30
          },
          {
            name: 'assembly_period',
            type: 'int',
            isNullable: false,
            default: 7
          },
          {
            name: 'delivery_time',
            type: 'int',
            isNullable: false,
            default: 35
          },
          {
            name: 'shipping_period',
            type: 'int',
            isNullable: false,
            default: 10
          },
          {
            name: 'marketplace_id',
            type: 'int',
            isNullable: false
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
    new TableForeignKey({
      columnNames: ['marketplace_id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      referencedColumnNames: ['id'],
      referencedTableName: 'marketplaces'
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('items');
  }
}
