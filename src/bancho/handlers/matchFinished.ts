import db from "@/db";
import { MultiplayerEventHandler } from ".";
import { getModsString } from "../utils";

export const matchFinished: MultiplayerEventHandler = {
	regex: /^The match has finished!$/,
	execute: async (client, event, lobby) => {
		// TODO: For lobbies with 1 player, check whether we are withing a 30 second grace period in case the player accidentally pressed ESC.

		const nextPick = lobby.mappoolQueue.shift();

		if (!nextPick) {
			lobby.state = "finished";

			await db.tryoutLobby.update({
				where: {
					id: lobby.id,
				},
				data: {
					status: "Completed",
				},
			});

			await event.channel.sendMessage(
				"You have finished the mappool, you are now free to leave the lobby. The lobby will close in 2 minutes.",
			);

			await event.channel.sendMessage("!mp timer 120");

			return;
		}

		const map = lobby.mappool.find((m) => m.pickId === nextPick);

		if (!map) {
			lobby.state = "errored";
			await event.channel.sendMessage(
				"Failed to find next map in mappool. The referee has been notified.",
			);

			return;
		}

		lobby.state = "waiting";
		await event.channel.sendMessage(`!mp map ${map.beatmapId}`);
		await event.channel.sendMessage(`!mp mods ${getModsString(map.mods)}`);

		lobby.lastPick = {
			beatmapId: map.beatmapId,
			pickId: map.pickId,
			mods: map.mods,
			startedAt: null,
		};

		await event.channel.sendMessage("!mp timer 120");
	},
};
