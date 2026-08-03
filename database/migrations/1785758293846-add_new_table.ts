import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddNewTable1785758293846 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'marketplace_items',
        columns: [
          {
            name: 'id',
            isPrimary: true,
            generatedIdentity: 'ALWAYS',
            generationStrategy: 'identity',
            isUnique: true,
            isGenerated: true,
            type: 'int'
          },
          {
            name: 'item_id',
            type: 'integer',
            isNullable: false
          },
          {
            name: 'marketplace_identifier',
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
            name: 'dimensions',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'volume',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'chrt_id',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'marketplace_id',
            type: 'integer',
            isNullable: false
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()'
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()'
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true
          }
        ]
      }),
      true
    );

    await queryRunner.createForeignKey(
      'marketplace_items',
      new TableForeignKey({
        columnNames: ['marketplace_id'],
        referencedTableName: 'marketplaces',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })
    );

    await queryRunner.createIndex(
      'marketplace_items',
      new TableIndex({
        name: 'IDX_marketplace_items_item_id',
        columnNames: ['item_id']
      })
    );

    await queryRunner.createIndex(
      'marketplace_items',
      new TableIndex({
        name: 'IDX_marketplace_items_marketplace_id',
        columnNames: ['marketplace_id']
      })
    );

    await queryRunner.query(`
    INSERT INTO marketplace_items (
      item_id,
      marketplace_identifier,
      barcode,
      sku,
      dimensions,
      volume,
      chrt_id,
      marketplace_id,
      created_at,
      updated_at,
      deleted_at
    )
    SELECT
      i.id,
      i.marketplace_identifier,
      i.barcode,
      i.sku,

      CASE
        WHEN i.marketplace_id = (
          SELECT id
          FROM marketplaces
          WHERE title = 'WB'
          LIMIT 1
        )
          THEN i.dimensions_wb

        WHEN i.marketplace_id = (
          SELECT id
          FROM marketplaces
          WHERE title = 'Ozon'
          LIMIT 1
        )
          THEN i.dimensions_ozon

        WHEN i.marketplace_id = (
          SELECT id
          FROM marketplaces
          WHERE title = 'Yandex'
          LIMIT 1
        )
          THEN i.dimensions_yandex

        ELSE NULL
      END,

      CASE
        WHEN i.marketplace_id = (
          SELECT id
          FROM marketplaces
          WHERE title = 'WB'
          LIMIT 1
        )
          THEN i.volume_wb

        WHEN i.marketplace_id = (
          SELECT id
          FROM marketplaces
          WHERE title = 'Ozon'
          LIMIT 1
        )
          THEN i.volume_ozon

        WHEN i.marketplace_id = (
          SELECT id
          FROM marketplaces
          WHERE title = 'Yandex'
          LIMIT 1
        )
          THEN i.volume_yandex

        ELSE NULL
      END,
      i.chrt_id,
      i.marketplace_id,
      i.created_at,
      i.updated_at,

      CASE
        WHEN i.is_archive = true
          THEN i.updated_at

        ELSE NULL
      END

    FROM items i
  `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('marketplace_items', true);
  }
}
