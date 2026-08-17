import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Drop с items полей, которые уже живут на items_suppliers (Phase 3)
 * или больше не используются (directory/ERP/GAS переключены).
 *
 * Phase 3 (canonical: items_suppliers): payment, dimensions_fact, dimensions_master_box, volume.
 * Устаревшие габариты: volume_master_box, volume_per_unit, weight_per_unit, density.
 * Планирование (сняты с entity/API): replenishment_period, remaining_balance.
 *
 * Dual-write на items снимается в коде вместе с этой миграцией.
 */
export class DropLegacyFieldsFromItems1789370000000 implements MigrationInterface {
  private readonly droppedColumns = [
    'payment',
    'dimensions_fact',
    'dimensions_master_box',
    'volume',
    'volume_master_box',
    'volume_per_unit',
    'weight_per_unit',
    'density',
    'replenishment_period',
    'remaining_balance'
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const itemsTable = await queryRunner.getTable('items');
    if (!itemsTable) {
      throw new Error('Table items not found');
    }

    for (const columnName of this.droppedColumns) {
      if (itemsTable.findColumnByName(columnName)) {
        await queryRunner.dropColumn('items', columnName);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'payment',
        type: 'int',
        isNullable: false,
        default: 10
      }),
      new TableColumn({
        name: 'dimensions_fact',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'dimensions_master_box',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'volume',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'volume_master_box',
        type: 'varchar',
        isNullable: true
      }),
      new TableColumn({
        name: 'volume_per_unit',
        type: 'float',
        isNullable: true
      }),
      new TableColumn({
        name: 'weight_per_unit',
        type: 'float',
        isNullable: true
      }),
      new TableColumn({
        name: 'density',
        type: 'float',
        isNullable: true
      }),
      new TableColumn({
        name: 'replenishment_period',
        type: 'int',
        isNullable: false,
        default: 60
      }),
      new TableColumn({
        name: 'remaining_balance',
        type: 'int',
        isNullable: false,
        default: 60
      })
    ]);

    await queryRunner.query(`
      UPDATE items i
      SET
        payment = COALESCE(isup.payment, 10),
        dimensions_fact = isup.dimensions_fact,
        dimensions_master_box = isup.dimensions_master_box,
        volume = isup.volume
      FROM items_suppliers isup
      WHERE isup.item_id = i.id
    `);
  }
}
