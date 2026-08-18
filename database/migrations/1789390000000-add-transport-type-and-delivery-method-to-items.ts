import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * items: add logistics fields transport_type and delivery_method (varchar, nullable).
 */
export class AddTransportTypeAndDeliveryMethodToItems1789390000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('items');
    if (!table) {
      throw new Error('Table items not found');
    }

    if (!table.findColumnByName('transport_type')) {
      await queryRunner.addColumn(
        'items',
        new TableColumn({
          name: 'transport_type',
          type: 'varchar',
          isNullable: true
        })
      );
    }

    if (!table.findColumnByName('delivery_method')) {
      await queryRunner.addColumn(
        'items',
        new TableColumn({
          name: 'delivery_method',
          type: 'varchar',
          isNullable: true
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('items');
    if (table?.findColumnByName('delivery_method')) {
      await queryRunner.dropColumn('items', 'delivery_method');
    }
    if (table?.findColumnByName('transport_type')) {
      await queryRunner.dropColumn('items', 'transport_type');
    }
  }
}
