import "@sapphire/plugin-hmr/register";
import "@sapphire/plugin-hmr";
import "@sapphire/plugin-logger/register";
import { LogLevel, SapphireClient, container } from "@sapphire/framework";
import { GatewayIntentBits } from "discord.js";
import db from "./db";
import { auth } from "osu-api-extended";
import { scheduler } from "./background-jobs";
import { SimpleIntervalJob } from "toad-scheduler";
import tryoutLobbyReminderTask from "./background-jobs/tasks/tryout-lobby-reminder";

const client = new SapphireClient({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
	hmr: {
		enabled: process.env.NODE_ENV === "development",
	},
	logger: {
		level:
			process.env.NODE_ENV === "development" ? LogLevel.Debug : LogLevel.Info,
	},
});

async function bootstrap() {
	try {
		await auth.login(
			+process.env.OSU_CLIENT_ID!,
			process.env.OSU_CLIENT_SECRET!,
			["public"],
		);

		await client.login(process.env.BOT_TOKEN);

		if (process.env.NODE_ENV === "development") {
			container.logger.info("Using PrismaClient with logging enabled.");

			db.$on("info", (e) => {
				container.logger.debug(e.message);
			});

			db.$on("warn", (e) => {
				container.logger.warn(e.message);
			});

			db.$on("query", (e) => {
				container.logger.debug(e.duration + "ms " + e.query);
			});

			db.$on("error", (e) => {
				container.logger.error(e.message);
			});
		}

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
