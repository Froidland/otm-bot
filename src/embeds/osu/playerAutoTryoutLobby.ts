import { AutoLobby } from "@/bancho/store";
import {
	ActionRowBuilder,
	ButtonStyle,
	EmbedBuilder,
	MessageCreateOptions,
} from "discord.js";
import { ButtonBuilder } from "discord.js";
import { DateTime } from "luxon";

const inviteButton = new ButtonBuilder()
	.setCustomId("inviteTryoutLobbyButton")
	.setLabel("Invite")
	.setStyle(ButtonStyle.Primary);

const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	inviteButton,
);

export const playerAutoTryoutLobbyEmbed = (
	lobby: AutoLobby,
): MessageCreateOptions => {
	let embedDescription = "**Details:**\n";
	embedDescription += `\\- **Lobby name:** \`${lobby.name}\`\n`;
	embedDescription += `\\- **Lobby ID:** \`${lobby.id}\`\n`;

	if (lobby.referees.length > 0) {
		embedDescription += `\\- **Referee:** <@${lobby.referees[0].discordId}>\n`;
	}

	embedDescription += `\\- **MP Link:** [${lobby.banchoId}](https://osu.ppy.sh/community/matches/${lobby.banchoId})\n`;
	embedDescription += `\\- **Schedule:** \`${DateTime.fromJSDate(
		new Date(lobby.schedule),
		{
			zone: "utc",
		},
	).toRFC2822()}\``;

	return {
		content:
			lobby.players.length > 0
				? lobby.players.map((p) => `<@${p.discordId}>`).join(", ")
				: undefined,
		embeds: [
			new EmbedBuilder()
				.setColor("Blue")
				.setTitle(`Lobby \`${lobby.customId}\` has been created.`)
				.setDescription(embedDescription),
		],
		components: [actionRow],
	};
};
