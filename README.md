# OLX Engagement Bot

Telegram-бот для управления OLX-объявлениями и запуска автоматизированной вовлеченности через браузерную автоматизацию.

## Что реализовано

- Telegram-бот на Telegraf
- PostgreSQL + Prisma
- Redis + BullMQ
- Playwright + управление сессиями
- шифрование cookies через AES-256-GCM
- проверка URL и SSRF-защита
- роли USER/ADMIN
- rate limiting
- внутренняя система заданий со статусами
- русскоязычный интерфейс и inline-кнопки
- отчеты по задачам и статистике

## Ограничения OLX

OLX не предоставляет общественное API для лайков, просмотра телефона или массового взаимодействия в рамках официального публичного API. Внутри проекта выделен адаптер `OlxEngagementAdapter`, который пытается автоматизировать действия через браузер с обычной страницей объявления. Если OLX изменил DOM или селекторы, бот возвращает понятное предупреждение вместо ложного успеха.

## Быстрый старт

### 1. Установка зависимостей

```powershell
cd C:\Users\Пользователь\Desktop\bot
npm install
```

### 2. Настройка окружения

```powershell
Copy-Item .env.example .env
notepad .env
```

Заполните `BOT_TOKEN`, `DATABASE_URL`, `REDIS_URL` и `COOKIE_ENCRYPTION_KEY`.

### 3. Запустить весь проект через Docker

```powershell
docker compose up --build -d
docker compose logs -f bot
```

Команда запускает PostgreSQL, Redis и бота в Docker. Бот подключается к контейнерам по внутренним адресам Docker-сети; порты для локального подключения к базе данных и Redis — `5433` и `6380`.

### 4. Prisma

```powershell
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Запуск в development

```powershell
npm run dev
```

### 6. Production build

```powershell
npm run build
npm run start
```

## Команды бота

- `/start` — главное меню
- `/add_listing` — добавить объявление
- `/check_listing` — проверить объявление
- `/my_tasks` — список задач
- `/stats` — статистика
- `/sessions` — сессии
- `/settings` — настройки

## Подключение сессии OLX

В меню «Мои сессии» выберите один из способов:

- **Импорт cookies-файла:** сохраните cookies в JSON локально и выполните `npm run session:connect -- <Telegram ID> "C:\path\cookies.json"`.
- **Локальный браузер:** выполните `npm run session:connect -- <Telegram ID>`. Скрипт откроет браузер Playwright; войдите на OLX вручную и подтвердите сохранение клавишей Enter в PowerShell. Пароль не передаётся боту.

Запускайте команду на компьютере с проектом и доступным Docker PostgreSQL (хостовый порт `5433`). Для первого запуска локального браузера установите Chromium командой `npx playwright install chromium`. Cookies сохраняются в PostgreSQL зашифрованными; бот не запрашивает пароль в чате. Новые задачи добавления объявления используют последнюю активную сессию пользователя.

## Windows PowerShell: установка и запуск

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
cd C:\Users\Пользователь\Desktop\bot
npm install
Copy-Item .env.example .env
notepad .env
docker compose up --build -d
docker compose logs -f bot
```

## Docker Compose

Compose запускает бота, PostgreSQL и Redis. Перед запуском настройте действительный `BOT_TOKEN` и надёжный `COOKIE_ENCRYPTION_KEY` в `.env`. Остановка: `docker compose down`; сохранённые данные останутся в Docker volumes. Для просмотра логов: `docker compose logs -f bot`.

## Структура проекта

```text
olx-engagement-bot/
├── src/
│   ├── bot/
│   │   ├── commands/
│   │   ├── keyboards/
│   │   └── middleware/
│   ├── browser/
│   │   ├── browser.manager.ts
│   │   └── session.manager.ts
│   ├── modules/
│   │   ├── listings/
│   │   ├── tasks/
│   │   ├── reports/
│   │   └── users/
│   ├── queues/
│   ├── database/
│   ├── config/
│   ├── utils/
│   └── index.ts
├── prisma/
│   └── schema.prisma
├── tests/
├── .env.example
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Безопасность

- проверка Telegram User ID
- роли USER/ADMIN
- шифрование cookies через AES-256-GCM
- запрет логирования токенов и секретов
- проверка URL против SSRF
- rate limiting
- безопасное хранение BOT_TOKEN
- изоляция данных разных пользователей
- graceful shutdown

## Разработка

После каждого этапа запускайте:

```powershell
npm run build
npm test
```

## Лицензия

MIT
