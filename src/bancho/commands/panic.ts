import { container } from "@sapphire/pieces";
import { BanchoCommand } from ".";
import { ongoingTryoutLobbies } from "../store";
import { EmbedBuilder } from "discord.js";

export const panic: BanchoCommand = {
	name: "panic",
	aliases: [],
	description: "Pings the referee responsible for the lobby.",
	usage: "!panic",
	executeCM: async (client, event) => {
		const banchoId = event.channel.name.split("_")[1];

		const lobby = ongoingTryoutLobbies.find((l) => l.banchoId === banchoId);

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

		const staffDiscordChannel = await container.client.channels.fetch(
			lobby.staffChannelId,
		);

		if (!staffDiscordChannel || !staffDiscordChannel.isTextBased()) {
			await event.channel.sendMessage(
				"No staff channel was found. Please contact a staff member manually.",
			);

			return;
		}

		const mention = //? If there are no referees, ping the referee role.
			lobby.referees.length < 1
				? `<@&${lobby.refereeRoleId}>`
				: lobby.referees.map((r) => `<@${r.discordId}>`).join(" ");

		await event.channel.sendMessage(`Pinging referee...`);
		await staffDiscordChannel.send({
			content: mention,
			embeds: [
				new EmbedBuilder()
					.setColor("Red")
					.setTitle("Panic button pressed!")
					.setDescription(
						`Player <@${player.discordId}> (\`${player.osuUsername}\` - \`#${player.osuId}\`) is requesting help in lobby \`${lobby.customId}\`.`,
					),
			],
		});
	},
};
