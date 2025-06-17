import { IsNumber, IsString } from 'class-validator';

export class QueryDto {
  @IsNumber()
  page = 1;

  @IsNumber()
  pageSize = 10;

  @IsString()
  integrationName: string;

  @IsString()
  integrationId: string;

  @IsString()
  entityId: string;
}
