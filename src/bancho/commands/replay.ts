import { BanchoCommand } from ".";
import { banchoLobbies } from "../store";
import { getModsString } from "../utils";

export const replay: BanchoCommand = {
	name: "replay",
	aliases: ["rp"],
	description: "Replays a specific pick.",
	usage: "!replay <pickId>",
	executeCM: async (client, event) => {
		const banchoChannel = event.channel;

		const pickId = event.content.split(" ")[1];

		const lobby = banchoLobbies.find(
			(l) => l.banchoId === banchoChannel.name.split("_")[1],
		);

		if (!lobby) {
			await banchoChannel.sendMessage(
				"This lobby is not set up as an automatic lobby.",
			);

			return;
		}

		const referee = lobby.referees.find(
			(r) => r.osuUsername === event.user.ircUsername,
		);

		if (!referee) {
			await banchoChannel.sendMessage(
				"You are not assigned as a referee for this lobby.",
			);

			return;
		}

		if (lobby.state === "playing") {
			await banchoChannel.sendMessage(
				"You cannot replay a pick while the lobby is playing.",
			);

			return;
		}

		if (lobby.mappoolHistory.length < 1) {
			await banchoChannel.sendMessage(
				"No picks have been played yet, so there is nothing to replay",
			);

			return;
		}

		if (!pickId) {
			await banchoChannel.sendMessage(
				`Please provide a pick ID to replay. Options: ${lobby.mappoolHistory
					.map((m) => m.pickId)
					.join(", ")}.`,
			);

			return;
		}

		const map = lobby.mappoolHistory.find((m) => m.pickId === pickId);

		if (!map) {
			await banchoChannel.sendMessage(
				`Could not find a pick with ID ${pickId}. Options: ${lobby.mappoolHistory
					.map((m) => m.pickId)
					.filter((p, i, self) => self.indexOf(p) === i) // Remove duplicates
					.join(", ")}.`,
			);

			return;
		}

		await banchoChannel.sendMessage(`!mp map ${map.beatmapId}`);
		await banchoChannel.sendMessage(`!mp mods ${getModsString(map.mods)}`);
		await banchoChannel.sendMessage("!mp timer 120");

		lobby.state = "waiting";
	},
};
