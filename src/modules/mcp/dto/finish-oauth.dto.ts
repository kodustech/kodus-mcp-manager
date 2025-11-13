import { IsString } from "class-validator";

export class FinishOAuthDto {
 @IsString()
 code: string;
 
 @IsString()
 state: string;

 @IsString()
 integrationId: string;
}