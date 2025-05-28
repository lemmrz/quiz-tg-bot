import { Update, Start, Ctx } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { SceneNames } from './bot.interfaces';

@Update()
export class BotUpdate {
  @Start()
  async onStart(@Ctx() ctx: Scenes.SceneContext) {
    await ctx.scene.enter(SceneNames.MAIN);
  }
}
