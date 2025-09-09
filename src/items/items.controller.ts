import { Body, Controller, Get, Headers, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ItemsService } from './items.service';
import { GetItemsListDto } from './dto/get-items-list.dto';
import { UpdateItemInfoDto } from './dto/update-item-info.dto';
import { GetItemsStopListDto } from './dto/get-items-stop-list.dto';
import { UpdateStopListItems } from './dto/update-status-stop-list.dto';
import { UpdateArrayDirectoryItemsInfoDto } from './dto/update-directory-item-info.dto';
import { GetDirectoryListDto } from './dto/get-directory-list.dto';

@Controller('items')
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  @Get('list')
  async getItemsList(@Headers('api-key') apiKey: string, @Query() getItemsListDto: GetItemsListDto) {
    return this.itemsService.getItemsList(getItemsListDto);
  }

  @Get('directory/list')
  async getItemsDirectoryList(
    @Headers('api-key') apiKey: string,
    @Query() getDirectoryListDto: GetDirectoryListDto
  ) {
    return this.itemsService.getItemsDirectoryList(getDirectoryListDto);
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
