import { container } from "@sapphire/pieces";
import { BanchoCommand } from ".";
import { ongoingTryoutLobbies } from "../store";

export const panic: BanchoCommand = {
	name: "panic",
	aliases: [],
	description: "Pings the referee responsible for the lobby.",
	usage: "!panic",
	executeCM: async (client, event) => {
		const banchoId = event.channel.name.split("_")[1];

		const lobby = ongoingTryoutLobbies.find((l) => l.banchoId === banchoId);

		if (!lobby) {
			await event.channel.sendMessage(
				"This lobby is not set up as an automatic tryout lobby.",
			);

			return;
		}

		const player = lobby.players.find(
			(p) => p.osuUsername === event.user.ircUsername,
		);

		if (!player) {
			await event.channel.sendMessage(
				"You are not a part of this lobby.",
			);

			return;
		}

		if (!lobby.referee) {
			await event.channel.sendMessage(
				"No referee is assigned to this lobby. Pinging all referees...",
			);

			const staffDiscordChannel = await container.client.channels.fetch(
				lobby.staffChannelId,
			);

			if (!staffDiscordChannel || !staffDiscordChannel.isTextBased()) {
				await event.channel.sendMessage("Could not find the staff channel.");

				return;
			}

			// TODO: Ping the referee role with an embed containing the lobby info.
			await staffDiscordChannel.send("");

			return;
		}

		await event.channel.sendMessage(
			`Pinging ${lobby.referee?.osu_username}...`,
		);
	},
};
