import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	MessageCreateOptions,
} from "discord.js";

type TeamPlayer = {
	id: string;
	osu_id: string;
	osu_username: string;
	discord_id: string | null;
	discord_username: string | null;
	created_at: Date;
	updated_at: Date;
};

type TeamInviteData = {
	tournamentName: string;
	captainDiscordId: string;
	captainOsuUsername: string;
	captainOsuId: string;
	teamName: string;
	players: TeamPlayer[];
};

const acceptInvite = new ButtonBuilder()
	.setCustomId("acceptTeamInviteButton")
	.setLabel("Accept")
	.setStyle(ButtonStyle.Success);

const declineInvite = new ButtonBuilder()
	.setCustomId("declineTeamInviteButton")
	.setLabel("Decline")
	.setStyle(ButtonStyle.Danger);

const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	acceptInvite,
	declineInvite,
);

export const tournamentTeamInvite = (
	data: TeamInviteData,
): MessageCreateOptions => {
	const embedDescription = `<@${data.captainDiscordId}> (\`${data.captainOsuUsername}\` - \`#${data.captainOsuId}\`) has invited you to join their team \`${data.teamName}\` for the \`${data.tournamentName}\` tournament. Click the buttons below to accept or decline the invite. You can also ignore this message in order to not receive any more invites for this team.`;
	const teamMemberList = data.players
		.map(
			(player) =>
				`<@${player.discord_id}> (\`${player.osu_username}\` - \`#${player.osu_id}\`)`,
		)
		.join("\n");

	return {
		embeds: [
			new EmbedBuilder()
				.setColor("Blue")
				.setTitle(`${data.captainOsuUsername} has invited you to join a team`)
				.setDescription(embedDescription)
				.setFields([
					{
						name: "Current team members",
						value: teamMemberList,
					},
				]),
		],
		components: [actionRow],
	};
};
