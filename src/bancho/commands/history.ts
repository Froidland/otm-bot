import { BanchoCommand } from ".";
import { banchoLobbies } from "../store";

export const history: BanchoCommand = {
	name: "history",
	aliases: ["hist"],
	description: "Shows the current pick history.",
	usage: "!history",
	executeCM: async (client, event) => {
		const banchoChannel = event.channel;

		const lobby = banchoLobbies.find(
			(l) => l.banchoId === banchoChannel.name.split("_")[1],
		);

		if (!lobby) {
			await banchoChannel.sendMessage(
				"This lobby is not set up as an automatic lobby.",
			);

			return;
		}

		const history = lobby.mappoolHistory;

		if (history.length < 1) {
			await banchoChannel.sendMessage(
				"No picks have been played yet, so there is nothing to show.",
			);

			return;
		}

		await banchoChannel.sendMessage(
			`Pick history: ${history.map((m) => m.pickId).join(", ")}.`,
		);
	},
};
