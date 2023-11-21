import { BanchoCommand } from ".";
import { lobbyStore } from "../store";

export const history: BanchoCommand = {
	name: "history",
	aliases: ["hist"],
	description: "Shows the current pick history.",
	usage: "!history",
	executeCM: async (client, banchoLobby) => {
		const channel = banchoLobby.channel;

		const lobby = lobbyStore.get(banchoLobby.id);

		if (!lobby) {
			await channel.sendMessage(
				"This lobby is not set up as an automatic lobby.",
			);

			return;
		}

		const history = lobby.mappoolHistory;

		if (history.length < 1) {
			await channel.sendMessage(
				"No picks have been played yet, so there is nothing to show.",
			);

			return;
		}

		await channel.sendMessage(
			`Pick history: ${history.map((m) => m.pickId).join(", ")}.`,
		);
	},
};
