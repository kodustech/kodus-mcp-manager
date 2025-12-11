import { IsString } from 'class-validator';

export class InitiateOAuthDto {
    @IsString()
    integrationId: string;
}
