import { BanchoCommand } from ".";
import { lobbyStore } from "../store";

export const playerList: BanchoCommand = {
	name: "playerlist",
	aliases: ["players", "pl"],
	description: "Shows the current players in the lobby.",
	usage: "!players",
	executeCM: async (client, banchoLobby) => {
		const channel = banchoLobby.channel;

		const autoLobby = lobbyStore.get(banchoLobby.id);

		const players = [];

		for (const [key] of channel.channelMembers.entries()) {
			players.push(key);
		}

		await channel.sendMessage(`Current players: ${players.join(", ")}.`);
		if (autoLobby) {
			await channel.sendMessage(
				`Registered players: ${autoLobby.players
					.map((p) => p.osuUsername)
					.join(", ")}.`,
			);
		}
	},
};
