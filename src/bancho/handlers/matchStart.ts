import { MultiplayerEventHandler } from ".";

export const matchStart: MultiplayerEventHandler = {
	regex: /^The match has started!$/,
	execute: async (client, event, lobby) => {
		lobby.currentStartedAt = new Date().toISOString();
	},
};
