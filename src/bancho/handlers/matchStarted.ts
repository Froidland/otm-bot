import BanchoJs from "bancho.js";
import { lobbyStore } from "../store";

export async function matchStarted(
	client: BanchoJs.BanchoClient,
	banchoLobby: BanchoJs.BanchoLobby,
) {
	const lobby = lobbyStore.find(
		(l) => l.banchoId === banchoLobby.id.toString(),
	);

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

	lobby.currentStartedAt = new Date().toISOString();
}
