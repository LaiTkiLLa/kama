import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

/**
 * warehouses hard-delete:
 * - orders_v2.warehouse_id: CASCADE → RESTRICT
 * - stocks.warehouse_id: add/ensure FK with RESTRICT
 *
 * Soft-delete warehouses остаётся через deleted_at.
 */
export class RestrictWarehouseFksOnOrdersAndStocks1789430000000 implements MigrationInterface {
  private async replaceWarehouseFk(
    queryRunner: QueryRunner,
    tableName: string,
    fkName: string
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (!table) {
      throw new Error(`Table ${tableName} not found`);
    }

    for (const foreignKey of table.foreignKeys) {
      if (
        foreignKey.columnNames.length === 1 &&
        foreignKey.columnNames[0] === 'warehouse_id' &&
        foreignKey.referencedTableName === 'warehouses'
      ) {
        await queryRunner.dropForeignKey(tableName, foreignKey);
      }
    }

    await queryRunner.createForeignKey(
      tableName,
      new TableForeignKey({
        name: fkName,
        columnNames: ['warehouse_id'],
        referencedTableName: 'warehouses',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      })
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.replaceWarehouseFk(
      queryRunner,
      'orders_v2',
      'FK_orders_v2_warehouse'
    );
    await this.replaceWarehouseFk(queryRunner, 'stocks', 'FK_stocks_warehouse');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const restoreCascade = async (tableName: string, fkName: string): Promise<void> => {
      const table = await queryRunner.getTable(tableName);
      if (!table) {
        return;
      }

      const fk =
        table.foreignKeys.find(f => f.name === fkName) ??
        table.foreignKeys.find(
          f =>
            f.columnNames.length === 1 &&
            f.columnNames[0] === 'warehouse_id' &&
            f.referencedTableName === 'warehouses'
        );

      if (fk) {
        await queryRunner.dropForeignKey(tableName, fk);
      }

      await queryRunner.createForeignKey(
        tableName,
        new TableForeignKey({
          name: fkName,
          columnNames: ['warehouse_id'],
          referencedTableName: 'warehouses',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        })
      );
    };

    await restoreCascade('orders_v2', 'FK_orders_v2_warehouse');
    await restoreCascade('stocks', 'FK_stocks_warehouse');
  }
}
