import { Module } from '@nestjs/common';
import { ComposioController } from './composio.controller';
import { ComposioService } from './composio.service';

@Module({
  controllers: [ComposioController],
  providers: [ComposioService],
  exports: [ComposioService],
})
export class ComposioModule {}
