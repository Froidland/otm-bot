import { MultiplayerEventHandler } from ".";
import { getCurrentPlayers, getMissingPlayers } from "../utils";

export const playersReady: MultiplayerEventHandler = {
	regex: /^All players are ready$/,
	execute: async (client, event, lobby) => {
		if (lobby.type === "tryout") {
			const missingPlayers = getMissingPlayers(event.channel, lobby);

			if (missingPlayers.length > 0) {
				return;
			}
		}

		if (lobby.type === "qualifier") {
			const players = getCurrentPlayers(event.channel, lobby);

			if (players.length !== lobby.inLobbyPlayerCount) {
				return;
			}
		}

		if (lobby.state === "finished") {
			return;
		}

		await event.channel.sendMessage("!mp start 5");
		lobby.state = "playing";
	},
};
