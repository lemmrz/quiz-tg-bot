import { Scene, SceneEnter, On, Ctx, Action } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { QuestionWithOptions, SceneNames } from '../bot.interfaces';
import { BotService } from '../bot.serivce';
import { BaseScene, SceneContextWithStep } from './base.scene';
import { QuizAttempt } from '@prisma/client';

enum PassTestStep {
  SELECT_QUIZ_BY_ID = 'SELECT_QUIZ_BY_ID',
  SELECT_QUIZ_BY_USERNAME = 'SELECT_QUIZ_BY_USERNAME',
  ASK_QUESTION = 'ASK_QUESTION',
  START_OR_LEAVE = 'START_OR_LEAVE',
  FINISH_TEST = '`FINISH_TEST',
  SELECT_CORRECT_ANSWER = 'SELECT_CORRECT_ANSWER',
}
interface PassTestSession {
  step?: PassTestStep;
  quizId?: number;
  currentQuestionIndex?: number;
  selectedAnswers?: Record<number, number>; // questionId -> optionId
  questions?: QuestionWithOptions[];
  quizAttempt?: QuizAttempt;
}
enum PassTestOptions {
  FIND_BY_ID = '🔍 Знайти тест за ID',
  FIND_BY_USERNAME = '🔍 Пошукати доступні тестування за @username',
  START_TEST = '✅ Так, почати тестування',
  BACK_TO_SELECTION = '❌ Ні, повернутися до вибору тесту',
  BACK_TO_MAIN = '🔙 Назад до головного меню',
}

@Scene(SceneNames.PASS_TEST)
export class PassTestScene extends BaseScene<PassTestSession, PassTestStep> {
  protected stepHandlers?: Partial<
    Record<
      PassTestStep,
      (ctx: SceneContextWithStep<PassTestSession>) => Promise<void>
    >
  > = {
    [PassTestStep.SELECT_QUIZ_BY_ID]: this.handleSelectQuizByIdStep.bind(this),
    [PassTestStep.SELECT_QUIZ_BY_USERNAME]:
      this.handleSelectQuizByUsername.bind(this),
    [PassTestStep.ASK_QUESTION]: this.askQuestion.bind(this),
    [PassTestStep.SELECT_CORRECT_ANSWER]: this.handleSaveAnswer.bind(this),
  };

  protected defaultHandlers: Record<
    string,
    (ctx: SceneContextWithStep<PassTestSession>) => Promise<void>
  > = {
    [PassTestOptions.FIND_BY_ID]: this.handleSelectQuizById.bind(this),
    [PassTestOptions.FIND_BY_USERNAME]:
      this.handleSelectQuizByUsername.bind(this),
    [PassTestOptions.START_TEST]: this.handleStartTest.bind(this),
    [PassTestOptions.BACK_TO_MAIN]: async (
      ctx: SceneContextWithStep<PassTestSession>,
    ) => {
      await ctx.scene.leave();
      ctx.session.stepData = null;
      await ctx.scene.enter(SceneNames.MAIN);
    },
  };
  constructor(private readonly botService: BotService) {
    super();
  }

  @SceneEnter()
  async onEnter(@Ctx() ctx: Scenes.SceneContext) {
    await ctx.reply(
      'Бажаєте знайти тест за ідентифікатором чи пошукати тестування за Вашим @username?',
      {
        reply_markup: {
          keyboard: [
            [{ text: PassTestOptions.FIND_BY_ID }],
            [{ text: PassTestOptions.FIND_BY_USERNAME }],
            [{ text: PassTestOptions.BACK_TO_MAIN }],
          ],

          resize_keyboard: true,
          one_time_keyboard: false,
        },
      },
    );
  }

  @Action(/^\d+:\d+$/) // Regex to match "questionId:optionId" format
  async onAnswerSelected(@Ctx() ctx: SceneContextWithStep<PassTestSession>) {
    await this.handleSaveAnswer(ctx);
  }

  @On('text')
  async onText(@Ctx() ctx: Scenes.SceneContext) {
    //console.log('onText', ctx.message);
    await this.handleText(ctx);
  }
  private async handleSelectQuizById(
    ctx: SceneContextWithStep<PassTestSession>,
  ) {
    console.log('handleSelectQuizById');
    await ctx.reply('Введіть ідентифікатор тесту, який хочете пройти:', {
      reply_markup: {
        remove_keyboard: true,
      },
    });
    ctx.session.stepData = {
      step: PassTestStep.SELECT_QUIZ_BY_ID,
    };
  }

  private async handleSelectQuizByIdStep(
    ctx: SceneContextWithStep<PassTestSession>,
  ) {
    console.log('handleSelectQuizByIdStep', ctx.message);
    const quizIdText = 'text' in ctx.message ? ctx.message.text : undefined;
    const quiz = await this.botService.getQuizById(Number(quizIdText));
    if (!quiz) {
      await ctx.reply('Тест не знайдено. Спробуйте ще раз.');
      return;
    }

    ctx.session.stepData.quizId = quiz.id;
    ctx.session.stepData.step = null;
    await ctx.reply(`Тест знайдено: ${quiz.title}. Готові почати?`, {
      reply_markup: {
        keyboard: [
          [{ text: PassTestOptions.START_TEST }],
          [{ text: PassTestOptions.BACK_TO_SELECTION }],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    });
  }

  private async handleSelectQuizByUsername(
    ctx: SceneContextWithStep<PassTestSession>,
  ) {
    await ctx.reply('Цей сценарій ще не реалізований.');
  }

  private async handleStartTest(ctx: SceneContextWithStep<PassTestSession>) {
    const quizId = ctx.session.stepData.quizId;
    if (!quizId) {
      await ctx.reply('Спочатку виберіть тест.');
      return;
    }

    const quiz = await this.botService.getQuizById(quizId);
    if (!quiz) {
      await ctx.reply('Тест не знайдено. Спробуйте ще раз.');
      return;
    }

    const questions = await this.botService.getQuestionsByQuizId(quiz.id);
    if (questions.length === 0) {
      await ctx.reply('Тест не містить запитань.');
      return;
    }
    const user = await this.botService.getUser(ctx.from.username);
    const quizAttempt = await this.botService.createQuizAttempt(
      quiz.id,
      user.id,
    );

    ctx.session.stepData.quizAttempt = quizAttempt;
    ctx.session.stepData.questions = questions;
    ctx.session.stepData.currentQuestionIndex = 0;
    ctx.session.stepData.selectedAnswers = {};
    ctx.session.stepData.step = PassTestStep.ASK_QUESTION;

    await this.askQuestion(ctx);
  }

  private async askQuestion(ctx: SceneContextWithStep<PassTestSession>) {
    console.log('askQuestion', ctx.session);
    const idx = ctx.session.stepData.currentQuestionIndex;
    const question = ctx.session.stepData.questions[idx];
    if (!question) {
      await this.botService.updateQuizAttempt(
        ctx.session.stepData.quizAttempt.id,
        new Date(),
        0,
        0,
      );
      const { correctAnswers, totalQuestions, duration } =
        await this.botService.calculateResultsForAttempt(
          ctx.session.stepData.quizAttempt.id,
        );
      await this.botService.updateQuizAttempt(
        ctx.session.stepData.quizAttempt.id,
        new Date(),
        correctAnswers,
        totalQuestions,
      );
      await ctx.reply(
        `Тест завершено. Ви відповіли на ${correctAnswers} з ${totalQuestions} запитань. Витрачений час: ${duration}.`,
        {
          reply_markup: {
            remove_keyboard: true,
          },
        },
      );
      await ctx.scene.leave();
      ctx.session.stepData = null;
      return;
    }
    ctx.session.stepData.step = PassTestStep.SELECT_CORRECT_ANSWER;
    const inlineKeyboard = question.QuestionOption.map((option) => ({
      text: option.answer,
      callback_data: `${question.id}:${option.id}`,
    }));
    await ctx.reply(
      `${ctx.session.stepData.currentQuestionIndex + 1}: ${question.question}`,
      {
        reply_markup: {
          inline_keyboard: inlineKeyboard.map((option) => [option]),
        },
      },
    );
  }

  private async handleSaveAnswer(ctx: SceneContextWithStep<PassTestSession>) {
    console.log('handleSaveAnswer', ctx);
    const data =
      'data' in ctx.callbackQuery ? ctx.callbackQuery.data.split(':') : [];
    if (data.length !== 2) {
      await ctx.reply('Невірний формат даних.');
      return;
    }
    const questionId = parseInt(data[0], 10);
    const optionId = parseInt(data[1], 10);

    if (!ctx.session.stepData.selectedAnswers) {
      ctx.session.stepData.selectedAnswers = {};
    }
    const quizAttempt = ctx.session.stepData.quizAttempt;
    await this.botService.createQuizAttemptAnswer(
      quizAttempt.id,
      questionId,
      optionId,
    );
    ctx.session.stepData.selectedAnswers[questionId] = optionId;
    ctx.reply('Відповідь збережена.');

    ctx.answerCbQuery();
    ctx.session.stepData.currentQuestionIndex! += 1;
    await this.askQuestion(ctx);
  }
}
