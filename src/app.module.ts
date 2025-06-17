import { Module } from '@nestjs/common';
import { ComposioModule } from './modules/composio/composio.module';
import { AppConfigModule } from './config/config.module';

@Module({
  imports: [AppConfigModule, ComposioModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
