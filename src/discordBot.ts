import { Client, Events, GatewayIntentBits } from "discord.js";
import { onInteraction, onReady } from "./events";
import { logger } from "./utils";

const DiscordBot = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

DiscordBot.once(Events.ClientReady, async (client) => {
	logger.info(`Logged in as ${client.user.tag}`);
	await onReady(client);
});

DiscordBot.on(Events.InteractionCreate, async (interaction) => {
	try {
		await onInteraction(interaction);
	} catch (error) {
		logger.error(`InteractionError: ${error}`);
	}
});

DiscordBot.on(Events.Error, async (error) => {
	logger.error(error.stack);

	if (error.name == "ConnectTimeoutError") {
		process.exit(1);
	}
});

export default DiscordBot;
