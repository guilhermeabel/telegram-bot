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

const listReminders = async (bot, chatId, reminders) => {
	if (reminders.size === 0) {
		await bot.sendMessage(chatId, 'No reminders have been set.');
		return;
	}

	let reminderList = 'List of reminders:\n\n';
	let index = 1;

	for (const [userId, job] of reminders.entries()) {
		if (userId === chatId) {
			const nextInvocation = job.nextInvocation();
			const time = `${nextInvocation.getHours()}:${nextInvocation.getMinutes() < 10 ? '0' + nextInvocation.getMinutes() : nextInvocation.getMinutes()}`;
			reminderList += `${index}. Reminder at ${time}\n`;
			index++;
		}
	}

	await bot.sendMessage(chatId, reminderList);
};

const addReminder = async (bot, chatId, time, reminderText, reminders) => {
	const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
	if (!timeRegex.test(time) || !reminderText.length) {
		await bot.sendMessage(chatId, 'Incorrect format. Example: /set_reminder 17:00 Pick up groceries');
		return;
	}

	const [hours, minutes] = time.split(':');
	const now = new Date();
	const scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hours), parseInt(minutes), 0);

	if (scheduledTime < now) {
		scheduledTime.setDate(scheduledTime.getDate() + 1);
	}

	const job = schedule.scheduleJob(scheduledTime, async () => {
		await bot.sendMessage(chatId, `⏰ Reminder: ${reminderText.join(' ')}`);
		job.cancel();
		reminders.delete(chatId);
	});

	reminders.set(chatId, job);
	await bot.sendMessage(chatId, `✅ Reminder set for ${time}: "${reminderText.join(' ')}"`);
};


const cancelReminder = async (bot, chatId, reminders) => {
	const job = reminders.get(chatId);

	if (job) {
		job.cancel();
		reminders.delete(chatId);
		await bot.sendMessage(chatId, '❌ Reminder canceled');
	} else {
		await bot.sendMessage(chatId, '⚠️ No active reminder found');
	}
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

			if (command === '/list_reminders') {
				await listReminders(bot, id, reminders);
				return response.send('OK');
			}

			if (command === '/set_reminder') {
				await addReminder(bot, id, args[0], args.slice(1), reminders);
				return response.send('OK');
			}

			if (command === '/cancel_reminder') {
				await cancelReminder(bot, id, reminders);
				return response.send('OK');
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
