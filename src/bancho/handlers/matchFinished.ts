import db from "@/db";
import { container } from "@sapphire/pieces";
import BanchoJs from "bancho.js";
import { EmbedBuilder } from "discord.js";
import { lobbyStore } from "../store";
import { getModsString } from "../utils";

// TODO: For lobbies with 1 player, check whether we are withing a 30 second grace period in case the player accidentally pressed ESC.
export async function matchFinished(
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

	const nextPick = lobby.mappoolQueue.shift();

	if (!nextPick) {
		lobby.state = "finished";

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

		const notificationChannel = await container.client.channels.fetch(
			lobby.staffNotifChannelId,
		);

		if (notificationChannel?.isTextBased()) {
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

				await banchoLobby.channel.sendMessage(
					"Failed to find next map in mappool. Please contact a staff member.",
				);

				return;
			}
		}

		await banchoLobby.channel.sendMessage(
			"Failed to find next map in mappool. The referee has been notified.",
		);

		return;
	}

	await banchoLobby.setMap(map.beatmapId);

	if (banchoLobby.mods.join(" ") !== getModsString(map.mods)) {
		await banchoLobby.setMods(getModsString(map.mods));
	}

	lobby.mappoolHistory.push(map);
	lobby.currentStartedAt = null;

	await banchoLobby.startTimer(120);
	lobby.state = "waiting";
}
