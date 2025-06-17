import { Controller, Get, Param, Post, Query, Body } from '@nestjs/common';

import { ComposioService } from './composio.service';
import { QueryDto } from './dto/query.dto';
import { CreateMCPServerDto } from './dto/create-mcp.dto';
import { InitiateConnectionDto } from './dto/initiate-connection.dto';

@Controller('composio')
export class ComposioController {
  constructor(private readonly composioService: ComposioService) {}

  @Get('integrations')
  getIntegrations(@Query() query: QueryDto) {
    return this.composioService.getIntegrations(query);
  }

  @Get('integrations/:integrationId')
  getIntegration(@Param('integrationId') integrationId: string) {
    return this.composioService.getIntegration(integrationId);
  }

  @Get('integrations/:integrationId/required-params')
  getIntegrationRequiredParams(@Param('integrationId') integrationId: string) {
    return this.composioService.getIntegrationRequiredParams(integrationId);
  }

  @Post('initiate-connection')
  initiateConnection(@Body() body: InitiateConnectionDto) {
    return this.composioService.initiateConnection(body);
  }

  @Get('connections')
  getConnections(@Query() query: QueryDto) {
    return this.composioService.getConnections(query);
  }

  @Get('mcp-servers/:authConfigId')
  getMCPServer(@Param('authConfigId') authConfigId: string) {
    return this.composioService.getMCPServer(authConfigId);
  }

  @Post('mcp-servers')
  createMCPServer(@Body() body: CreateMCPServerDto) {
    return this.composioService.createMCPServer(body);
  }
}
