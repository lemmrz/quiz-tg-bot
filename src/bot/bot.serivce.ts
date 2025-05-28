import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Question,
  QuestionOption,
  Quiz,
  QuizAttempt,
  QuizAttemptAnswer,
  User,
} from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { QuestionWithOptions } from './bot.interfaces';

@Injectable()
export class BotService {
  constructor(private prismaService: PrismaService) {}

  async registerUser(fullName: string, userName: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        userName,
      },
    });

    if (user) {
      console.log('User already exists');
      return user;
    }

    return this.prismaService.user.create({
      data: {
        fullName,
        userName,
      },
    });
  }

  async getUser(userName: string): Promise<User | null> {
    return this.prismaService.user.findFirst({
      where: {
        userName,
      },
    });
  }

  async createQuiz(name: string, userId: number): Promise<Quiz> {
    return this.prismaService.quiz.create({
      data: {
        title: name,
        createdBy: userId,
      },
    });
  }

  async createQuestion(
    quizId: number,
    questionText: string,
  ): Promise<Question> {
    return this.prismaService.question.create({
      data: {
        quizId,
        question: questionText,
      },
    });
  }

  async createOptions(
    questionId: number,
    options: Partial<QuestionOption>[],
  ): Promise<Prisma.BatchPayload> {
    return this.prismaService.questionOption.createMany({
      data: options.map((option) => ({
        questionId,
        answer: option.answer,
        isCorrect: option.isCorrect || false,
      })),
    });
  }

  async getOptionsByQuestionId(questionId: number): Promise<QuestionOption[]> {
    return this.prismaService.questionOption.findMany({
      where: {
        questionId,
      },
    });
  }

  async markOptionAsCorrect(optionId: number): Promise<QuestionOption> {
    return this.prismaService.questionOption.update({
      where: {
        id: optionId,
      },
      data: {
        isCorrect: true,
      },
    });
  }

  async getQuizById(quizId: number): Promise<Quiz | null> {
    return this.prismaService.quiz.findUnique({
      where: {
        id: quizId,
      },
    });
  }

  async getQuestionsByQuizId(quizId: number): Promise<QuestionWithOptions[]> {
    return this.prismaService.question.findMany({
      where: {
        quizId,
      },
      include: {
        QuestionOption: true,
      },
    });
  }

  async createQuizAttempt(
    quizId: number,
    userId: number,
  ): Promise<QuizAttempt> {
    return this.prismaService.quizAttempt.create({
      data: {
        quizId,
        userId,
      },
    });
  }

  async updateQuizAttempt(
    quizAttemptId: number,
    finishedAt: Date,
    correctAnswers: number,
    totalQuestions: number,
  ): Promise<QuizAttempt> {
    return this.prismaService.quizAttempt.update({
      where: {
        id: quizAttemptId,
      },
      data: {
        finishedAt,
        correctAnswers,
        totalQuestions,
      },
    });
  }

  async createQuizAttemptAnswer(
    quizAtemptId: number,
    questionId: number,
    questionOptionId: number,
  ): Promise<QuizAttemptAnswer> {
    return this.prismaService.quizAttemptAnswer.create({
      data: {
        quizAtemptId,
        questionId,
        questionOptionId,
      },
    });
  }

  async calculateResultsForAttempt(quizAttemptId: number): Promise<{
    correctAnswers: number;
    totalQuestions: number;
    duration: string;
  }> {
    // Fetch the quiz attempt with startedAt and finishedAt
    const quizAttempt = await this.prismaService.quizAttempt.findUnique({
      where: {
        id: quizAttemptId,
      },
      select: {
        startedAt: true,
        finishedAt: true,
      },
    });

    if (!quizAttempt || !quizAttempt.finishedAt) {
      throw new Error('Quiz attempt not found or not finished.');
    }

    // Use the utility function to calculate the duration
    const duration = this.calculateTimeDifference(quizAttempt);

    // Fetch the quiz attempt answers
    const quizAttemptAnswers =
      await this.prismaService.quizAttemptAnswer.findMany({
        where: {
          quizAtemptId: quizAttemptId,
        },
        include: {
          QuestionOption: true,
        },
      });

    // Calculate correct answers and total questions
    const correctAnswers = quizAttemptAnswers.filter(
      (answer) => answer.QuestionOption.isCorrect,
    ).length;
    const totalQuestions = quizAttemptAnswers.length;

    return {
      correctAnswers,
      totalQuestions,
      duration,
    };
  }

  private calculateTimeDifference(quizAttempt: {
    startedAt: Date;
    finishedAt: Date;
  }): string {
    const durationMs =
      quizAttempt.finishedAt.getTime() - quizAttempt.startedAt.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);
    const durationSeconds = Math.floor((durationMs % 60000) / 1000);
    return `${durationMinutes}m ${durationSeconds}s`;
  }

  async getQuizzesByUserId(userId: number): Promise<Quiz[]> {
    return this.prismaService.quiz.findMany({
      where: {
        createdBy: userId,
      },
    });
  }

  async getResultsByQuizId(quizId: number): Promise<
    {
      user: User;
      correctAnswers: number;
      totalQuestions: number;
      startedAt: Date;
      finishedAt: Date;
      duration: string;
    }[]
  > {
    const quizAttempts = await this.prismaService.quizAttempt.findMany({
      where: {
        quizId,
      },
      include: {
        User: true,
      },
    });

    return quizAttempts.map((attempt) => {
      const duration = this.calculateTimeDifference({
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
      });

      return {
        user: attempt.User,
        correctAnswers: attempt.correctAnswers,
        totalQuestions: attempt.totalQuestions,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
        duration,
      };
    });
  }
}
