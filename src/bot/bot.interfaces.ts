import { Question, QuestionOption } from '@prisma/client';

export enum KeyboardCommands {
  AVAILABLE_TESTS = 'Доступні тестування 🧪',
  START_TEST = 'Почати тестування 🏁',
  JOIN_TEST_BY_ID = 'Приєднатися до тестування за ID',
  CREATE_TEST = 'Створити тестування нове тестування 📝',
  ADMIN = 'Адмін панель 🛠',
  PASS_TEST = 'Пройти тест 🧪',
  TEST_RESULT = 'Результати тестування 📊',
  BACK = 'Назад 🔙',
  ADD_QUIZ = 'Додати тестування',
  LOOK_RESULTS = 'Переглянути результати тестування',
}

export enum SceneNames {
  ADD_QUIZ = 'add_quiz',
  MAIN = 'main',
  ADMIN_PANEL = 'admin_panel',
  PASS_TEST = 'pass_test',
  LOOK_RESULTS = 'look_results',
}

export type QuestionWithOptions = Question & {
  QuestionOption: QuestionOption[];
};
