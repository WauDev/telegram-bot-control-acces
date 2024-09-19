const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Путь к базе данных
const dbFilePath = path.join(__dirname, 'database.json');
const commandsFilePath = path.join(__dirname, 'commands.json');

// Функция для чтения базы данных
function readDatabase() {
  if (fs.existsSync(dbFilePath)) {
    return JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
  }
  return { chats: {} };
}

// Функция для записи базы данных
function writeDatabase(data) {
  fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
}

// Функция для регистрации пользователя
function registerUser(chatId, userId, userFirstName) {
  const db = readDatabase();

  if (!db.chats[chatId]) {
    db.chats[chatId] = { users_id: {} };
  }

  if (db.chats[chatId].users_id[userId]) {
    return false; // Пользователь уже зарегистрирован
  }

  db.chats[chatId].users_id[userId] = {
    data_registation: "", // Дата регистрации не добавляется
    user_first_name: userFirstName,
    user_id: userId,
    access_control: 1 // Устанавливаем уровень 1 для новых пользователей
  };

  writeDatabase(db);
  return true;
}

// Обработчик сообщений
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userFirstName = msg.from.first_name || "Неизвестный отправитель";
  const messageText = msg.text;
  const chatType = msg.chat.type;

  // Определяем тип чата
  let chatTypeText;
  switch (chatType) {
    case 'private':
      // Игнорируем личные сообщения
      console.log(`Игнорируем личное сообщение: "${messageText}", отправитель: "${userFirstName}"`);
      return;
    case 'group':
      chatTypeText = 'группы';
      break;
    case 'supergroup':
      chatTypeText = 'супергруппы';
      break;
    case 'channel':
      chatTypeText = 'канала';
      break;
    default:
      chatTypeText = 'чата';
      break;
  }

  // Выводим информацию в консоль
  console.log(`Получено сообщение: "${messageText}", из "${chatTypeText}", отправитель: "${userFirstName}"`);

  // Регистрация нового пользователя
  if (chatType !== 'private') { // Игнорируем личные сообщения
    const userAdded = registerUser(chatId, userId, userFirstName);
    if (userAdded) {
      console.info(`Пользователь ${userFirstName} (${userId}) был добавлен в базу данных чата ${chatId} с уровнем 1.`);
    }
  }

  // Обрабатываем команды
  if (messageText.startsWith('/')) {
    const { handleCommand } = require('./commands');
    handleCommand(bot, msg);
  }
});
