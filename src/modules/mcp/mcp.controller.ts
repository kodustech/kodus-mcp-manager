import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Req,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { McpService } from './mcp.service';
import { QueryDto } from './dto/query.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { InitiateConnectionDto } from './dto/initiate-connection.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('mcp')
@UseGuards(AuthGuard)
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Get('connections')
  getConnections(@Query() query: QueryDto, @Req() request: FastifyRequest) {
    return this.mcpService.getConnections(query, request.organizationId);
  }

  @Get('connections/:connectionId')
  async getConnection(@Param('connectionId') connectionId: string) {
    return this.mcpService.getConnection(connectionId);
  }

  @Patch('connections')
  updateConnection(
    @Body() body: UpdateConnectionDto,
    @Req() request: FastifyRequest,
  ) {
    return this.mcpService.updateConnection(body, request.organizationId);
  }

  @Get('integrations')
  getIntegrations(@Query() query: QueryDto, @Req() request: FastifyRequest) {
    return this.mcpService.getIntegrations(query, request.organizationId);
  }

  @Get(':provider/integrations/:integrationId')
  getIntegration(
    @Param('integrationId') integrationId: string,
    @Param('provider') provider: string,
    @Req() request: FastifyRequest,
  ) {
    return this.mcpService.getIntegration(
      integrationId,
      provider,
      request.organizationId,
    );
  }

  @Get(':provider/integrations/:integrationId/required-params')
  getIntegrationRequiredParams(
    @Param('integrationId') integrationId: string,
    @Param('provider') provider: string,
  ) {
    return this.mcpService.getIntegrationRequiredParams(
      integrationId,
      provider,
    );
  }

  @Get(':provider/integrations/:integrationId/tools')
  getIntegrationTools(
    @Param('integrationId') integrationId: string,
    @Param('provider') provider: string,
    @Req() request: FastifyRequest,
  ) {
    return this.mcpService.getIntegrationTools(
      integrationId,
      request.organizationId,
      provider,
    );
  }

  @Post(':provider/connect')
  initiateConnection(
    @Param('provider') provider: string,
    @Body() body: InitiateConnectionDto,
    @Req() request: FastifyRequest,
  ) {
    return this.mcpService.initiateConnection(
      request.organizationId,
      provider,
      body,
    );
  }
}
