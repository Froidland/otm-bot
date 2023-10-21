import { BanchoCommand } from ".";

export const players: BanchoCommand = {
	name: "playerlist",
	aliases: ["players", "pl"],
	description: "Shows the current players in the lobby.",
	usage: "!players",
	executeCM: async (client, event) => {
		const banchoChannel = event.channel;

		const players = [];

		for (const [key] of banchoChannel.channelMembers.entries()) {
			players.push(key);
		}

		// TODO: Send players registered for the current lobby.
		await banchoChannel.sendMessage(`Current players: ${players.join(", ")}.`);
	},
};
