import { TryoutLobby } from "@/bancho/store";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	MessageCreateOptions,
} from "discord.js";
import { DateTime } from "luxon";

const addRefButton = new ButtonBuilder()
	.setCustomId("addRefTryoutLobbyButton")
	.setLabel("Add ref")
	.setStyle(ButtonStyle.Primary);

const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	addRefButton,
);

export const staffAutoTryoutLobbyEmbed = (
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
	).toFormat("DDDD T")}\`\n\n`;

	embedDescription += "**Players:** \n";

	for (const player of lobby.players) {
		embedDescription += `\\- <@${player.discordId}> (\`${player.osuUsername}\` - \`#${player.osuId}\`)\n`;
	}

	return {
		content:
			lobby.referees.length > 0
				? `<@${lobby.referees[0].discordId}>`
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
