import db from "@/db";
import { container } from "@sapphire/pieces";
import BanchoJs from "bancho.js";
import { EmbedBuilder } from "discord.js";
import { lobbyStore } from "../store";
import {
	endLobby,
	getCurrentPlayers,
	getMissingPlayers,
	getModsString,
} from "../utils";

export async function timerEnd(
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

	switch (lobby.state) {
		case "initializing": {
			if (lobby.type === "tryout") {
				const missingPlayers = getMissingPlayers(banchoLobby.channel, lobby);

				if (missingPlayers.length > 0) {
					if (
						missingPlayers.length === lobby.players.length &&
						lobby.initialOvertime
					) {
						await db.tryoutLobby.update({
							where: {
								id: lobby.id,
							},
							data: {
								status: "Skipped",
							},
						});

						await endLobby(lobby, banchoLobby, true);

						return;
					}

					for (const player of missingPlayers) {
						const banchoUser = client.getUser(player.osuUsername);

						await banchoUser.sendMessage(
							"The match is about to start, please join the lobby.",
						);
					}

					await banchoLobby.startTimer(180);
					await banchoLobby.channel.sendMessage(
						"Waiting 3 more minutes for players to join...",
					);

					lobby.state = "overtime";
					lobby.initialOvertime = true;

					break;
				}

				await banchoLobby.startMatch(5);
				lobby.state = "playing";
			}

			if (lobby.type === "qualifier") {
				const players = getCurrentPlayers(banchoLobby.channel, lobby);

				if (players.length !== lobby.inLobbyPlayerCount) {
					await banchoLobby.channel.sendMessage(
						`You must have ${lobby.inLobbyPlayerCount} players in the lobby to start the match. You have 60 seconds to remove players, otherwise the map will be skipped.`,
					);
					await banchoLobby.startTimer(60);

					lobby.state = "overtime";
					lobby.initialOvertime = true;
				}
			}

			break;
		}
		case "waiting": {
			if (lobby.type === "tryout") {
				const missingPlayers = getMissingPlayers(banchoLobby.channel, lobby);

				if (missingPlayers.length > 0) {
					for (const player of missingPlayers) {
						const banchoUser = client.getUser(player.osuUsername);

						await banchoLobby.invitePlayer(`#${player.osuId}`);
						await banchoUser.sendMessage(
							"The match is about to start, please join the lobby.",
						);
					}

					await banchoLobby.startTimer(60);
					lobby.state = "overtime";

					break;
				}
			}

			if (lobby.type === "qualifier") {
				const players = getCurrentPlayers(banchoLobby.channel, lobby);

				if (players.length !== lobby.inLobbyPlayerCount) {
					await banchoLobby.channel.sendMessage(
						`You must have ${lobby.inLobbyPlayerCount} players in the lobby to start the match. You have 30 seconds to remove players, otherwise the map will be skipped.`,
					);

					await banchoLobby.startTimer(30);
					lobby.state = "overtime";

					break;
				}
			}

			await banchoLobby.startMatch(5);

			break;
		}
		case "overtime": {
			if (lobby.type === "tryout") {
				await banchoLobby.startMatch(5);
				lobby.state = "playing";
			}

			if (lobby.type === "qualifier") {
				await banchoLobby.channel.sendMessage("Skipping map...");

				const staffChannel = await container.client.channels.fetch(
					lobby.staffNotifChannelId,
				);

				const nextPick = lobby.mappoolQueue.shift();

				if (!nextPick) {
					lobby.state = "finished";

					await db.tournamentQualifierLobby.update({
						where: {
							id: lobby.id,
						},
						data: {
							status: "Completed",
						},
					});

					await banchoLobby.channel.sendMessage(
						"You have finished the mappool, you are now free to leave the lobby. The lobby will close in 2 minutes.",
					);

					await banchoLobby.startTimer(120);

					return;
				}

				const map = lobby.mappool.find((m) => m.pickId === nextPick);

				if (!map) {
					lobby.state = "errored";

					container.logger.error(
						`Failed to find next map in mappool for lobby ${lobby.id} (#mp_${lobby.banchoId}).`,
					);

					if (staffChannel?.isTextBased()) {
						let embedDescription =
							"Could not find next map in mappool after overtime.\n";
						embedDescription += `**Bancho channel:** \`#mp_${lobby.banchoId}\`\n`;
						embedDescription += `**MP Link:** (${lobby.banchoId})[https://osu.ppy.sh/community/matches/${lobby.banchoId}]`;

						try {
							await staffChannel.send({
								embeds: [
									new EmbedBuilder()
										.setColor("Red")
										.setTitle(
											`Error in qualifier lobby for team \`${lobby.teamName}\``,
										)
										.setDescription(embedDescription),
								],
							});

							await banchoLobby.channel.sendMessage(
								"An error has occured, a staff member has been notified.",
							);
						} catch (error) {
							container.logger.error(
								`Failed to send error embed to staff channel for lobby ${lobby.id} (#mp_${lobby.banchoId}).`,
							);

							await banchoLobby.channel.sendMessage(
								"An error has occured, please contact a staff member.",
							);
						}
					}

					return;
				}

				const skippedMap =
					lobby.mappoolHistory[lobby.mappoolHistory.length - 1];

				await banchoLobby.setMap(map.beatmapId);
				await banchoLobby.setMods(getModsString(map.mods));

				lobby.mappoolHistory.push(map);

				await banchoLobby.startTimer(120);
				lobby.state = "waiting";

				if (staffChannel?.isTextBased()) {
					let embedDescription = `Pick ${skippedMap?.pickId} was skipped due to overtime.\n`;
					embedDescription += `**Bancho channel:** \`#mp_${lobby.banchoId}\`\n`;
					embedDescription += `**MP Link:** (${lobby.banchoId})[https://osu.ppy.sh/community/matches/${lobby.banchoId}]`;

					try {
						await staffChannel.send({
							embeds: [
								new EmbedBuilder()
									.setColor("Red")
									.setTitle(
										`Action taken in qualifier lobby for team \`${lobby.teamName}\``,
									)
									.setDescription(embedDescription),
							],
						});

						await banchoLobby.channel.sendMessage(
							"An error has occured, a staff member has been notified.",
						);
					} catch (error) {
						container.logger.error(
							`Failed to send error embed to staff channel for lobby ${lobby.id} (#mp_${lobby.banchoId}).`,
						);

						await banchoLobby.channel.sendMessage(
							"An error has occured, please contact a staff member.",
						);
					}
				}
			}

			break;
		}
		case "finished": {
			await endLobby(lobby, banchoLobby);

			break;
		}
		default: {
			await banchoLobby.startMatch(5);

			lobby.state = "playing";
			break;
		}
	}
}
