import { lobbyStore } from "../store";
import { getCurrentPlayers, getMissingPlayers } from "../utils";
import BanchoJs from "bancho.js";

export async function allPlayersReady(
	client: BanchoJs.BanchoClient,
	banchoLobby: BanchoJs.BanchoLobby,
) {
	const lobby = lobbyStore.get(banchoLobby.id);

	if (!lobby) {
		return;
	}

	if (
		lobby.state === "override" ||
		lobby.state === "errored" ||
		lobby.state === "panicked"
	) {
		return;
	}

	if (lobby.type === "tryout") {
		const missingPlayers = getMissingPlayers(banchoLobby.channel, lobby);

		if (missingPlayers.length > 0) {
			return;
		}
	}

	if (lobby.type === "qualifier") {
		const players = getCurrentPlayers(banchoLobby.channel, lobby);

		if (players.length !== lobby.inLobbyPlayerCount) {
			return;
		}
	}

	if (lobby.state === "finished") {
		return;
	}

	await banchoLobby.startMatch(5);
	lobby.state = "playing";
}
