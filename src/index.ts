import "@sapphire/plugin-hmr";
import "@sapphire/pieces";
import { LogLevel, SapphireClient, container } from "@sapphire/framework";
import { GatewayIntentBits } from "discord.js";
import db from "./db";
import { auth } from "osu-api-extended";
import {
	initializeTryoutLobbyReminderScheduleWorker,
	initializeTryoutLobbyCreateWorker,
	tryoutLobbyReminderScheduleQueue,
} from "./processing";
import BanchoJs from "bancho.js";
import { registerBanchoEvents } from "./bancho/events";
import { tryoutLobbyCreateQueue } from "./processing/queues/tryoutLobbyCreateQueue";

const discordClient = new SapphireClient({
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

const banchoClient = new BanchoJs.BanchoClient({
	username: process.env.BANCHO_USERNAME!,
	password: process.env.BANCHO_PASSWORD!,
	apiKey: process.env.BANCHO_API_KEY!,
});

// TODO: Rate limiting.
// TODO: Graceful shutdown.
async function bootstrap() {
	try {
		await auth.login(
			+process.env.OSU_CLIENT_ID!,
			process.env.OSU_CLIENT_SECRET!,
			["public"],
		);

		await discordClient.login(process.env.BOT_TOKEN);

		await registerBanchoEvents(banchoClient);
		await banchoClient.connect();
		container.logger.info(
			`Connected to Bancho as ${banchoClient.getSelf().ircUsername}.`,
		);

		container.bancho = banchoClient;

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

		await tryoutLobbyReminderScheduleQueue.add(
			"tryoutLobbyReminderSchedule",
			{
				minutes: 15, // check for lobbies in the next 15 minutes
			},
			{
				repeat: {
					every: 1000 * 60, // 1 minute
				},
			},
		);

		await tryoutLobbyCreateQueue.add(
			"tryoutLobbyCreate",
			{
				minutes: 10,
			},
			{
				repeat: {
					every: 1000 * 60, // 1 minute
				},
			},
		);

		initializeTryoutLobbyReminderScheduleWorker();
		initializeTryoutLobbyCreateWorker();

		container.logger.info("Registered background jobs.");
	} catch (error) {
		container.logger.error(
			`There was an error while trying to start the bot. Reason: ${error}`,
		);

		process.exit(1);
	}
}

declare module "@sapphire/pieces" {
	interface Container {
		bancho: BanchoJs.BanchoClient;
	}
}

bootstrap();
