import { isMemberTournamentStaff } from "@/commands/utils";
import db, { TournamentStage } from "@/db";
import {
	InvalidDateTime,
	InvalidTournamentChannel,
	NoAccountEmbed,
} from "@/embeds";
import { NoStaffRole } from "@/embeds/errors/no-staff-role";
import { SubCommand } from "@/interfaces/subCommand";
import { logger } from "@/utils";
import { createId } from "@paralleldrive/cuid2";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { DateTime } from "luxon";

// TODO: Currently working on this.

const create: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("create")
		.setDescription("Creates a match between two teams.")
		.addStringOption((option) =>
			option
				.setName("custom-id")
				.setDescription(
					'The custom ID of the match. Example: "A12" (Has to be unique for the tournament)'
				)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("schedule")
				.setDescription(
					'The schedule of the match in UTC. Format: "YYYY-MM-DD HH:MM"'
				)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("red-team")
				.setDescription("The unique ID of the first team in the match.")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("blue-team")
				.setDescription("The unique ID of the second team in the match.")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("stage")
				.setDescription("The stage of the match.")
				.addChoices(
					{
						name: "Group Stage",
						value: "Groups",
					},
					{
						name: "Round of 256",
						value: "RoundOf256",
					},
					{
						name: "Round of 128",
						value: "RoundOf128",
					},
					{
						name: "Round of 64",
						value: "RoundOf64",
					},
					{
						name: "Round of 32",
						value: "RoundOf32",
					},
					{
						name: "Round of 16",
						value: "RoundOf16",
					},
					{
						name: "Quarterfinals",
						value: "Quarterfinals",
					},
					{
						name: "Semifinals",
						value: "Semifinals",
					},
					{
						name: "Finals",
						value: "Finals",
					},
					{
						name: "Grand Finals",
						value: "GrandFinals",
					}
				)
				.setRequired(true)
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();
		const id = createId();

		const user = await db.user.findFirst({
			where: {
				discordId: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		const redTeamId = interaction.options.getString("red-team", true);
		const blueTeamId = interaction.options.getString("blue-team", true);

		if (redTeamId === blueTeamId) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid team IDs.")
						.setDescription(
							"The team IDs you provided are the same. Please provide different team IDs."
						),
				],
			});

			return;
		}

		const customId = interaction.options.getString("custom-id", true);

		const tournament = await db.tournament.findFirst({
			where: {
				staffChannelId: interaction.channelId,
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [InvalidTournamentChannel],
			});

			return;
		}

		if (!isMemberTournamentStaff(interaction, tournament)) {
			await interaction.editReply({
				embeds: [NoStaffRole],
			});
		}

		const redTeam = await db.team.findFirst({
			where: {
				id: redTeamId,
				tournament: {
					staffChannelId: interaction.channelId,
				},
			},
		});

		if (!redTeam) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid team ID.")
						.setDescription(
							"The team ID you provided for the red team is invalid or the team is not participating in this tournament."
						),
				],
			});

			return;
		}

		const blueTeam = await db.team.findFirst({
			where: {
				id: blueTeamId,
				tournament: {
					staffChannelId: interaction.channelId,
				},
			},
		});

		if (!blueTeam) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid team ID.")
						.setDescription(
							"The team ID you provided for the blue team is invalid or the team is not participating in this tournament."
						),
				],
			});

			return;
		}

		const stage = interaction.options.getString(
			"stage",
			true
		) as TournamentStage;

		const schedule = DateTime.fromFormat(
			interaction.options.getString("schedule", true),
			"yyyy-MM-dd HH:mm",
			{ zone: "utc" }
		);

		if (!schedule.isValid) {
			await interaction.editReply({
				embeds: [InvalidDateTime],
			});

			return;
		}

		let embedDescription = `**__Match info__**\n`;
		embedDescription += `**Custom ID:** ${customId}\n`;
		embedDescription += `**Tournament:** ${tournament.name}\n`;
		embedDescription += `**Stage:** ${stage}\n`;
		embedDescription += `**Schedule:** ${schedule.toRFC2822()}\n`;
		embedDescription += `**Red team:** ${redTeam.name}\n`;
		embedDescription += `**Blue team:** ${blueTeam.name}\n`;

		try {
			await db.match.create({
				data: {
					id,
					customId,
					schedule: schedule.toJSDate(),
					tournament: {
						connect: {
							id: tournament.id,
						},
					},
					redTeam: {
						connect: {
							id: redTeam.id,
						},
					},
					blueTeam: {
						connect: {
							id: blueTeam.id,
						},
					},
					stage,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Match created!")
						.setDescription(embedDescription)
						.setFooter({
							text: `Unique ID: ${id}`,
						}),
				],
			});

			logger.info(`Match ${id} created by ${interaction.user.id}.`);
		} catch (error) {
			logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("DB error!")
						.setDescription(
							"There was an error while creating the match. Please try again later."
						),
				],
			});
		}
	},
};

export default create;
