import TelegramBot from 'node-telegram-bot-api';
import schedule from 'node-schedule';
import cronParser from 'cron-parser';

const reminders = new Map();

const sendGreeting = async (bot, chatId) => {
	const greeting = 'Welcome! Please choose a command:';
	const keyboard = [
		[
			{ text: 'Set a reminder', callback_data: 'reminder' },
		],
	];

	const replyMarkup = JSON.stringify({ inline_keyboard: keyboard });

	await bot.sendMessage(chatId, greeting, { reply_markup: replyMarkup });
};

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

			if (text === '/start') {
				await sendGreeting(bot, id);
			}

			const [command, ...args] = text.split(' ');

			if (command === '/set_reminder') {
				const [time, ...reminderText] = args;
				const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
				if (!timeRegex.test(time) || !reminderText.length) {
					await bot.sendMessage(id, 'Incorrect format. Example: /set_reminder 17:00 Pick up groceries');
					return response.send('OK');
				}

				const [hours, minutes] = time.split(':');
				const cronExpression = `0 ${minutes} ${hours} * * *`;

				const job = schedule.scheduleJob({ rule: cronExpression, tz: 'America/Sao_Paulo' }, async () => {
					await bot.sendMessage(id, `⏰ Reminder: ${reminderText.join(' ')}`);
					job.cancel();
					reminders.delete(id);
				});

				reminders.set(id, job);
				await bot.sendMessage(id, `✅ Reminder set for ${time}: "${reminderText.join(' ')}"`);

				return response.send('OK');
			} else if (command === '/cancel_reminder') {
				const job = reminders.get(id);

				if (job) {
					job.cancel();
					reminders.delete(id);
					await bot.sendMessage(id, '❌ Reminder canceled');
				} else {
					await bot.sendMessage(id, '⚠️ No active reminder found');
				}
			}
		} else if (body.callback_query) {
			const {
				callback_query: {
					id: callbackQueryId,
					data,
					from: { id: userId },
				},
			} = body;

			await bot.answerCallbackQuery(callbackQueryId);

			if (data === 'reminder') {
				await bot.sendMessage(userId, 'Please set a reminder, e.g., /set_reminder 17:00 Pick up groceries');
			}
		}
	} catch (error) {
		console.error('Error sending message');
		console.log(error.toString());
	}

	response.send('OK');
};
