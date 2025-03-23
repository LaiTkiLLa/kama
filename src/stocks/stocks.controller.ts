import { Controller, ForbiddenException, Get, Headers, Query } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { GetCurrentStocksDto } from './dto/get-current-stocks.dto';
import { Stocks } from './entities/stocks.entity';

@Controller('stocks')
export class StocksController {
  constructor(private stocksService: StocksService) {}

  @Get('current')
  async getCurrentStocks(
    @Headers('api-key') apiKey: string,
    @Query() getCurrentStocksDto: GetCurrentStocksDto
  ): Promise<Stocks[]> {
    if (!apiKey || apiKey !== process.env.apiKey) {
      throw new ForbiddenException('Отсутствует токен');
    }
    return this.stocksService.getCurrentStocks(getCurrentStocksDto);
  }
}
