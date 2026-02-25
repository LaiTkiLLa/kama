import { Controller, ForbiddenException, Get, Headers, Query } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { GetCurrentStocksDto } from './dto/get-current-stocks.dto';
import { GetCurrentStocks } from './interfaces/get-current-stocks.interface';
import { GetStocksByDateDto } from './dto/get-stocks-by-date.dto';
import { GetStocksByDate } from './interfaces/get-stocks-by-date.interface';

@Controller('stocks')
export class StocksController {
  constructor(private stocksService: StocksService) {}

  @Get('current')
  async getCurrentStocks(
    @Headers('api-key') apiKey: string,
    @Query() getCurrentStocksDto: GetCurrentStocksDto
  ): Promise<GetCurrentStocks[]> {
    if (!apiKey || apiKey !== process.env.apiKey) {
      throw new ForbiddenException('Отсутствует токен');
    }
    return this.stocksService.getCurrentStocks(getCurrentStocksDto);
  }

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

  @Get('by-date')
  async getStocksByDate(
    @Headers('api-key') apiKey: string,
    @Query() getStocksByDateDto: GetStocksByDateDto
  ): Promise<GetStocksByDate[]> {
    if (!apiKey || apiKey !== process.env.apiKey) {
      throw new ForbiddenException('Отсутствует токен');
    }
    return this.stocksService.getStocksByDate(getStocksByDateDto);
  }
}
