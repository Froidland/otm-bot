import { container } from "@sapphire/framework";
import BanchoJs from "bancho.js";
import commands, { CommandError } from "./commands";

export async function registerBanchoEvents(client: BanchoJs.BanchoClient) {
	client.on("PM", async (event) => {
		container.logger.debug(`[PM] ${event.user.ircUsername}: ${event.content}`);

		if (event.content[0] === "!") {
			if (event.content.startsWith("!mp")) {
				return;
			}

			try {
				await handlePmCommand(client, event);
			} catch (error) {
				container.logger.error(error);

				if (error instanceof CommandError) {
					await event.user.sendMessage(error.message);
				}
			}
		}
	});
}

async function handlePmCommand(
	client: BanchoJs.BanchoClient,
	event: BanchoJs.PrivateMessage,
) {
	const commandName = event.content.split(" ")[0].slice(1);

	for (const command of commands) {
		if (command.name === commandName || command.aliases.includes(commandName)) {
			if (command.executePM) {
				await command.executePM(client, event);
			} else {
				throw new CommandError(
					"This command can only be used in multiplayer channels!",
				);
			}

			return;
		}
	}

	throw new CommandError("Command not found.");
}
