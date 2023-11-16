import db from "@/db";
import { MultiplayerEventHandler } from ".";
import {
	endLobby,
	getCurrentPlayers,
	getMissingPlayers,
	getModsString,
} from "../utils";
import { container } from "@sapphire/pieces";
import { EmbedBuilder } from "discord.js";

export const timerEnd: MultiplayerEventHandler = {
	regex: /^Countdown finished$/,
	execute: async (client, event, lobby) => {
		switch (lobby.state) {
			case "initializing": {
				if (lobby.type === "tryout") {
					const missingPlayers = getMissingPlayers(event.channel, lobby);

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

							await endLobby(lobby, event.channel, true);

							return;
						}

						for (const player of missingPlayers) {
							const banchoUser = client.getUser(player.osuUsername);

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
				}

				if (lobby.type === "qualifier") {
					const players = getCurrentPlayers(event.channel, lobby);

					if (players.length !== lobby.inLobbyPlayerCount) {
						await event.channel.sendMessage(
							`You must have ${lobby.inLobbyPlayerCount} players in the lobby to start the match. You have 60 seconds to remove players, otherwise the map will be skipped.`,
						);
						await event.channel.sendMessage("!mp timer 60");

						lobby.state = "overtime";
						lobby.initialOvertime = true;
					}
				}

				break;
			}
			case "waiting": {
				if (lobby.type === "tryout") {
					const missingPlayers = getMissingPlayers(event.channel, lobby);

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
				}

				if (lobby.type === "qualifier") {
					const players = getCurrentPlayers(event.channel, lobby);

					if (players.length !== lobby.inLobbyPlayerCount) {
						await event.channel.sendMessage(
							`You must have ${lobby.inLobbyPlayerCount} players in the lobby to start the match. You have 30 seconds to remove players, otherwise the map will be skipped.`,
						);

						await event.channel.sendMessage("!mp timer 30");
						lobby.state = "overtime";

						break;
					}
				}

				await event.channel.sendMessage("!mp start 5");

				break;
			}
			case "overtime": {
				if (lobby.type === "tryout") {
					await event.channel.sendMessage("!mp start 5");
					lobby.state = "playing";
				}

				if (lobby.type === "qualifier") {
					await event.channel.sendMessage("Skipping map...");

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

						await event.channel.sendMessage(
							"You have finished the mappool, you are now free to leave the lobby. The lobby will close in 2 minutes.",
						);

						await event.channel.sendMessage("!mp timer 120");

						return;
					}

					const map = lobby.mappool.find((m) => m.pickId === nextPick);

					if (!map) {
						lobby.state = "errored";

						container.logger.error(
							`Failed to find next map in mappool for lobby ${lobby.id} (#mp_${lobby.banchoId}).`,
						);

						if (staffChannel && staffChannel.isTextBased()) {
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

								await event.channel.sendMessage(
									"An error has occured, a staff member has been notified.",
								);
							} catch (error) {
								container.logger.error(
									`Failed to send error embed to staff channel for lobby ${lobby.id} (#mp_${lobby.banchoId}).`,
								);

								await event.channel.sendMessage(
									"An error has occured, please contact a staff member.",
								);
							}
						}

						return;
					}

					const skippedMap =
						lobby.mappoolHistory[lobby.mappoolHistory.length - 1];

					await event.channel.sendMessage(`!mp map ${map.beatmapId}`);
					await event.channel.sendMessage(
						`!mp mods ${getModsString(map.mods)}`,
					);

					lobby.mappoolHistory.push(map);

					await event.channel.sendMessage("!mp timer 120");
					lobby.state = "waiting";

					if (staffChannel && staffChannel.isTextBased()) {
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

							await event.channel.sendMessage(
								"An error has occured, a staff member has been notified.",
							);
						} catch (error) {
							container.logger.error(
								`Failed to send error embed to staff channel for lobby ${lobby.id} (#mp_${lobby.banchoId}).`,
							);

							await event.channel.sendMessage(
								"An error has occured, please contact a staff member.",
							);
						}
					}
				}

				break;
			}
			case "finished": {
				await endLobby(lobby, event.channel);

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
