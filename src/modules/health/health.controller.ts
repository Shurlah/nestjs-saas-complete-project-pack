import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ResponsePayload } from '../../common/interceptors/response.interceptor';

interface HealthData {
  status: 'ok';
  timestamp: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check API liveness' })
  @ApiOkResponse({ description: 'The API process is healthy.' })
  getHealth(): ResponsePayload<HealthData> {
    return {
      message: 'Service is healthy',
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
