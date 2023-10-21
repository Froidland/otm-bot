import { container } from "@sapphire/framework";
import BanchoJs from "bancho.js";
import commands, { CommandError } from "./commands";
import { ongoingTryoutLobbies } from "./store";
import { multiplayerEventHandlers } from "./handlers";

export async function registerBanchoEvents(client: BanchoJs.BanchoClient) {
	client.on("PM", async (event) => {
		container.logger.debug(`[PM] ${event.user.ircUsername}: ${event.content}`);

		if (event.content[0] === "!") {
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

	client.on("CM", async (event) => {
		container.logger.debug(
			`[${event.channel.name}] ${event.user.ircUsername}: ${event.content}`,
		);

		if (event.content[0] === "!") {
			try {
				await handleCmCommand(client, event);
			} catch (error) {
				container.logger.error(error);

				if (error instanceof CommandError) {
					await event.channel.sendMessage(error.message);
				}
			}

			return;
		}

		handleMultiplayerEvent(client, event);
	});
}

async function handlePmCommand(
	client: BanchoJs.BanchoClient,
	event: BanchoJs.PrivateMessage,
) {
	const commandName = event.content.split(" ")[0].slice(1);

	// Reserved for BanchoBot multiplayer commands.
	if (commandName === "mp") {
		return;
	}

	for (const command of commands) {
		if (command.name === commandName || command.aliases.includes(commandName)) {
			if (command.executePM) {
				await command.executePM(client, event);
			} else {
				throw new CommandError("This command can only be used in PMs!");
			}

			return;
		}
	}

	throw new CommandError("Command not found.");
}

async function handleCmCommand(
	client: BanchoJs.BanchoClient,
	event: BanchoJs.ChannelMessage,
) {
	const commandName = event.content.split(" ")[0].slice(1);

	// Reserved for BanchoBot multiplayer commands.
	if (commandName === "mp") {
		return;
	}

	for (const command of commands) {
		if (command.name === commandName || command.aliases.includes(commandName)) {
			if (command.executeCM) {
				await command.executeCM(client, event);
			} else {
				throw new CommandError("This command can only be used in channels!");
			}

			return;
		}
	}

	throw new CommandError("Command not found.");
}

async function handleMultiplayerEvent(
	client: BanchoJs.BanchoClient,
	event: BanchoJs.ChannelMessage,
) {
	if (event.user.ircUsername !== "BanchoBot") {
		return;
	}

	const banchoId = event.channel.name.split("_")[1];
	const tryoutLobby = ongoingTryoutLobbies.find((l) => l.banchoId === banchoId);

	if (tryoutLobby) {
		console.log(tryoutLobby);

		if (tryoutLobby.state === "override" || tryoutLobby.state === "errored") {
			return;
		}

		for (const eventHandler of multiplayerEventHandlers) {
			if (eventHandler.regex.test(event.content)) {
				eventHandler.execute(client, event, tryoutLobby);
			}
		}

		return;
	}
}
