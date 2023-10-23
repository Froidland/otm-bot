import db from "@/db";
import { MultiplayerEventHandler } from ".";
import { /* endLobby, */ getMissingPlayers } from "../utils";

export const timerEnd: MultiplayerEventHandler = {
	regex: /^Countdown finished$/,
	execute: async (client, event, lobby) => {
		const missingPlayers = getMissingPlayers(event.channel, lobby);

		switch (lobby.state) {
			case "initializing": {
				if (missingPlayers.length > 0) {
					if (
						missingPlayers.length === lobby.players.length &&
						lobby.initialOvertime
					) {
						await event.channel.sendMessage("!mp close");

						await db.tryoutLobby.update({
							where: {
								id: lobby.id,
							},
							data: {
								status: "Skipped",
							},
						});

						break;
					}

					for (const player of missingPlayers) {
						const banchoUser = client.getUser(player.osuUsername);

						await event.channel.sendMessage(`!mp invite #${player.osuId}`);
						await banchoUser.sendMessage(
							"The match is about to start, please join the lobby.",
						);
					}

					await event.channel.sendMessage("!mp timer 180");
					await event.channel.sendMessage(
						"Waiting 3 more minutes for players to join...",
					);

					lobby.state = "overtime";
					lobby.initialOvertime = true;

					break;
				}

				await event.channel.sendMessage("!mp start 5");
				lobby.state = "playing";

				break;
			}
			case "waiting": {
				if (missingPlayers.length > 0) {
					for (const player of missingPlayers) {
						const banchoUser = client.getUser(player.osuUsername);

						await event.channel.sendMessage(`!mp invite #${player.osuId}`);
						await banchoUser.sendMessage(
							"The match is about to start, please join the lobby.",
						);
					}

					await event.channel.sendMessage("!mp timer 60");
					lobby.state = "overtime";

					break;
				}

				await event.channel.sendMessage("!mp start 5");

				break;
			}
			case "finished": {
				await event.channel.sendMessage("!mp close");
				// TODO: Handle proper finalization of the lobby (remove from ongoing lobbies, etc.)
				// await endLobby(lobby);

				break;
			}
			default: {
				await event.channel.sendMessage("!mp start 5");

				lobby.state = "playing";
				break;
			}
		}
	},
};
