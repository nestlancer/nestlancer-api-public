import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse, ApiStandardResponses } from '@nestlancer/common';
import { AdminGuard } from '../../guards/admin.guard';
import { ReportsAdminService } from '../../services/reports-admin.service';
import { GenerateReportDto } from '../../dto/generate-report.dto';

@ApiTags('Admin - Reports')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('reports')
@ApiStandardResponses()
export class ReportsAdminController {
  constructor(private readonly reportsService: ReportsAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List generated analytics reports' })
  @ApiStandardResponse({ message: 'Reports retrieved' })
  async listReports(@Query('page') page?: string, @Query('limit') limit?: string): Promise<any> {
    return this.reportsService.listReports(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Generate an analytics report now (PIPE-001)' })
  @ApiStandardResponse({ message: 'Report generated' })
  async generateReport(@Body() dto: GenerateReportDto): Promise<any> {
    return this.reportsService.generateReport(dto);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download analytics report (presigned URL)' })
  @ApiParam({ name: 'id', description: 'Report export UUID' })
  @ApiStandardResponse({ message: 'Report download URL generated' })
  async downloadReport(@Param('id') id: string): Promise<any> {
    return this.reportsService.getDownloadUrl(id);
  }
}
