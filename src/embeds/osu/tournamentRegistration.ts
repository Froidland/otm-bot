import { TournamentType } from "@/commands/tournament";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	MessageCreateOptions,
} from "discord.js";

type TournamentEmbedData = {
	tournamentName: string;
	type: TournamentType;
};

const joinTeamVsTeamButton = new ButtonBuilder()
	.setCustomId("joinTeamVsTeamTournamentButton")
	.setLabel("Create team")
	.setStyle(ButtonStyle.Primary);

const leaveTeamVsTeamButton = new ButtonBuilder()
	.setCustomId("leaveTeamVsTeamTournamentButton")
	.setLabel("Leave")
	.setStyle(ButtonStyle.Danger);

const joinOneVsOneTournamentButton = new ButtonBuilder()
	.setCustomId("joinOneVsOneTournamentButton")
	.setLabel("Join")
	.setStyle(ButtonStyle.Primary);

const leaveOneVsOneTournamentButton = new ButtonBuilder()
	.setCustomId("leaveOneVsOneTournamentButton")
	.setLabel("Leave")
	.setStyle(ButtonStyle.Danger);

const teamVsTeamActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	joinTeamVsTeamButton,
	leaveTeamVsTeamButton,
);

const oneVsOneActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	joinOneVsOneTournamentButton,
	leaveOneVsOneTournamentButton,
);

// TODO: Add a button to obtain the tournament's role if the user doesn't have it.
export const tournamentRegistration = (
	data: TournamentEmbedData,
): MessageCreateOptions => {
	return {
		embeds: [
			new EmbedBuilder()
				.setColor("Blue")
				.setTitle(`${data.tournamentName}`)
				.setDescription(
					"Click the buttons below to join or leave the tournament. Once the registration period ends, you will no longer be able to leave or join.",
				),
		],
		components:
			data.type === "OneVsOne" ? [oneVsOneActionRow] : [teamVsTeamActionRow],
	};
};
