import { Body, Controller, Get, Headers, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { InfoService } from './info.service';
import { GetStatusesListDto } from './dto/get-statuses-list.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { UpdateContaminantsDto } from './dto/update-contaminants.dto';

@Controller('info')
export class InfoController {
  constructor(private infoService: InfoService) {}

  @Get('statuses')
  async getStatusesList(@Headers('api-key') apiKey: string, @Query() getStatusesListDto: GetStatusesListDto) {
    return this.infoService.getStatusesList(getStatusesListDto);
  }

  @Get('suppliers')
  async getSuppliersList(@Headers('api-key') apiKey: string) {
    void apiKey;
    return this.infoService.getSuppliersList();
  }

  @Get('warehouses')
  async getWarehousesList(@Headers('api-key') apiKey: string) {
    void apiKey;
    return this.infoService.getWarehousesList();
  }

  @Patch('suppliers/:id')
  async updateSupplier(
    @Headers('api-key') apiKey: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSupplierDto: UpdateSupplierDto
  ) {
    return this.infoService.updateSupplier(id, updateSupplierDto);
  }

  @Get('contaminants')
  async getContaminantsList(@Headers('api-key') apiKey: string) {
    void apiKey;
    return this.infoService.getContaminantsList();
  }

  @Patch('contaminants/:id')
  async updateContaminant(
    @Headers('api-key') apiKey: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContaminantsDto: UpdateContaminantsDto
  ) {
    return this.infoService.updateContaminant(id, updateContaminantsDto);
  }
}
