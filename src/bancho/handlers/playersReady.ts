import { MultiplayerEventHandler } from ".";
import { getMissingPlayers } from "../utils";

export const playersReady: MultiplayerEventHandler = {
	regex: /^All players are ready$/,
	execute: async (client, event, lobby) => {
		const missingPlayers = getMissingPlayers(event.channel, lobby);

		if (missingPlayers.length > 0) {
			return;
		}

		if (lobby.state === "finished") {
			return;
		}

		await event.channel.sendMessage("!mp start 5");
		lobby.state = "playing";
	},
};
