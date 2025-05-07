import { Controller, Get, Headers, Query } from '@nestjs/common';
import { ItemsService } from './items.service';
import { GetItemsListDto } from './dto/get-items-list.dto';

@Controller('items')
export class ItemsController {
  constructor(private itemsService: ItemsService) {}
  @Get('list')
  async getItemsList(@Headers('api-key') apiKey: string, @Query() getItemsListDto: GetItemsListDto) {
    return this.itemsService.getItemsList(getItemsListDto);
  }
}
