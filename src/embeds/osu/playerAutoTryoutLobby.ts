import { TryoutLobby } from "@/bancho/store";
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
	lobby: TryoutLobby,
): MessageCreateOptions => {
	let embedDescription = "**Details:**\n";
	embedDescription += `\\- **Lobby name:** \`${lobby.name}\`\n`;

	// prettier-ignore
	embedDescription += `\\- **Referee:** ${
		lobby.referees.length > 0
			? "<@" + lobby.referees[0].discordId + "> (`" + lobby.referees[0].osuUsername + "` - `#" + lobby.referees[0].osuId + "`)"
			: "*None*"
	}\n`;

	embedDescription += `\\- **MP Link:** [${lobby.banchoId}](https://osu.ppy.sh/community/matches/${lobby.banchoId})\n`;
	embedDescription += `\\- **Schedule:** \`${DateTime.fromJSDate(
		new Date(lobby.schedule),
		{
			zone: "utc",
		},
	).toFormat("DDDD T")}\``;

	return {
		content:
			lobby.players.length > 0
				? lobby.players.map((p) => `<@${p.discordId}>`).join(", ")
				: undefined,
		embeds: [
			new EmbedBuilder()
				.setColor("Blue")
				.setTitle(`Auto tryout lobby \`${lobby.customId}\` has been created.`)
				.setDescription(embedDescription)
				.setFooter({
					text: `Unique ID: ${lobby.id}`,
				}),
		],
		components: [actionRow],
	};
};
