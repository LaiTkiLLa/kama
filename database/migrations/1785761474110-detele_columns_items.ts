import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeteleColumnsItems1785761474110 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('items', [
      'plan_time',
      'production_and_assembly_time',
      'delivery_time',
      'shipping_period',
      'planned_turnover',
      'stocks_in_days',
      'frequency_of_sending_cars',
      'daily_growth_percentage'
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
