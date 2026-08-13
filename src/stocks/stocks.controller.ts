import { Controller, ForbiddenException, Get, Headers, Query } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { GetCurrentStocksDto } from './dto/get-current-stocks.dto';
import { GetCurrentStocks } from './interfaces/get-current-stocks.interface';

@Controller('stocks')
export class StocksController {
  constructor(private stocksService: StocksService) {}

  @Get('/v2/current')
  async getCurrentStocksV2(
    @Headers('api-key') apiKey: string,
    @Query() getCurrentStocksDto: GetCurrentStocksDto
  ): Promise<GetCurrentStocks[]> {
    if (!apiKey || apiKey !== process.env.apiKey) {
      throw new ForbiddenException('Отсутствует токен');
    }
    return this.stocksService.getCurrentStocksV2(getCurrentStocksDto);
  }
}
