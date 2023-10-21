import { MultiplayerEventHandler } from ".";

export const playerJoined: MultiplayerEventHandler = {
	regex: /^\S+ joined in slot \d+\.$/,
	execute: async (client, event, lobby) => {
		const [, username] =
			event.message.match(/^(\S+) joined in slot \d+\.$/) ?? [];

		if (!username) {
			return;
		}

		const player = lobby.players.find((p) => p.osuUsername === username);

		if (!player) {
			await event.channel.sendMessage(`!mp kick ${username}`);
		}
	},
};
