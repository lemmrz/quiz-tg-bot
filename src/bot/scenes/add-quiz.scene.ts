import { Scene, SceneEnter, Ctx, On, Action } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { SceneNames } from '../bot.interfaces';
import { BaseScene, SceneContextWithStep } from './base.scene';
import { BotService } from '../bot.serivce';
import { Question, QuestionOption } from '@prisma/client';
import { CallbackQuery } from 'telegraf/typings/core/types/typegram';

enum AddQuizOptions {
  MANUAL = '📝 Створити вручну',
  IMPORT = '📂 Імпортувати з файлу',
  FINISH_ADDING = '✅ Завершити додавання тесту',
  ADD_MORE_QUESTIONS = '➕ Додати ще питання',
}

enum CreateQuizStep {
  ENTER_NAME = 'ENTER_NAME',
  ADD_QUESTION = 'ADD_QUESTION',
  ADD_OPTIONS = 'ADD_OPTIONS',
  SELECT_CORRET_ANSWER = 'SELECT_CORRET_ANSWER',
  FINISH_OR_CONTINUE = 'FINISH_OR_CONTINUE',
  IMPORT_FILE = 'IMPORT_FILE',
}

interface CreateQuizSession {
  step?: CreateQuizStep;
  quizId?: number;
  currentQuestion?: Question;
  options?: string[];
}

@Scene(SceneNames.ADD_QUIZ)
export class AddQuizScene extends BaseScene<CreateQuizSession, CreateQuizStep> {
  constructor(private botService: BotService) {
    super();
  }
  /**
   * Step handlers (based on session.stepData.step)
   */
  protected stepHandlers = {
    [CreateQuizStep.ENTER_NAME]: this.handleEnterName.bind(this),
    [CreateQuizStep.ADD_QUESTION]: this.handleAddQuestion.bind(this),
    [CreateQuizStep.ADD_OPTIONS]: this.handleAddOptions.bind(this),
  };

  /**
   * Default command handlers (based on free text)
   */
  protected defaultHandlers = {
    [AddQuizOptions.MANUAL]: this.onManualCreate.bind(this),
    [AddQuizOptions.ADD_MORE_QUESTIONS]: this.handleMoreQuestions.bind(this),
    [AddQuizOptions.FINISH_ADDING]: this.handleFinishAdding.bind(this),
    [AddQuizOptions.IMPORT]: this.onImport.bind(this),
  };

  @SceneEnter()
  async onEnter(@Ctx() ctx: Scenes.SceneContext) {
    await ctx.reply('Оберіть спосіб створення тесту:', {
      reply_markup: {
        keyboard: [
          [{ text: AddQuizOptions.MANUAL }],
          [{ text: AddQuizOptions.IMPORT }],
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

  @Action(/^select_correct_(.+)$/)
  async onSelectCorrectAnswer(
    @Ctx() ctx: SceneContextWithStep<CreateQuizSession>,
  ) {
    const callbackQuery = ctx.callbackQuery as CallbackQuery;

    if (callbackQuery && 'data' in callbackQuery) {
      const dataQuery = callbackQuery as CallbackQuery.DataQuery;
      const optionId = Number(dataQuery.data.split('_')[2]);

      await this.botService.markOptionAsCorrect(optionId);

      await ctx.answerCbQuery('Правильну відповідь збережено.');
      await ctx.reply(
        'Правильну відповідь збережено. Додати ще запитання чи завершити додавання тесту?',
        {
          reply_markup: {
            keyboard: [
              [{ text: AddQuizOptions.ADD_MORE_QUESTIONS }],
              [{ text: AddQuizOptions.FINISH_ADDING }],
            ],
            resize_keyboard: true,
            one_time_keyboard: false,
          },
        },
      );
      ctx.session.stepData.currentQuestion = undefined;
      ctx.session.stepData.options = undefined;
      ctx.session.stepData.step = CreateQuizStep.FINISH_OR_CONTINUE;
    } else {
      await ctx.reply('Невірний формат callback-запиту.');
    }
  }

  private async onManualCreate(ctx: SceneContextWithStep<CreateQuizSession>) {
    ctx.session.stepData = {
      step: CreateQuizStep.ENTER_NAME,
    };
    await ctx.reply('Введіть назву тестування:');
  }

  private async handleEnterName(ctx: SceneContextWithStep<CreateQuizSession>) {
    const name = 'text' in ctx.message ? ctx.message.text : undefined;
    if (!name) {
      await ctx.reply('Будь ласка, введіть назву тестування.');
      return;
    }

    const currentUser = await this.botService.getUser(ctx.from.username);
    const quiz = await this.botService.createQuiz(name, currentUser.id);
    ctx.session.stepData.step = CreateQuizStep.ADD_QUESTION;
    ctx.session.stepData.quizId = quiz.id;

    await ctx.reply(
      `Назва "${name}" збережена. Тепер введіть перше запитання:`,
    );
  }

  private async handleAddQuestion(
    ctx: SceneContextWithStep<CreateQuizSession>,
  ) {
    const questionText = 'text' in ctx.message ? ctx.message.text : undefined;
    if (!questionText) {
      await ctx.reply('Будь ласка, введіть запитання.');
      return;
    }
    const quizId = ctx.session.stepData.quizId;
    const question = await this.botService.createQuestion(quizId, questionText);
    ctx.session.stepData.currentQuestion = question;
    ctx.session.stepData.step = CreateQuizStep.ADD_OPTIONS;

    await ctx.reply(
      `Запитання збережено. Тепер введіть варіанти відповідей (через крапку з комою ";"):`,
    );
  }

  private async handleAddOptions(ctx: SceneContextWithStep<CreateQuizSession>) {
    const optionsText = 'text' in ctx.message ? ctx.message.text : undefined;
    if (!optionsText) {
      await ctx.reply('Будь ласка, введіть варіанти відповідей.');
      return;
    }

    const parsedOptions = optionsText.split(';').map((option) => ({
      answer: option.trim(),
      isCorrect: false,
    }));

    const questionId = ctx.session.stepData.currentQuestion.id;
    await this.botService.createOptions(questionId, parsedOptions);
    const createdOptions =
      await this.botService.getOptionsByQuestionId(questionId);

    ctx.session.stepData.step = CreateQuizStep.SELECT_CORRET_ANSWER;
    ctx.session.stepData.options = createdOptions.map((opt) => opt.answer);

    const inlineKeyboard = createdOptions.map((opt: QuestionOption) => [
      {
        text: opt.answer,
        callback_data: `select_correct_${opt.id}`,
      },
    ]);

    await ctx.reply('Виберіть правильну відповідь:', {
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    });
  }

  private async handleMoreQuestions(
    ctx: SceneContextWithStep<CreateQuizSession>,
  ) {
    ctx.session.stepData.step = CreateQuizStep.ADD_QUESTION;
    await ctx.reply('Введіть наступне запитання:');
  }

  private async handleFinishAdding(
    ctx: SceneContextWithStep<CreateQuizSession>,
  ) {
    await ctx.reply(
      `Додавання тесту завершено. Пошук тестування доступний за ідентифікатором: ${
        ctx.session.stepData.quizId
      }`,
    );
    ctx.session.stepData = {
      step: undefined,
      quizId: undefined,
      currentQuestion: undefined,
      options: undefined,
    };
    await ctx.scene.enter(SceneNames.ADMIN_PANEL);
  }

  private async onImport(ctx: SceneContextWithStep<CreateQuizSession>) {
    // Prompt the user to upload a JSON file
    await ctx.reply('Будь ласка, завантажте файл у форматі JSON.');

    // Set the session step to handle the file upload
    ctx.session.stepData = {
      step: CreateQuizStep.IMPORT_FILE,
    };
  }

  @On('document')
  private async onFileUpload(ctx: SceneContextWithStep<CreateQuizSession>) {
    // Check if the current step is IMPORT_FILE
    if (ctx.session.stepData?.step !== CreateQuizStep.IMPORT_FILE) {
      return; // Ignore file uploads if not in the correct step
    }

    const fileId =
      'document' in ctx.message && 'file_id' in ctx.message.document
        ? ctx.message.document.file_id
        : undefined;

    if (!fileId) {
      await ctx.reply('Будь ласка, завантажте файл у форматі JSON.');
      return;
    }

    try {
      // Fetch the file content
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const fileContent = await fetch(fileLink.href).then((res) => res.text());

      // Parse the JSON file
      const quizData = JSON.parse(fileContent);

      // Validate JSON structure
      if (!quizData.quizName || !Array.isArray(quizData.questions)) {
        await ctx.reply('Невірний формат JSON.');
        return;
      }

      // Create Quiz
      const currentUser = await this.botService.getUser(ctx.from.username);
      const quiz = await this.botService.createQuiz(
        quizData.quizName,
        currentUser.id,
      );

      // Create Questions and Options
      for (const question of quizData.questions) {
        if (!question.questionText || !Array.isArray(question.options)) {
          continue; // Skip invalid questions
        }

        const createdQuestion = await this.botService.createQuestion(
          quiz.id,
          question.questionText,
        );

        const options = question.options.map((option) => ({
          questionId: createdQuestion.id,
          answer: option.answer,
          isCorrect: option.isCorrect || false,
        }));

        await this.botService.createOptions(createdQuestion.id, options);
      }

      await ctx.reply(
        `Тест "${quizData.quizName}" успішно імпортовано. Тест доступний за ідентифікатором: ${quiz.id}`,
      );
      ctx.session.stepData = null; // Clear the session step
      ctx.scene.enter(SceneNames.ADMIN_PANEL); // Return to the admin panel
    } catch (error) {
      await ctx.reply(
        'Помилка при обробці файлу. Перевірте формат JSON.' + error,
      );
    }
  }
}
