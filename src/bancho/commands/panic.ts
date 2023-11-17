import { container } from "@sapphire/pieces";
import { BanchoCommand } from ".";
import { banchoLobbies } from "../store";
import { EmbedBuilder } from "discord.js";

export const panic: BanchoCommand = {
	name: "panic",
	aliases: [],
	description: "Pings the referee responsible for the lobby.",
	usage: "!panic",
	executeCM: async (client, event) => {
		const banchoId = event.channel.name.split("_")[1];

		const lobby = banchoLobbies.find((l) => l.banchoId === banchoId);

		if (!lobby) {
			await event.channel.sendMessage(
				"This lobby is not set up as an automatic tryout lobby.",
			);

			return;
		}

		const player = lobby.players.find(
			(p) => p.osuUsername === event.user.ircUsername,
		);

		if (!player) {
			await event.channel.sendMessage("You are not a part of this lobby.");

			return;
		}

		if (lobby.state === "finished") {
			await event.channel.sendMessage(
				"This lobby has finished, so you cannot panic.",
			);

			return;
		}

		lobby.state = "panicked";

		const notificationChannel = await container.client.channels.fetch(
			lobby.staffNotifChannelId,
		);

		if (!notificationChannel || !notificationChannel.isTextBased()) {
			await event.channel.sendMessage(
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

			await event.channel.sendMessage(
				"An error ocurred while panicking. Please contact a staff member manually.",
			);
		}
	},
};
