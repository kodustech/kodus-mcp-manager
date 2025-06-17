import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMCPServerDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  appName: string;

  @IsString()
  @IsNotEmpty()
  authConfigId: string;
}
