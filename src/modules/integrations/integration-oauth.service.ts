import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EncryptionUtils } from 'src/common/utils/encryption';
import {
    buildAuthorizationUrl,
    checkAndRefreshOAuth,
    discoverOAuth,
    exchangeCodeForTokens,
    generatePKCE,
    generateState,
    getCanonicalResourceUri,
    OAuthAuthorizationServerMetadata,
    OAuthProtectedResourceMetadata,
    registerOauthClient,
    TokenData,
} from 'src/common/utils/oauth';
import { Repository } from 'typeorm';
import { MCPIntegrationOAuthEntity } from './entities/mcp-integration-oauth.entity';
import { MCPIntegrationEntity } from './entities/mcp-integration.entity';
import {
    MCPIntegrationAuthType,
    MCPIntegrationOAuthStatus,
} from './enums/integration.enum';
import { MCPIntegrationUniqueFields } from './interfaces/mcp-integration.interface';

type IntegrationOAuthState = Partial<
    MCPIntegrationUniqueFields<MCPIntegrationAuthType.OAUTH2>
>;

@Injectable()
export class IntegrationOAuthService {
    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(MCPIntegrationOAuthEntity)
        private readonly integrationOAuthRepository: Repository<MCPIntegrationOAuthEntity>,
        private readonly encryptionUtils: EncryptionUtils,
    ) {}

    private decryptAndParse<T>(
        encrypted: string | null | undefined,
        defaultValue: T,
    ): T {
        if (!encrypted) {
            return defaultValue;
        }

        try {
            const decrypted = this.encryptionUtils.decrypt(encrypted);
            return JSON.parse(decrypted) as T;
        } catch (error) {
            console.error('Failed to decrypt or parse OAuth data:', error);
            return defaultValue;
        }
    }

    async getOAuthStatus(
        organizationId: string,
        integrationId: string,
    ): Promise<MCPIntegrationOAuthStatus | null> {
        const entity = await this.integrationOAuthRepository.findOne({
            where: { integrationId, organizationId },
        });

        if (!entity || !entity.status) {
            return null;
        }

        return entity.status;
    }

    async getOAuthState(
        organizationId: string,
        integrationId: string,
    ): Promise<IntegrationOAuthState | null> {
        const entity = await this.integrationOAuthRepository.findOne({
            where: { integrationId, organizationId },
        });

        if (!entity || !entity.auth) {
            return null;
        }

        return this.decryptAndParse<IntegrationOAuthState>(
            entity.auth,
            {} as IntegrationOAuthState,
        );
    }

    async saveOAuthState(
        organizationId: string,
        integrationId: string,
        status: MCPIntegrationOAuthStatus,
        state: IntegrationOAuthState,
    ): Promise<void> {
        const payload = this.encryptionUtils.encrypt(JSON.stringify(state));

        let entity = await this.integrationOAuthRepository.findOne({
            where: { integrationId, organizationId },
        });

        if (!entity) {
            entity = this.integrationOAuthRepository.create({
                organizationId,
                integrationId,
                auth: payload,
                status,
            });
        } else {
            entity.auth = payload;
            entity.status = status;
        }

        await this.integrationOAuthRepository.save(entity);
    }

    async refreshOAuthStateIfNeeded(params: {
        organizationId: string;
        integrationId: string;
        oauthState: IntegrationOAuthState;
    }): Promise<IntegrationOAuthState> {
        const { organizationId, integrationId } = params;
        let { oauthState } = params;

        const { tokens, clientId, clientSecret, redirectUri, asMetadata } =
            oauthState;

        if (
            !tokens ||
            !asMetadata?.token_endpoint ||
            !redirectUri ||
            !clientId
        ) {
            return oauthState;
        }

        try {
            const newTokens = await checkAndRefreshOAuth(
                asMetadata.token_endpoint,
                {
                    tokens: tokens as TokenData,
                    clientId,
                    clientSecret,
                    redirectUri,
                },
            );

            if (!newTokens) {
                return oauthState;
            }

            oauthState = {
                ...oauthState,
                tokens: newTokens,
            };

            await this.saveOAuthState(
                organizationId,
                integrationId,
                MCPIntegrationOAuthStatus.ACTIVE,
                oauthState,
            );

            return oauthState;
        } catch (error) {
            console.error('Error checking/refreshing OAuth token:', error);
            return oauthState;
        }
    }

    async refreshIntegrationOAuthIfNeeded(
        entity: MCPIntegrationEntity,
    ): Promise<void> {
        if (entity.authType !== MCPIntegrationAuthType.OAUTH2) {
            return;
        }

        const config = this.decryptAndParse<
            MCPIntegrationUniqueFields<MCPIntegrationAuthType.OAUTH2>
        >(entity.auth, {} as any);

        const oauthState = await this.getOAuthState(
            entity.organizationId,
            entity.id,
        );

        if (!oauthState) {
            return;
        }

        const mergedState: IntegrationOAuthState = {
            ...oauthState,
            clientId: oauthState.clientId ?? config.clientId,
            clientSecret: oauthState.clientSecret ?? config.clientSecret,
        };

        await this.refreshOAuthStateIfNeeded({
            organizationId: entity.organizationId,
            integrationId: entity.id,
            oauthState: mergedState,
        });
    }

    async initiateOAuth(params: {
        baseUrl: string;
        oauthScopes: string[];
        dynamicRegistration?: boolean;
        clientId?: string;
        clientSecret?: string;
    }): Promise<{
        authUrl: string;
        clientId: string;
        clientSecret?: string;
        rs: OAuthProtectedResourceMetadata;
        as: OAuthAuthorizationServerMetadata;
        redirectUri: string;
        codeChallenge: string;
        codeVerifier: string;
        state: string;
    }> {
        const {
            baseUrl,
            oauthScopes,
            dynamicRegistration,
            clientId,
            clientSecret,
        } = params;

        const { rs, as } = await discoverOAuth(baseUrl);

        const {
            authorization_endpoint: authorizationEndpoint,
            token_endpoint: tokenEndpoint,
            registration_endpoint: registrationEndpoint,
        } = as;

        if (!authorizationEndpoint || !tokenEndpoint) {
            throw new Error('Missing authorization or token endpoints');
        }

        const redirectUri = this.configService.get<string>('redirectUri');

        if (!redirectUri) {
            throw new Error('Redirect URI is not configured');
        }

        let effectiveClientId = clientId;
        let effectiveClientSecret = clientSecret;

        if (dynamicRegistration && registrationEndpoint) {
            const regResult = await registerOauthClient(
                registrationEndpoint,
                redirectUri,
                oauthScopes,
            );
            effectiveClientId = regResult.clientId;
            effectiveClientSecret = regResult.clientSecret;
        } else if (!effectiveClientId) {
            throw new Error(
                'A client_id is required, and dynamic client registration is not supported.',
            );
        }

        const { verifier, challenge } = generatePKCE();
        const state = generateState();

        const authUrl = buildAuthorizationUrl({
            authorizationEndpoint,
            clientId: effectiveClientId,
            redirectUri,
            challenge,
            state,
            baseUrl,
            oauthScopes,
        });

        return {
            authUrl,
            clientId: effectiveClientId,
            clientSecret: effectiveClientSecret,
            rs,
            as,
            redirectUri,
            codeChallenge: challenge,
            codeVerifier: verifier,
            state,
        };
    }

    async exchangeAuthorizationCode(params: {
        baseUrl: string;
        tokenEndpoint: string;
        clientId: string;
        clientSecret?: string;
        code: string;
        redirectUri: string;
        codeVerifier: string;
        state: string;
    }) {
        const {
            baseUrl,
            tokenEndpoint,
            clientId,
            clientSecret,
            code,
            redirectUri,
            codeVerifier,
            state,
        } = params;

        const resource = getCanonicalResourceUri(baseUrl);

        const tokens = await exchangeCodeForTokens(tokenEndpoint, {
            clientId,
            clientSecret,
            code,
            codeVerifier,
            redirectUri,
            resource,
            state,
        });

        return tokens;
    }

    async deleteOAuthState(
        organizationId: string,
        integrationId: string,
    ): Promise<void> {
        await this.integrationOAuthRepository.delete({
            organizationId,
            integrationId,
        });
    }
}
