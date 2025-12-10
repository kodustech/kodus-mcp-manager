import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { FinishOAuthDto } from './dto/finish-oauth.dto';
import { InitiateConnectionDto } from './dto/initiate-connection.dto';
import { InitiateOAuthDto } from './dto/initiate-oauth.dto';
import { QueryDto } from './dto/query.dto';
import {
    UpdateAllowedToolsDto,
    UpdateConnectionDto,
} from './dto/update-connection.dto';
import { McpService } from './mcp.service';

@Controller('mcp')
@UseGuards(AuthGuard)
export class McpController {
    constructor(private readonly mcpService: McpService) {}

    @Get('connections')
    getConnections(@Query() query: QueryDto, @Req() request: FastifyRequest) {
        return this.mcpService.getConnections(query, request.organizationId);
    }

    @Get('connections/:connectionId')
    async getConnection(
        @Param('connectionId') connectionId: string,
        @Req() request: FastifyRequest,
    ) {
        return this.mcpService.getConnection(
            connectionId,
            request.organizationId,
        );
    }

    @Patch('connections')
    updateConnection(
        @Body() body: UpdateConnectionDto,
        @Req() request: FastifyRequest,
    ) {
        return this.mcpService.updateConnection(body, request.organizationId);
    }

    @Delete('connections/:connectionId')
    deleteConnection(
        @Param('connectionId') connectionId: string,
        @Req() request: FastifyRequest,
    ) {
        return this.mcpService.deleteConnection(
            connectionId,
            request.organizationId,
        );
    }

    @Put('connections/:integrationId/allowed-tools')
    updateAllowedTools(
        @Param('integrationId') integrationId: string,
        @Body() body: UpdateAllowedToolsDto,
        @Req() request: FastifyRequest,
    ) {
        return this.mcpService.updateAllowedTools(
            integrationId,
            body.allowedTools,
            request.organizationId,
        );
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
    async getIntegrationTools(
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

    @Get('integration/custom')
    getCustomIntegrations(
        @Query('active') active: boolean,
        @Req() request: FastifyRequest,
    ) {
        return this.mcpService.getCustomIntegrations(
            request.organizationId,
            active,
        );
    }

    @Get('integration/custom/:integrationId')
    getProviderIntegration(
        @Param('integrationId') integrationId: string,
        @Query('active') active: boolean,
        @Req() request: FastifyRequest,
    ) {
        return this.mcpService.getCustomIntegration(
            request.organizationId,
            integrationId,
            active,
        );
    }

    @Post('integration/:provider')
    createIntegration(
        @Param('provider') provider: string,
        @Body() body: CreateIntegrationDto,
        @Req() request: FastifyRequest,
    ) {
        return this.mcpService.createIntegration(
            request.organizationId,
            provider,
            body,
        );
    }

    @Put('integration/:provider/:integrationId')
    editIntegration(
        @Param('provider') provider: string,
        @Param('integrationId') integrationId: string,
        @Body() body: CreateIntegrationDto,
        @Req() request: FastifyRequest,
    ) {
        return this.mcpService.editIntegration(
            request.organizationId,
            provider,
            integrationId,
            body,
        );
    }

    @Delete('integration/:provider/:integrationId')
    deleteIntegration(
        @Param('provider') provider: string,
        @Param('integrationId') integrationId: string,
        @Req() request: FastifyRequest,
    ) {
        return this.mcpService.deleteIntegration(
            request.organizationId,
            provider,
            integrationId,
        );
    }

    @Post('integration/custom/oauth/finalize')
    finalizeOAuthIntegration(
        @Body() body: FinishOAuthDto,
        @Req() request: FastifyRequest,
    ) {
        return this.mcpService.finalizeOAuthIntegration(
            request.organizationId,
            body,
        );
    }

    @Post('integration/custom/oauth/initialize')
    initializeOAuthIntegration(
        @Body() body: InitiateOAuthDto,
        @Req() request: FastifyRequest,
    ) {
        return this.mcpService.initiateOAuthIntegration(
            request.organizationId,
            body,
        );
    }
}
