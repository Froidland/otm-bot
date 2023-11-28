import { container } from "@sapphire/pieces";
import { EmbedBuilder } from "discord.js";
import { BanchoCommand } from ".";
import { lobbyStore } from "../store";

export const panic: BanchoCommand = {
	name: "panic",
	aliases: [],
	description: "Pings the referee responsible for the lobby.",
	usage: "!panic",
	executeCM: async (client, banchoLobby, message) => {
		const channel = banchoLobby.channel;

		const lobby = lobbyStore.get(banchoLobby.id);

		if (!lobby) {
			await channel.sendMessage(
				"This lobby is not set up as an automatic lobby.",
			);

			return;
		}

		const player = lobby.players.find(
			(p) => p.osuUsername === message.user.ircUsername,
		);

		if (!player) {
			await channel.sendMessage("You are not a part of this lobby.");

			return;
		}

		if (lobby.state === "finished") {
			await channel.sendMessage(
				"This lobby has finished, so you cannot panic.",
			);

			return;
		}

		lobby.state = "panicked";

		const notificationChannel = await container.client.channels.fetch(
			lobby.staffNotifChannelId,
		);

		if (!notificationChannel || !notificationChannel.isTextBased()) {
			await channel.sendMessage(
				"No staff channel was found. Please contact a staff member manually.",
			);

			return;
		}

		const mention = //? If there are no referees, ping the referee role.
			lobby.referees.length < 1
				? `<@&${lobby.refereeRoleId}>`
				: lobby.referees.map((r) => `<@${r.discordId}>`).join(" ");

		try {
			if (lobby.type === "tryout") {
				await notificationChannel.send({
					content: mention,
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Panic button pressed!")
							.setDescription(
								`Player <@${player.discordId}> (\`${player.osuUsername}\` - \`#${player.osuId}\`) is requesting help in lobby \`${lobby.customId}\` (\`#mp_${lobby.banchoId}\`).`,
							),
					],
				});
			}

			if (lobby.type === "qualifier") {
				await notificationChannel.send({
					content: mention,
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Panic button pressed!")
							.setDescription(
								`Player <@${player.discordId}> (\`${player.osuUsername}\` - \`#${player.osuId}\`) is requesting help in the qualifier for team \`${lobby.teamName}\` (\`#mp_${lobby.banchoId}\`).`,
							),
					],
				});
			}
		} catch (error) {
			container.logger.error(error);

			await channel.sendMessage(
				"An error ocurred while panicking. Please contact a staff member manually.",
			);
		}
	},
};
