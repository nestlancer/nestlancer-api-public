import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { ApiStandardResponses } from '@nestlancer/common';
import { TimeEntriesService } from '../../services/time-entries.service';

@ApiTags('Admin/Time Entries')
@ApiBearerAuth()
@Auth('ADMIN')
@Controller('admin/time-entries')
@ApiStandardResponses()
export class TimeEntriesAdminController {
  constructor(private readonly timeEntries: TimeEntriesService) {}

  @Get()
  @ApiOperation({ summary: 'List time entries for a milestone or project' })
  async list(
    @Query('milestoneId') milestoneId?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.timeEntries.list({
      milestoneId,
      projectId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { status: 'success', data };
  }

  @Post()
  @ApiOperation({ summary: 'Log time against a milestone' })
  async create(
    @CurrentUser('userId') adminId: string,
    @Body()
    body: {
      milestoneId: string;
      durationMinutes: number;
      description?: string;
      startedAt?: string;
      endedAt?: string;
    },
  ) {
    const data = await this.timeEntries.create(adminId, body);
    return { status: 'success', data };
  }
}
