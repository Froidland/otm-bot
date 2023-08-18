import { Client, Events, GatewayIntentBits } from "discord.js";
import { auth } from "osu-api-extended";
import { logger } from "./utils/";
import { onInteraction, onReady } from "./events";

// TODO: Implement runtime checks for the environment variables. (Maybe use zod for this)
//? Take a look at https://github.com/lostfictions/znv
// TODO: Rate limiting.

async function bootstrap() {
	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
		],
	});

	client.once(Events.ClientReady, async (client) => {
		logger.info(`Logged in as ${client.user.tag}`);
		await onReady(client);
	});

	client.on(Events.InteractionCreate, async (interaction) => {
		try {
			await onInteraction(interaction);
		} catch (error) {
			logger.error(`InteractionError: ${error}`);
		}
	});

	client.on(Events.Error, async (error) => {
		logger.error(error.stack);

		if (error.name == "ConnectTimeoutError") {
			process.exit(1);
		}
	});

	try {
		// TODO: Consider using a different osu! api wrapper, could be osu.js or maybe implement my own.
		await auth.login(
			+process.env.OSU_CLIENT_ID!,
			process.env.OSU_CLIENT_SECRET!,
			["public"],
		);
		await client.login(process.env.BOT_TOKEN);
	} catch (error) {
		logger.error(
			`There was an error while trying to start the bot. Reason: ${error}`,
		);
		process.exit(1);
	}
}

bootstrap();
