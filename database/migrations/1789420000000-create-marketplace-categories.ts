import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Справочник taxonomy категорий маркетплейсов (platform-level, не per-cabinet).
 *
 * platform: 'wb' | 'ozon' | 'yandex'
 * node_type:
 *   wb_parent, wb_subject — дерево WB (leaf для create: wb_subject → subjectID)
 *   ozon_category, ozon_type — дерево Ozon (leaf для create: ozon_type → type_id + parent.description_category_id)
 *
 * Sync cron — отдельная задача; миграция только schema.
 */
export class CreateMarketplaceCategories1789420000000 implements MigrationInterface {
  private readonly timestampColumns = [
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
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'marketplace_categories',
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
            name: 'platform',
            type: 'varchar',
            isNullable: false,
            comment: 'wb | ozon | yandex — taxonomy общая для всех кабинетов платформы'
          },
          {
            name: 'node_type',
            type: 'varchar',
            isNullable: false,
            comment: 'wb_parent | wb_subject | ozon_category | ozon_type | …'
          },
          {
            name: 'external_id',
            type: 'bigint',
            isNullable: false,
            comment: 'subjectID | description_category_id | type_id — ID в API маркетплейса'
          },
          {
            name: 'title',
            type: 'varchar',
            isNullable: false
          },
          {
            name: 'parent_id',
            type: 'int',
            isNullable: true
          },
          {
            name: 'is_disabled',
            type: 'boolean',
            isNullable: false,
            default: false
          },
          {
            name: 'is_visible',
            type: 'boolean',
            isNullable: true,
            comment: 'WB parent isVisible; для остальных node_type — nullable'
          },
          {
            name: 'is_selectable',
            type: 'boolean',
            isNullable: false,
            default: false,
            comment: 'true для leaf-узлов, доступных при create (wb_subject, ozon_type)'
          },
          ...this.timestampColumns
        ]
      }),
      true
    );

    await queryRunner.createForeignKey(
      'marketplace_categories',
      new TableForeignKey({
        name: 'FK_marketplace_categories_parent',
        columnNames: ['parent_id'],
        referencedTableName: 'marketplace_categories',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      })
    );

    await queryRunner.createIndex(
      'marketplace_categories',
      new TableIndex({
        name: 'IDX_marketplace_categories_platform_parent_id',
        columnNames: ['platform', 'parent_id']
      })
    );

    await queryRunner.createIndex(
      'marketplace_categories',
      new TableIndex({
        name: 'IDX_marketplace_categories_platform_selectable',
        columnNames: ['platform', 'is_selectable']
      })
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_marketplace_categories_platform_node_ext_active"
      ON marketplace_categories (platform, node_type, external_id)
      WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_marketplace_categories_platform_node_ext_active"`);
    await queryRunner.dropTable('marketplace_categories', true, true, true);
  }
}
