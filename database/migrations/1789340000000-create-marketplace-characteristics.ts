import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Marketplace-слой характеристик (schema-only):
 * marketplace_characteristics — описание характеристики в терминах МП
 * marketplace_item_characteristics — фактические значения на listing
 * marketplace_item_sizes — размеры listing (отдельно от характеристик)
 * marketplace_characteristic_mappings — связь characteristics.id ↔ marketplace_characteristics.id
 *
 * Не трогает characteristics / characteristic_values / item_characteristics.
 * Legacy items_sizes снимается отдельно (`1789350000000`).
 */
export class CreateMarketplaceCharacteristics1789340000000 implements MigrationInterface {
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
        name: 'marketplace_characteristics',
        columns: [
          this.identityPrimaryKey,
          { name: 'marketplace_id', type: 'int', isNullable: false },
          { name: 'marketplace_characteristic_id', type: 'varchar', isNullable: false },
          { name: 'name', type: 'varchar', isNullable: true },
          ...this.timestampColumns
        ]
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'marketplace_item_characteristics',
        columns: [
          this.identityPrimaryKey,
          { name: 'marketplace_item_id', type: 'int', isNullable: false },
          { name: 'marketplace_characteristic_id', type: 'int', isNullable: false },
          { name: 'value', type: 'varchar', isNullable: false },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          ...this.timestampColumns
        ]
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'marketplace_item_sizes',
        columns: [
          this.identityPrimaryKey,
          { name: 'marketplace_item_id', type: 'int', isNullable: false },
          { name: 'marketplace_size_id', type: 'varchar', isNullable: false },
          { name: 'name', type: 'varchar', isNullable: true },
          { name: 'value', type: 'varchar', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          ...this.timestampColumns
        ]
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'marketplace_characteristic_mappings',
        columns: [
          this.identityPrimaryKey,
          { name: 'marketplace_id', type: 'int', isNullable: false },
          { name: 'characteristic_id', type: 'int', isNullable: false },
          { name: 'marketplace_characteristic_id', type: 'int', isNullable: false },
          ...this.timestampColumns
        ]
      }),
      true
    );

    await queryRunner.createForeignKeys('marketplace_characteristics', [
      new TableForeignKey({
        name: 'FK_marketplace_characteristics_marketplace',
        columnNames: ['marketplace_id'],
        referencedTableName: 'marketplaces',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })
    ]);

    await queryRunner.createForeignKeys('marketplace_item_characteristics', [
      new TableForeignKey({
        name: 'FK_marketplace_item_characteristics_mp_item',
        columnNames: ['marketplace_item_id'],
        referencedTableName: 'marketplace_items',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }),
      new TableForeignKey({
        name: 'FK_marketplace_item_characteristics_mp_char',
        columnNames: ['marketplace_characteristic_id'],
        referencedTableName: 'marketplace_characteristics',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })
    ]);

    await queryRunner.createForeignKeys('marketplace_item_sizes', [
      new TableForeignKey({
        name: 'FK_marketplace_item_sizes_marketplace_item',
        columnNames: ['marketplace_item_id'],
        referencedTableName: 'marketplace_items',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })
    ]);

    await queryRunner.createForeignKeys('marketplace_characteristic_mappings', [
      new TableForeignKey({
        name: 'FK_marketplace_characteristic_mappings_marketplace',
        columnNames: ['marketplace_id'],
        referencedTableName: 'marketplaces',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }),
      new TableForeignKey({
        name: 'FK_marketplace_characteristic_mappings_characteristic',
        columnNames: ['characteristic_id'],
        referencedTableName: 'characteristics',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }),
      new TableForeignKey({
        name: 'FK_marketplace_characteristic_mappings_mp_char',
        columnNames: ['marketplace_characteristic_id'],
        referencedTableName: 'marketplace_characteristics',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })
    ]);

    await queryRunner.createIndex(
      'marketplace_item_characteristics',
      new TableIndex({
        name: 'IDX_marketplace_item_characteristics_mp_item_id',
        columnNames: ['marketplace_item_id']
      })
    );

    await queryRunner.createIndex(
      'marketplace_item_characteristics',
      new TableIndex({
        name: 'IDX_marketplace_item_characteristics_mp_char_id',
        columnNames: ['marketplace_characteristic_id']
      })
    );

    await queryRunner.createIndex(
      'marketplace_item_sizes',
      new TableIndex({
        name: 'IDX_marketplace_item_sizes_marketplace_item_id',
        columnNames: ['marketplace_item_id']
      })
    );

    await queryRunner.createIndex(
      'marketplace_characteristic_mappings',
      new TableIndex({
        name: 'IDX_marketplace_characteristic_mappings_marketplace_id',
        columnNames: ['marketplace_id']
      })
    );

    await queryRunner.createIndex(
      'marketplace_characteristic_mappings',
      new TableIndex({
        name: 'IDX_marketplace_characteristic_mappings_characteristic_id',
        columnNames: ['characteristic_id']
      })
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_marketplace_characteristics_mp_ext_id_active"
      ON marketplace_characteristics (marketplace_id, marketplace_characteristic_id)
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_marketplace_item_characteristics_value_active"
      ON marketplace_item_characteristics (marketplace_item_id, marketplace_characteristic_id, value)
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_marketplace_item_sizes_size_id_active"
      ON marketplace_item_sizes (marketplace_item_id, marketplace_size_id)
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_marketplace_characteristic_mappings_mp_char_active"
      ON marketplace_characteristic_mappings (marketplace_characteristic_id)
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_marketplace_characteristic_mappings_mp_id_char_active"
      ON marketplace_characteristic_mappings (marketplace_id, characteristic_id)
      WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_marketplace_characteristic_mappings_mp_id_char_active"`
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_marketplace_characteristic_mappings_mp_char_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_marketplace_item_sizes_size_id_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_marketplace_item_characteristics_value_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_marketplace_characteristics_mp_ext_id_active"`);
    await queryRunner.dropTable('marketplace_characteristic_mappings', true, true, true);
    await queryRunner.dropTable('marketplace_item_sizes', true, true, true);
    await queryRunner.dropTable('marketplace_item_characteristics', true, true, true);
    await queryRunner.dropTable('marketplace_characteristics', true, true, true);
  }
}
