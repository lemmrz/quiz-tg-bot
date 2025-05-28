import { Scene, SceneEnter, Ctx, Action } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { BotService } from '../bot.serivce';
import { SceneNames } from '../bot.interfaces';

@Scene(SceneNames.LOOK_RESULTS)
export class LookResultsScene {
  constructor(private botService: BotService) {}

  @SceneEnter()
  async onEnter(@Ctx() ctx: Scenes.SceneContext) {
    const currentUser = await this.botService.getUser(ctx.from.username);
    if (!currentUser) {
      await ctx.reply('Користувача не знайдено.');
      return;
    }

    const quizzes = await this.botService.getQuizzesByUserId(currentUser.id);
    if (quizzes.length === 0) {
      await ctx.reply('У вас немає створених тестів.');
      await ctx.scene.leave();
      return;
    }

    const inlineKeyboard = quizzes.map((quiz) => ({
      text: quiz.title,
      callback_data: `select_quiz_${quiz.id}`,
    }));

    await ctx.reply('Оберіть тест для перегляду результатів:', {
      reply_markup: {
        inline_keyboard: inlineKeyboard.map((quiz) => [quiz]),
      },
    });
  }

  @Action(/^select_quiz_(\d+)$/)
  async onSelectQuiz(@Ctx() ctx: Scenes.SceneContext) {
    const callbackQuery = ctx.callbackQuery as any;
    const quizId = Number(callbackQuery.data.split('_')[2]);

    const results = await this.botService.getResultsByQuizId(quizId);
    if (results.length === 0) {
      await ctx.reply('Результати для цього тесту відсутні.');
      return;
    }

    // Create a list of results
    let resultMessage = `Результати для обраного тесту:\n\n`;

    for (const result of results) {
      resultMessage += `👤 *Користувач*: ${result.user.fullName} ${result.user.userName}\n`;
      resultMessage += `✅ *Правильні відповіді*: ${result.correctAnswers}\n`;
      resultMessage += `❓ *Всього запитань*: ${result.totalQuestions}\n`;
      resultMessage += `🕒 *Дата початку*: ${result.startedAt.toLocaleString()}\n`;
      resultMessage += `🕒 *Дата завершення*: ${result.finishedAt.toLocaleString()}\n`;
      resultMessage += `⏳ *Тривалість*: ${result.duration}\n`;
      resultMessage += `\n-----------------------------\n\n`;
    }

    // Send the formatted message
    await ctx.replyWithMarkdown(resultMessage);
  }
}
