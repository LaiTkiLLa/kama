import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

/**
 * Outbox создания карточек на МП (без Redis, без jobs):
 * product_creation_requests — одна заявка на кабинет.
 * status: in_progress | created | failed
 *
 * Unique-индексы отложены: на prod есть дубли active marketplace_items
 * по (item_id, marketplace_id). После дедупа — отдельная миграция, см.
 * docs/roadmap/items-marketplace-items-migration.md (Known Gaps).
 */
export class CreateProductCreationOutbox1789400000000 implements MigrationInterface {
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
    }
  ];

  private readonly identityPrimaryKey = {
    name: 'id',
    isPrimary: true,
    generatedIdentity: 'ALWAYS' as const,
    generationStrategy: 'identity' as const,
    isUnique: true,
    isGenerated: true,
    type: 'int'
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    // const duplicateListings: { count: string }[] = await queryRunner.query(`
    //   SELECT COUNT(*)::text AS count
    //   FROM (
    //     SELECT item_id, marketplace_id
    //     FROM marketplace_items
    //     WHERE deleted_at IS NULL
    //     GROUP BY item_id, marketplace_id
    //     HAVING COUNT(*) > 1
    //   ) d
    // `);
    // if (Number(duplicateListings[0]?.count) > 0) {
    //   throw new Error(
    //     `Migration aborted: ${duplicateListings[0].count} duplicate marketplace_items (item_id, marketplace_id) pairs`
    //   );
    // }

    // await queryRunner.query(`
    //   CREATE UNIQUE INDEX IF NOT EXISTS "UQ_marketplace_items_item_id_marketplace_id_active"
    //   ON marketplace_items (item_id, marketplace_id)
    //   WHERE deleted_at IS NULL
    // `);

    await queryRunner.createTable(
      new Table({
        name: 'product_creation_requests',
        columns: [
          this.identityPrimaryKey,
          { name: 'item_id', type: 'int', isNullable: false },
          { name: 'marketplace_id', type: 'int', isNullable: false },
          { name: 'status', type: 'varchar', isNullable: false },
          { name: 'payload', type: 'jsonb', isNullable: false },
          { name: 'last_error', type: 'text', isNullable: true },
          { name: 'marketplace_item_id', type: 'int', isNullable: true },
          ...this.timestampColumns
        ]
      }),
      true
    );

    await queryRunner.createForeignKey(
      'product_creation_requests',
      new TableForeignKey({
        columnNames: ['item_id'],
        referencedTableName: 'items',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT'
      })
    );

    await queryRunner.createForeignKey(
      'product_creation_requests',
      new TableForeignKey({
        columnNames: ['marketplace_id'],
        referencedTableName: 'marketplaces',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT'
      })
    );

    await queryRunner.createForeignKey(
      'product_creation_requests',
      new TableForeignKey({
        columnNames: ['marketplace_item_id'],
        referencedTableName: 'marketplace_items',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL'
      })
    );

    // await queryRunner.createIndex(
    //   'product_creation_requests',
    //   new TableIndex({
    //     name: 'IDX_product_creation_requests_status_id',
    //     columnNames: ['status', 'id']
    //   })
    // );

    // await queryRunner.createIndex(
    //   'product_creation_requests',
    //   new TableIndex({
    //     name: 'UQ_product_creation_requests_item_id_marketplace_id',
    //     columnNames: ['item_id', 'marketplace_id'],
    //     isUnique: true
    //   })
    // );

    // await queryRunner.createIndex(
    //   'product_creation_requests',
    //   new TableIndex({
    //     name: 'UQ_product_creation_requests_marketplace_item_id',
    //     columnNames: ['marketplace_item_id'],
    //     isUnique: true
    //   })
    // );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('product_creation_requests', true, true, true);
    // await queryRunner.query(`DROP INDEX IF EXISTS "UQ_marketplace_items_item_id_marketplace_id_active"`);
  }
}
