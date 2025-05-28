// src/bot/scenes/base.scene.ts
import { Scenes } from 'telegraf';

export type SceneContextWithStep<TSession> = Scenes.SceneContext & {
  session: { stepData: TSession };
};

export abstract class BaseScene<
  TSession extends { step?: TStep },
  TStep extends string,
> {
  /**
   * Step-specific handlers (e.g., step = 'ENTER_NAME')
   */
  protected abstract stepHandlers?: Partial<
    Record<TStep, (ctx: SceneContextWithStep<TSession>) => Promise<void>>
  >;

  /**
   * Global handlers (outside of step flow). Each key = message text to match.
   */
  protected defaultHandlers: Record<
    string,
    (ctx: SceneContextWithStep<TSession>) => Promise<void>
  > = {};

  /**
   * Main handler invoked on each 'text' update.
   */
  async handleText(ctx: Scenes.SceneContext & { session: any }) {
    const stepData = ctx.session.stepData as TSession | undefined;
    const step = stepData?.step;

    let messageText: string | undefined = undefined;
    if ('text' in ctx.message) {
      messageText = ctx.message.text;
    }

    // 1. Step-specific handler
    if (step && this.stepHandlers?.[step]) {
      await this.stepHandlers[step](ctx as SceneContextWithStep<TSession>);
      return;
    }

    // 2. Global/default handler
    if (messageText && this.defaultHandlers?.[messageText]) {
      await this.defaultHandlers[messageText](
        ctx as SceneContextWithStep<TSession>,
      );
      return;
    }

    // 3. Fallback
    await this.handleDefault(ctx, messageText);
  }

  /**
   * Fallback handler if no step or default handler matches.
   */
  protected async handleDefault(ctx: Scenes.SceneContext, text?: string) {
    await ctx.reply(`Невідома команда: ${text}`);
  }
}
