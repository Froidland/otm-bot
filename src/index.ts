import { SapphireClient, container } from "@sapphire/framework";
import "@sapphire/plugin-logger";
import { GatewayIntentBits } from "discord.js";
import db from "./db";

async function bootstrap() {
	const client = new SapphireClient({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
		],
	});

	try {
		await client.login(process.env.BOT_TOKEN);

		await db.$connect();
	} catch (error) {
		container.logger.error(
			`There was an error while trying to start the bot. Reason: ${error}`,
		);

		process.exit(1);
	}
}

bootstrap();
