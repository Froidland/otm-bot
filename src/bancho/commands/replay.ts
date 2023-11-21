import { BanchoCommand } from ".";
import { lobbyStore } from "../store";
import { getModsString } from "../utils";

export const replay: BanchoCommand = {
	name: "replay",
	aliases: ["rp"],
	description: "Replays a specific pick.",
	usage: "!replay <pickId>",
	executeCM: async (client, banchoLobby, message) => {
		const channel = banchoLobby.channel;

		const pickId = message.content.split(" ")[1];

		const lobby = lobbyStore.find(
			(l) => l.banchoId === channel.name.split("_")[1],
		);

		if (!lobby) {
			await channel.sendMessage(
				"This lobby is not set up as an automatic lobby.",
			);

			return;
		}

		const referee = lobby.referees.find(
			(r) => r.osuUsername === message.user.ircUsername,
		);

		if (!referee) {
			await channel.sendMessage(
				"You are not assigned as a referee for this lobby.",
			);

			return;
		}

		if (lobby.state === "playing") {
			await channel.sendMessage(
				"You cannot replay a pick while the lobby is playing.",
			);

			return;
		}

		if (lobby.mappoolHistory.length < 1) {
			await channel.sendMessage(
				"No picks have been played yet, so there is nothing to replay",
			);

			return;
		}

		if (!pickId) {
			await channel.sendMessage(
				`Please provide a pick ID to replay. Options: ${lobby.mappoolHistory
					.map((m) => m.pickId)
					.join(", ")}.`,
			);

			return;
		}

		const map = lobby.mappoolHistory.find((m) => m.pickId === pickId);

		if (!map) {
			await channel.sendMessage(
				`Could not find a pick with ID ${pickId}. Options: ${lobby.mappoolHistory
					.map((m) => m.pickId)
					.filter((p, i, self) => self.indexOf(p) === i) // Remove duplicates
					.join(", ")}.`,
			);

			return;
		}

		await banchoLobby.setMap(map.beatmapId);

		if (banchoLobby.mods.join(" ") !== getModsString(map.mods)) {
			await banchoLobby.setMods(getModsString(map.mods));
		}
		
		await banchoLobby.startTimer(120);

		lobby.state = "waiting";
	},
};
