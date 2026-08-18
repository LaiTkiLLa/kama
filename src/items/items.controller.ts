import { Body, Controller, Get, Headers, Patch, Post, Query } from '@nestjs/common';
import { ItemsService } from './items.service';
import { GetItemsStopListDto } from './dto/get-items-stop-list.dto';
import { UpdateStopListItems } from './dto/update-status-stop-list.dto';
import { UpdateArrayDirectoryItemsInfoDto } from './dto/update-directory-item-info.dto';
import { GetDirectoryListDto } from './dto/get-directory-list.dto';
import { GetErpItemsListDto } from './dto/get-erp-items-list.dto';
import { UpdateErpLogisticInfoDto } from './dto/update-erp-logistic-info.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductCreationService } from './product-creation/product-creation.service';

@Controller('items')
export class ItemsController {
  constructor(
    private itemsService: ItemsService,
    private productCreationService: ProductCreationService
  ) {}

  @Post()
  async createTestItem(@Headers('api-key') apiKey: string) {
    return this.itemsService.createTestItem();
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
    return this.itemsService.updateArrayDirectoryItemsInfoV2(updateArrayDirectoryItemsInfoDto);
  }

  @Get('v2/stop-list')
  async getItemsStopListV2(
    @Headers('api-key') apiKey: string,
    @Query() getItemsStopListDto: GetItemsStopListDto
  ) {
    return this.itemsService.getItemStopsListV2(getItemsStopListDto);
  }

  @Patch('stop-list')
  async updateItemsStopList(
    @Headers('api-key') apiKey: string,
    @Body() updateStopListItems: UpdateStopListItems
  ) {
    return this.itemsService.updateItemsStopList(updateStopListItems);
  }

  @Get('erp/list')
  async getItemsErpList(@Headers('api-key') apiKey: string, @Query() getErpItemsListDto: GetErpItemsListDto) {
    return this.itemsService.getItemsErpList(getErpItemsListDto);
  }

  @Get('erp/suppliers-items/list')
  async getItemsSuppliersList(
    @Headers('api-key') apiKey: string,
    @Query() getErpItemsListDto: GetErpItemsListDto
  ) {
    return this.itemsService.getSuppliersItemsErpList(getErpItemsListDto);
  }

  @Patch('erp/logistics-info')
  async updateErpLogisticsInfo(
    @Headers('api-key') apiKey: string,
    @Body() updateErpLogisticInfoDto: UpdateErpLogisticInfoDto
  ) {
    return await this.itemsService.updateErpLogisticsInfo(updateErpLogisticInfoDto);
  }

  @Post('create-on-marketplaces')
  async createProduct(@Headers('api-key') apiKey: string, @Body() createProductDto: CreateProductDto) {
    return this.productCreationService.createProduct(createProductDto);
  }
}
