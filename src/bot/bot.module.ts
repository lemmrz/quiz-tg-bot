import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BotUpdate } from './bot.update';
import { BotService } from './bot.serivce';
import { PrismaModule } from 'prisma/prisma.module';
import { AddQuizScene } from './scenes/add-quiz.scene';
import { MainScene } from './scenes/main.scene';
import { session } from 'telegraf';
import { AdminScene } from './scenes/admin-panel.scene';
import { PassTestScene } from './scenes/pass-test.scene';
import { LookResultsScene } from './scenes/look-results.scene';

const scenes = [
  MainScene,
  AddQuizScene,
  AdminScene,
  PassTestScene,
  LookResultsScene,
];

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>('TG_TOKEN'),
        middlewares: [session()],
      }),
    }),
  ],
  providers: [BotUpdate, BotService, ...scenes],
  exports: [BotService],
})
export class BotModule {}
