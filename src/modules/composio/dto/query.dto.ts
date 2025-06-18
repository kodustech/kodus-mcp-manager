import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1, {
    message: 'page must be a number conforming to the specified constraints',
  })
  page = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1, {
    message:
      'pageSize must be a number conforming to the specified constraints',
  })
  @Max(100, {
    message:
      'pageSize must be a number conforming to the specified constraints',
  })
  pageSize = 10;

  @IsString()
  @IsOptional()
  integrationName: string;

  @IsString()
  @IsOptional()
  integrationId: string;

  @IsString()
  @IsOptional()
  entityId: string;
}
