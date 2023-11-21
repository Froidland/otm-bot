import { container } from "@sapphire/pieces";
import BanchoJs from "bancho.js";
import commands, { CommandError } from "../commands";

export async function message(
	client: BanchoJs.BanchoClient,
	banchoLobby: BanchoJs.BanchoLobby,
	message: BanchoJs.BanchoMessage,
) {
	container.logger.info(
		`[${banchoLobby.channel.name}] ${message.user.ircUsername}: ${message.content}`,
	);

	if (message.content[0] === "!") {
		// Reserved for BanchoBot multiplayer commands.
		if (message.content.startsWith("!mp")) {
			return;
		}

		try {
			await handleCmCommand(client, banchoLobby, message);
		} catch (error) {
			container.logger.error(error);

			if (error instanceof CommandError) {
				await banchoLobby.channel.sendMessage(error.message);
			}
		}

		return;
	}
}

async function handleCmCommand(
	client: BanchoJs.BanchoClient,
	lobby: BanchoJs.BanchoLobby,
	message: BanchoJs.BanchoMessage,
) {
	const commandName = message.content.split(" ")[0].slice(1);

	for (const command of commands) {
		if (command.name === commandName || command.aliases.includes(commandName)) {
			if (command.executeCM) {
				await command.executeCM(client, lobby, message);
			} else {
				throw new CommandError("This command can only be used in PMs!");
			}

			return;
		}
	}

	throw new CommandError("Command not found.");
}
