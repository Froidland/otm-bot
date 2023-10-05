import { SapphireClient, container } from "@sapphire/framework";
import "@sapphire/plugin-logger";
import { GatewayIntentBits } from "discord.js";
import db from "./db";
import { auth } from "osu-api-extended";
import { scheduler } from "./background-jobs";
import { SimpleIntervalJob } from "toad-scheduler";
import tryoutLobbyReminderTask from "./background-jobs/tasks/tryout-lobby-reminder";

async function bootstrap() {
	const client = new SapphireClient({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
		],
	});

	try {
		await auth.login(
			+process.env.OSU_CLIENT_ID!,
			process.env.OSU_CLIENT_SECRET!,
			["public"],
		);

		await client.login(process.env.BOT_TOKEN);

		await db.$connect();

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

		container.logger.info("Registered background jobs.");
	} catch (error) {
		container.logger.error(
			`There was an error while trying to start the bot. Reason: ${error}`,
		);

		process.exit(1);
	}
}

bootstrap();
