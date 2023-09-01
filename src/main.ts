import { auth } from "osu-api-extended";
import { logger } from "./utils/";
import DiscordBot from "./discordBot";
import db from "./db";
import { scheduler } from "./jobs";
import { SimpleIntervalJob } from "toad-scheduler";
import tryoutLobbyReminderTask from "./jobs/tasks/tryout-lobby-reminder";

// TODO: Implement runtime checks for the environment variables. (Maybe use zod for this)
//? Take a look at https://github.com/lostfictions/znv
// TODO: Rate limiting.
// TODO: Graceful shutdown.

async function bootstrap() {
	try {
		// TODO: Consider using a different osu! api wrapper, could be osu.js or maybe implement my own.
		await auth.login(
			+process.env.OSU_CLIENT_ID!,
			process.env.OSU_CLIENT_SECRET!,
			["public"],
		);

		await DiscordBot.login(process.env.BOT_TOKEN);

		await db.$connect();

		// TODO: Use something like BullMQ to queue all the reminders and limit the concurrency.
		// TODO: Consider registering the jobs once the discord client is ready.
		scheduler.addSimpleIntervalJob(
			new SimpleIntervalJob(
				{
					minutes: 1,
				},
				tryoutLobbyReminderTask,
				{
					preventOverrun: true,
				},
			),
		);
		logger.info("Registered background jobs.");
	} catch (error) {
		logger.error(
			`There was an error while trying to start the bot. Reason: ${error}`,
		);
		process.exit(1);
	}
}

bootstrap();
