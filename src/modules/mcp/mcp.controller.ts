import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Req,
  Patch,
  Res,
} from '@nestjs/common';
import { Request } from 'express';
import { McpService } from './mcp.service';
import { QueryDto } from './dto/query.dto';
import { MCPInstallIntegrationDto } from './dto/mcp-install.dto';
import { Response } from 'express';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Get('connections')
  getConnections(@Query() query: QueryDto, @Req() request: Request) {
    return this.mcpService.getConnections(query, request.organizationId);
  }

  @Get('connections/:connectionId')
  async getConnection(
    @Param('connectionId') connectionId: string,
    @Res() res: Response,
  ) {
    const connection = await this.mcpService.getConnection(connectionId);
    return res.status(200).json(connection); // assim retorna null
  }

  @Get('integrations')
  getIntegrations(@Query() query: QueryDto, @Req() request: Request) {
    return this.mcpService.getIntegrations(query, request.organizationId);
  }

  @Get(':provider/integrations/:integrationId')
  getIntegration(
    @Param('integrationId') integrationId: string,
    @Param('provider') provider: string,
    @Req() request: Request,
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
    @Req() request: Request,
  ) {
    return this.mcpService.getIntegrationTools(
      integrationId,
      request.organizationId,
      provider,
    );
  }

  @Post(':provider/integrations/:integrationId/install')
  installIntegration(
    @Param('integrationId') integrationId: string,
    @Param('provider') provider: string,
    @Body() body: MCPInstallIntegrationDto & { [key: string]: any },
    @Req() request: Request,
  ) {
    return this.mcpService.installIntegration(
      integrationId,
      request.organizationId,
      provider,
      body,
    );
  }

  @Patch('integrations')
  updateIntegration(@Body() body: any, @Req() request: Request) {
    return this.mcpService.updateIntegration(body, request.organizationId);
  }
}
