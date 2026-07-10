import { Controller, ForbiddenException, Get, Headers, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { GetDynamicOrdersDto } from './dto/get-dynamic-orders.dto';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get('dynamic')
  async getDynamicOrders(
    @Headers('api-key') apiKey: string,
    @Query() getDynamicOrdersDto: GetDynamicOrdersDto
  ) {
    if (!apiKey || apiKey !== process.env.apiKey) {
      throw new ForbiddenException('Отсутствует токен');
    }
    return this.ordersService.getDynamicOrders(getDynamicOrdersDto);
  }

  @Get('v2/dynamic')
  async getV2DynamicOrders(
    @Headers('api-key') apiKey: string,
    @Query() getDynamicOrdersDto: GetDynamicOrdersDto
  ) {
    if (!apiKey || apiKey !== process.env.apiKey) {
      throw new ForbiddenException('Отсутствует токен');
    }
    return this.ordersService.getV2DynamicOrders(getDynamicOrdersDto);
  }
}
