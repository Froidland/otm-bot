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
	tournamentQualifierReminderScheduleQueue,
	tournamentQualifierCreateQueue,
	initializeTryoutLobbyReminderSendWorker,
} from "./processing";
import BanchoJs from "bancho.js";
import { registerBanchoEvents } from "./bancho/events";
import { tryoutLobbyCreateQueue } from "./processing/queues/tryoutLobbyCreateQueue";
import { initializeTournamentQualifierReminderSendWorker } from "./processing/workers/tournamentQualifierReminderSendWorker";
import { initializeTournamentQualifierCreateWorker } from "./processing/workers/tournamentQualifierCreateWorker";

// Discord client setup
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
// ---------------------------

// Bancho client setup
const banchoClient = new BanchoJs.BanchoClient({
	username: process.env.BANCHO_USERNAME!,
	password: process.env.BANCHO_PASSWORD!,
	apiKey: process.env.BANCHO_API_KEY!,
});
// ---------------------------

// TODO: Rate limiting.
// TODO: Graceful shutdown.
async function bootstrap() {
	try {
		// osu! API setup
		await auth.login(
			+process.env.OSU_CLIENT_ID!,
			process.env.OSU_CLIENT_SECRET!,
			["public"],
		);
		container.logger.info("Logged in to osu! API.");
		// ---------------------------

		container.logger.info("Logging in to Discord and Bancho...");

		// Discord connection
		await discordClient.login(process.env.BOT_TOKEN);
		// ---------------------------

		// Bancho connection
		await registerBanchoEvents(banchoClient);
		await banchoClient.connect();
		container.bancho = banchoClient;

		container.logger.info(
			`Connected to Bancho as ${banchoClient.getSelf().ircUsername}.`,
		);
		// ---------------------------

		// Database setup
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
		// ---------------------------

		container.logger.info("Registering background jobs...");
		// Tryout lobby queues
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
				minutes: 5, // check for lobbies in the next 5 minutes
			},
			{
				repeat: {
					every: 1000 * 60, // 1 minute
				},
			},
		);
		// ---------------------------

		// Tournament qualifier queues
		await tournamentQualifierReminderScheduleQueue.add(
			"tournamentQualifierReminderSchedule",
			{
				minutes: 15, // check for lobbies in the next 15 minutes
			},
			{
				repeat: {
					every: 1000 * 60, // 1 minute
				},
			},
		);

		await tournamentQualifierCreateQueue.add(
			"tournamentQualifierCreate",
			{
				minutes: 5, // check for lobbies in the next 5 minutes
			},
			{
				repeat: {
					every: 1000 * 60, // 1 minute
				},
			},
		);
		// ---------------------------
		container.logger.info("Successfully registered background jobs.");

		container.logger.info("Starting background workers...");
		// Tryout lobby workers
		initializeTryoutLobbyReminderSendWorker();
		initializeTryoutLobbyReminderScheduleWorker();
		initializeTryoutLobbyCreateWorker();
		// --------------------

		// Tournament qualifier workers
		initializeTournamentQualifierReminderSendWorker();
		initializeTryoutLobbyReminderScheduleWorker();
		initializeTournamentQualifierCreateWorker();
		// ----------------------------
		container.logger.info("Successfully started background workers.");
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
