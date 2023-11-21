import { lobbyStore } from "../store";
import BanchoJs from "bancho.js";

type Entity = {
	player: BanchoJs.BanchoLobbyPlayer;
	slot: number;
	team: string;
};

export async function playerJoined(
	client: BanchoJs.BanchoClient,
	banchLobby: BanchoJs.BanchoLobby,
	entity: Entity,
) {
	const lobby = lobbyStore.find((l) => l.banchoId === banchLobby.id.toString());

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

	await banchLobby.kickPlayer(entity.player.user.username);
}
