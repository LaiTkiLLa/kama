import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnsItems1769513454909 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('items', [
      new TableColumn({
        name: 'consolidation',
        isNullable: false,
        default: 14,
        type: 'int'
      }),
      new TableColumn({
        name: 'payment',
        isNullable: false,
        default: 10,
        type: 'int'
      }),
      new TableColumn({
        name: 'assembling',
        isNullable: false,
        default: 5,
        type: 'int'
      }),
      new TableColumn({
        name: 'fullfillment_acceptance',
        isNullable: false,
        default: 5,
        type: 'int'
      }),
      new TableColumn({
        name: 'marketplace_acceptance',
        isNullable: false,
        default: 10,
        type: 'int'
      }),
      new TableColumn({
        name: 'seasonality',
        isNullable: true,
        type: 'float'
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('items', [
      'consolidation',
      'payment',
      'assembling',
      'fullfillment_acceptance',
      'marketplace_acceptance'
    ]);
  }
}
