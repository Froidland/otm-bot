import { MultiplayerEventHandler } from ".";

export const matchStart: MultiplayerEventHandler = {
	regex: /^The match has started!$/,
	execute: async (client, event, lobby) => {
		if (lobby.lastPick) {
			lobby.lastPick.startedAt = new Date().toISOString();
		}
	},
};
