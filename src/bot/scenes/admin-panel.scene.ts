import { Scene, SceneEnter, On, Ctx } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { SceneNames, KeyboardCommands } from '../bot.interfaces';
import { BaseScene, SceneContextWithStep } from './base.scene';

@Scene(SceneNames.ADMIN_PANEL)
export class AdminScene extends BaseScene<object, never> {
  protected stepHandlers?: Partial<
    Record<never, (ctx: SceneContextWithStep<object>) => Promise<void>>
  >;
  protected defaultHandlers = {
    [KeyboardCommands.ADD_QUIZ]: async (ctx: Scenes.SceneContext) => {
      await ctx.scene.enter(SceneNames.ADD_QUIZ);
    },
    [KeyboardCommands.BACK]: async (ctx: Scenes.SceneContext) => {
      await ctx.scene.enter(SceneNames.MAIN);
    },
    [KeyboardCommands.LOOK_RESULTS]: async (ctx: Scenes.SceneContext) => {
      await ctx.scene.enter(SceneNames.LOOK_RESULTS);
    },
  };

  @SceneEnter()
  async onEnter(@Ctx() ctx: Scenes.SceneContext) {
    await ctx.reply('🛠 Адмін панель:', {
      reply_markup: {
        keyboard: [
          [{ text: KeyboardCommands.ADD_QUIZ }],
          [{ text: KeyboardCommands.LOOK_RESULTS }],
          [{ text: KeyboardCommands.BACK }],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    });
  }

  @On('text')
  async onText(@Ctx() ctx: Scenes.SceneContext) {
    await this.handleText(ctx);
  }
}
