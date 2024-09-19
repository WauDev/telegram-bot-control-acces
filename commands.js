const fs = require('fs');
const path = require('path');

const dbFilePath = path.join(__dirname, 'database.json');
const commandsFilePath = path.join(__dirname, 'commands.json');

// Функция для чтения базы данных
function readDatabase() {
  if (fs.existsSync(dbFilePath)) {
    return JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
  }
  return { chats: {} };
}

// Функция для чтения команд
function readCommands() {
  if (fs.existsSync(commandsFilePath)) {
    return JSON.parse(fs.readFileSync(commandsFilePath, 'utf8'));
  }
  return { commands_list: { access_control: {} } };
}

// Функция для проверки доступа
function checkAccess(userLevel, command) {
  const commandsData = readCommands();
  const accessList = commandsData.commands_list.access_control;

  for (let level in accessList) {
    if (accessList[level].includes(command)) {
      return parseInt(level) <= userLevel;
    }
  }
  return false;
}

// Функция для получения команд для уровня пользователя
function getCommandsForLevel(userLevel) {
  const commandsData = readCommands();
  const accessList = commandsData.commands_list.access_control;
  let commands = [];

  for (let level in accessList) {
    if (parseInt(level) <= userLevel) {
      commands = commands.concat(accessList[level]);
    }
  }
  return commands;
}

// Функция для регистрации пользователя
function registerUser(chatId, userId) {
  const db = readDatabase();
  
  if (db.chats[chatId] && db.chats[chatId].users_id[userId]) {
    return "Вы уже зарегистрированы!";
  }

  if (db.chats[chatId]) {
    db.chats[chatId].users_id[userId] = {
      data_registation: new Date().toISOString(),
      user_first_name: "Имя пользователя", // Здесь должно быть реальное имя
      user_id: userId,
      access_control: 1
    };
    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2), 'utf8');
    return "Вы успешно зарегистрированы!";
  }
  
  return "Не удалось зарегистрировать пользователя.";
}

// Обработчик для команды /help
function getCommandLevel(chatId, userId) {
  const db = readDatabase();
  const user = db.chats[chatId]?.users_id[userId];
  const userLevel = user ? user.access_control : 0;
  const commands = getCommandsForLevel(userLevel);
  return commands.length > 0 ? `Доступные команды:\n${commands.join('\n')}` : "Нет доступных команд.";
}

// Объект команд
const commandHandlers = {
  '/register': registerUser,
  '/help': getCommandLevel
};

// Функция для обработки команд
function handleCommand(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const messageText = msg.text;

  if (messageText.startsWith('/')) {
    const command = messageText.split(' ')[0];
    const db = readDatabase();
    const user = db.chats[chatId]?.users_id[userId];
    const userLevel = user ? user.access_control : 0;

    if (checkAccess(userLevel, command)) {
      const handler = commandHandlers[command];
      if (handler) {
        const response = handler(chatId, userId);
        bot.sendMessage(chatId, response);
      } else {
        bot.sendMessage(chatId, "Неизвестная команда.");
      }
    } else {
      const commandsData = readCommands();
      const accessList = commandsData.commands_list.access_control;
      let requiredLevel = null;

      for (let level in accessList) {
        if (accessList[level].includes(command)) {
          requiredLevel = parseInt(level);
          break;
        }
      }

      if (requiredLevel !== null) {
        bot.sendMessage(chatId, `Данная команда доступна с уровня ${requiredLevel}\nВаш уровень на данный момент составляет: ${userLevel}`);
      } else {
        bot.sendMessage(chatId, "Неизвестная команда.");
      }
    }
  } else {
    bot.sendMessage(chatId, "Ошибка: Команда должна начинаться с '/'");
  }
}

// Экспортируем функции
module.exports = {
  handleCommand
};
