import { Controller, Get, Headers, Query } from '@nestjs/common';
import { InfoService } from './info.service';
import { GetStatusesListDto } from './dto/get-statuses-list.dto';

@Controller('items')
export class InfoController {
  constructor(private infoService: InfoService) {}

  @Get('statuses')
  async getStatusesList(@Headers('api-key') apiKey: string, @Query() getStatusesListDto: GetStatusesListDto) {
    return this.infoService.getStatusesList(getStatusesListDto);
  }
}
