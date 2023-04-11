import TelegramBot from 'node-telegram-bot-api';

export default async (request, response) => {
  try {
    const bot = new TelegramBot(process.env.TELEGRAM_API_TOKEN);
    const { body } = request;

    if (body.message) {
      const {
        message: {
          chat: { id },
          text,
        },
      } = body;

      const message = `✅ Message Received: \n*"${text}"*`;

      await bot.sendMessage(id, message, { parse_mode: 'Markdown' });
    }
  } catch (error) {

    console.error('Error sending message');
    console.log(error.toString());
  }

  response.send('OK');
};
