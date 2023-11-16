import db from "@/db";
import { MultiplayerEventHandler } from ".";
import { getModsString } from "../utils";
import { container } from "@sapphire/pieces";
import { EmbedBuilder } from "discord.js";

export const matchFinished: MultiplayerEventHandler = {
	regex: /^The match has finished!$/,
	execute: async (client, event, lobby) => {
		// TODO: For lobbies with 1 player, check whether we are withing a 30 second grace period in case the player accidentally pressed ESC.

		const nextPick = lobby.mappoolQueue.shift();

		if (!nextPick) {
			lobby.state = "finished";

			if (lobby.type === "tryout") {
				await db.tryoutLobby.update({
					where: {
						id: lobby.id,
					},
					data: {
						status: "Completed",
					},
				});
			}

			if (lobby.type === "qualifier") {
				await db.tournamentQualifierLobby.update({
					where: {
						id: lobby.id,
					},
					data: {
						status: "Completed",
					},
				});
			}

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

			const notificationChannel = await container.client.channels.fetch(
				lobby.staffNotifChannelId,
			);

			if (notificationChannel && notificationChannel.isTextBased()) {
				let embedDescription = "Could not find next map in mappool.\n";
				embedDescription += `**Bancho channel:** \`#mp_${lobby.banchoId}\`\n`;
				embedDescription += `**MP Link:** (${lobby.banchoId})[https://osu.ppy.sh/community/matches/${lobby.banchoId}]`;

				try {
					await notificationChannel.send({
						embeds: [
							new EmbedBuilder()
								.setColor("Red")
								.setTitle(
									lobby.type === "tryout"
										? `Error in tryout lobby \`${lobby.customId}\``
										: `Error in qualifier lobby for team \`${lobby.teamName}\``,
								)
								.setDescription(embedDescription),
						],
					});
				} catch (error) {
					container.logger.error(error);

					await event.channel.sendMessage(
						"Failed to find next map in mappool. Please contact a staff member.",
					);

					return;
				}
			}

			await event.channel.sendMessage(
				"Failed to find next map in mappool. The referee has been notified.",
			);

			return;
		}

		await event.channel.sendMessage(`!mp map ${map.beatmapId}`);
		await event.channel.sendMessage(`!mp mods ${getModsString(map.mods)}`);

		lobby.mappoolHistory.push(map);
		lobby.currentStartedAt = null;

		await event.channel.sendMessage("!mp timer 120");
		lobby.state = "waiting";
	},
};
