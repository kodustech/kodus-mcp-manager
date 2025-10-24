import { IsString } from 'class-validator';

export class StringRecordDto {
    @IsString()
    key: string;

    @IsString()
    value: string;
}
