import { Body, Controller, Get, Headers, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ItemsService } from './items.service';
import { GetItemsListDto } from './dto/get-items-list.dto';
import { UpdateItemInfoDto } from './dto/update-item-info.dto';
import { GetItemsStopListDto } from './dto/get-items-stop-list.dto';
import { UpdateStopListItems } from './dto/update-status-stop-list.dto';
import { UpdateArrayDirectoryItemsInfoDto } from './dto/update-directory-item-info.dto';
import { GetDirectoryListDto } from './dto/get-directory-list.dto';
import { CreateLowDaysStocksDto } from './dto/create-low-days-stocks.dto';
import { GetChangePriceHistoryDto } from './dto/get-change-price-history.dto';

@Controller('items')
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  @Get('list')
  async getItemsList(@Headers('api-key') apiKey: string, @Query() getItemsListDto: GetItemsListDto) {
    return this.itemsService.getItemsList(getItemsListDto);
  }

  @Post()
  async createTestItem(@Headers('api-key') apiKey: string) {
    return this.itemsService.createTestItem();
  }

  @Post('low-days-stocks')
  async lowDaysStocks(@Headers('api-key') apiKey: string, @Body() lowDaysStocksDto: CreateLowDaysStocksDto) {
    return this.itemsService.lowDaysStocks(lowDaysStocksDto);
  }

  @Get('low-days-stocks')
  async getLowDaysStocks(
    @Headers('api-key') apiKey: string,
    @Query() getChangePriceHistoryDto: GetChangePriceHistoryDto
  ) {
    return this.itemsService.getLowDaysStocks(getChangePriceHistoryDto);
  }

  @Get('directory/list')
  async getItemsDirectoryList(
    @Headers('api-key') apiKey: string,
    @Query() getDirectoryListDto: GetDirectoryListDto
  ) {
    return this.itemsService.getItemsDirectoryList(getDirectoryListDto);
  }

  @Get('change-price-history')
  async getChangePriceHistory(
    @Headers('api-key') apiKey: string,
    @Query() getChangePriceHistoryDto: GetChangePriceHistoryDto
  ) {
    return this.itemsService.getChangePriceHistory(getChangePriceHistoryDto);
  }

  @Patch('directory/info')
  async updateArrayDirectoryItemsInfo(
    @Headers('api-key') apiKey: string,
    @Body() updateArrayDirectoryItemsInfoDto: UpdateArrayDirectoryItemsInfoDto
  ) {
    return this.itemsService.updateArrayDirectoryItemsInfo(updateArrayDirectoryItemsInfoDto);
  }

  @Patch('info/:id')
  async updateItemInfo(
    @Headers('api-key') apiKey: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateItemInfoDto: UpdateItemInfoDto
  ) {
    return this.itemsService.updateItemInfo(id, updateItemInfoDto);
  }

  @Get('stop-list')
  async getItemsStopList(
    @Headers('api-key') apiKey: string,
    @Query() getItemsStopListDto: GetItemsStopListDto
  ) {
    return this.itemsService.getItemStopsList(getItemsStopListDto);
  }

  @Patch('stop-list')
  async updateItemsStopList(
    @Headers('api-key') apiKey: string,
    @Body() updateStopListItems: UpdateStopListItems
  ) {
    return this.itemsService.updateItemsStopList(updateStopListItems);
  }
}
