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

// Функция для разделения команды и комментария
function parseCommand(commandString) {
  const parts = commandString.split(' - ');
  const command = parts[0].trim();
  const comment = parts.length > 1 ? parts[1].trim() : ''; // Комментарий может быть пустым
  return { command, comment };
}

// Функция для проверки доступа
function checkAccess(userLevel, command) {
  const commandsData = readCommands();
  const accessList = commandsData.commands_list.access_control;

  for (let level in accessList) {
    const commands = accessList[level];
    for (const commandString of commands) {
      const { command: cmd } = parseCommand(commandString);
      if (cmd === command) {
        return parseInt(level) <= userLevel;
      }
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
      const levelCommands = accessList[level];
      for (const commandString of levelCommands) {
        const { command, comment } = parseCommand(commandString);
        commands.push(`${command} - ${comment}`);
      }
    }
  }
  return commands;
}

// Функция для регистрации пользователя
function registerUser(chatId, userId, userFirstName) {
  const db = readDatabase();

  if (!db.chats[chatId]) {
    db.chats[chatId] = { users_id: {} };
  }

  if (db.chats[chatId].users_id[userId]) {
    return "Вы уже зарегистрированы!";
  }

  db.chats[chatId].users_id[userId] = {
    data_registation: "", // Дата регистрации не добавляется
    user_first_name: userFirstName,
    user_id: userId,
    access_control: 2 // Устанавливаем уровень 2 при регистрации
  };

  writeDatabase(db);
  return "Вы успешно зарегистрированы!";
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
        const commands = accessList[level];
        for (const commandString of commands) {
          const { command: cmd } = parseCommand(commandString);
          if (cmd === command) {
            requiredLevel = parseInt(level);
            break;
          }
        }
        if (requiredLevel !== null) break;
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
