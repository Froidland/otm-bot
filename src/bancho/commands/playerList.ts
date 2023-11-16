import { BanchoCommand } from ".";
import { banchoLobbies } from "../store";

export const players: BanchoCommand = {
	name: "playerlist",
	aliases: ["players", "pl"],
	description: "Shows the current players in the lobby.",
	usage: "!players",
	executeCM: async (client, event) => {
		const banchoChannel = event.channel;

		const autoLobby = banchoLobbies.find(
			(l) => l.banchoId === banchoChannel.name.split("_")[1],
		);

		const players = [];

		for (const [key] of banchoChannel.channelMembers.entries()) {
			players.push(key);
		}

		// TODO: Send players registered for the current lobby.
		await banchoChannel.sendMessage(`Current players: ${players.join(", ")}.`);
		if (autoLobby) {
			await banchoChannel.sendMessage(
				`Registered players: ${autoLobby.players
					.map((p) => p.osuUsername)
					.join(", ")}`,
			);
		}
	},
};
