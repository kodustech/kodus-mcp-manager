import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class QueryDto {
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    @Min(1, {
        message:
            'page must be a number conforming to the specified constraints',
    })
    page = 1;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    @Min(1, {
        message:
            'pageSize must be a number conforming to the specified constraints',
    })
    pageSize = 50;

    @IsString()
    @IsOptional()
    provider: string;

    @IsString()
    @IsOptional()
    appName: string;

    @IsString()
    @IsOptional()
    organizationId: string;

    @IsString()
    @IsOptional()
    integrationId: string;

    @IsString()
    @IsOptional()
    status: string;
}
