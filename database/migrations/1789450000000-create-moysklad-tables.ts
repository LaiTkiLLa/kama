import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';

/**
 * Мой склад (FBS WB v1):
 * - moysklad_warehouse_mappings — store UUID ↔ warehouses.id
 * - moysklad_item_links — items ↔ assortment МС
 * - moysklad_outbox — create/cancel customerorder (гарантия доставки)
 *
 * Seed маппинга складов не в миграции (warehouse PK окруженческий).
 * См. docs/roadmap/moysklad-fbs.md
 */
export class CreateMoyskladTables1789450000000 implements MigrationInterface {
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
    await queryRunner.createTable(
      new Table({
        name: 'moysklad_warehouse_mappings',
        columns: [
          this.identityPrimaryKey,
          { name: 'moysklad_store_id', type: 'uuid', isNullable: false },
          { name: 'warehouse_id', type: 'int', isNullable: false },
          { name: 'moysklad_agent_id', type: 'uuid', isNullable: true },
          ...this.timestampColumns
        ]
      }),
      true
    );

    await queryRunner.createUniqueConstraint(
      'moysklad_warehouse_mappings',
      new TableUnique({
        name: 'UQ_moysklad_warehouse_mappings_store_id',
        columnNames: ['moysklad_store_id']
      })
    );

    await queryRunner.createUniqueConstraint(
      'moysklad_warehouse_mappings',
      new TableUnique({
        name: 'UQ_moysklad_warehouse_mappings_warehouse_id',
        columnNames: ['warehouse_id']
      })
    );

    await queryRunner.createForeignKey(
      'moysklad_warehouse_mappings',
      new TableForeignKey({
        name: 'FK_moysklad_warehouse_mappings_warehouse',
        columnNames: ['warehouse_id'],
        referencedTableName: 'warehouses',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT'
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'moysklad_item_links',
        columns: [
          this.identityPrimaryKey,
          { name: 'item_id', type: 'int', isNullable: false },
          { name: 'assortment_id', type: 'uuid', isNullable: false },
          { name: 'assortment_href', type: 'varchar', isNullable: false },
          ...this.timestampColumns
        ]
      }),
      true
    );

    await queryRunner.createUniqueConstraint(
      'moysklad_item_links',
      new TableUnique({
        name: 'UQ_moysklad_item_links_item_id',
        columnNames: ['item_id']
      })
    );

    await queryRunner.createForeignKey(
      'moysklad_item_links',
      new TableForeignKey({
        name: 'FK_moysklad_item_links_item',
        columnNames: ['item_id'],
        referencedTableName: 'items',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT'
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'moysklad_outbox',
        columns: [
          this.identityPrimaryKey,
          { name: 'type', type: 'varchar', isNullable: false },
          { name: 'orders_v2_id', type: 'int', isNullable: false },
          { name: 'status', type: 'varchar', isNullable: false },
          { name: 'last_error', type: 'text', isNullable: true },
          { name: 'moysklad_entity_id', type: 'uuid', isNullable: true },
          { name: 'payload', type: 'jsonb', isNullable: false, default: "'{}'::jsonb" },
          ...this.timestampColumns
        ]
      }),
      true
    );

    await queryRunner.createUniqueConstraint(
      'moysklad_outbox',
      new TableUnique({
        name: 'UQ_moysklad_outbox_type_orders_v2_id',
        columnNames: ['type', 'orders_v2_id']
      })
    );

    await queryRunner.createIndex(
      'moysklad_outbox',
      new TableIndex({
        name: 'IDX_moysklad_outbox_status_id',
        columnNames: ['status', 'id']
      })
    );

    await queryRunner.createForeignKey(
      'moysklad_outbox',
      new TableForeignKey({
        name: 'FK_moysklad_outbox_orders_v2',
        columnNames: ['orders_v2_id'],
        referencedTableName: 'orders_v2',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT'
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('moysklad_outbox', true, true, true);
    await queryRunner.dropTable('moysklad_item_links', true, true, true);
    await queryRunner.dropTable('moysklad_warehouse_mappings', true, true, true);
  }
}
