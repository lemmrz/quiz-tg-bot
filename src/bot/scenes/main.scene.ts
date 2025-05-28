import { Scene, SceneEnter, On, Ctx } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { BotService } from '../bot.serivce';
import { KeyboardCommands, SceneNames } from '../bot.interfaces';
import { BaseScene, SceneContextWithStep } from './base.scene';

@Scene(SceneNames.MAIN)
export class MainScene extends BaseScene<object, never> {
  protected stepHandlers?: Partial<
    Record<never, (ctx: SceneContextWithStep<object>) => Promise<void>>
  >;
  constructor(private readonly botService: BotService) {
    super();
  }

  protected defaultHandlers = {
    [KeyboardCommands.PASS_TEST]: async (ctx: Scenes.SceneContext) => {
      await ctx.scene.enter(SceneNames.PASS_TEST);
    },
    [KeyboardCommands.ADMIN]: async (ctx: Scenes.SceneContext) => {
      await ctx.scene.enter(SceneNames.ADMIN_PANEL);
    },
  };

  @SceneEnter()
  async onEnter(@Ctx() ctx: Scenes.SceneContext) {
    const { first_name, last_name, username } = ctx.from!;
    const fullName = `${first_name} ${last_name || ''}`;
    await this.botService.registerUser(fullName, username);
    await ctx.reply('Оберіть опцію, щоб почати тестування:', {
      reply_markup: {
        keyboard: [
          [{ text: KeyboardCommands.PASS_TEST }],
          [{ text: KeyboardCommands.ADMIN }],
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
