import BanchoJs from "bancho.js";
import { lobbyStore } from "../store";

type Entity = {
	player: BanchoJs.BanchoLobbyPlayer;
	slot: number;
	team: string;
};

export async function playerJoined(
	client: BanchoJs.BanchoClient,
	banchoLobby: BanchoJs.BanchoLobby,
	entity: Entity,
) {
	const lobby = lobbyStore.get(banchoLobby.id);

	if (!lobby) {
		return;
	}

	const player = lobby.players.find(
		(p) => p.osuUsername === entity.player.user.username,
	);

	if (player) {
		return;
	}

	const referee = lobby.referees.find(
		(r) => r.osuUsername === entity.player.user.username,
	);

	if (referee) {
		return;
	}

	await banchoLobby.kickPlayer(entity.player.user.username);
}
