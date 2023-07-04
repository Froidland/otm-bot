import {
	ChatInputCommandInteraction,
	CommandInteraction,
	EmbedBuilder,
	GuildMemberRoleManager,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "@/interfaces/command";
import db, { TournamentStage } from "@/db";
import { DateTime } from "luxon";
import { createId } from "@paralleldrive/cuid2";
import { logger } from "@/utils";

export const createMatch: Command = {
	data: new SlashCommandBuilder()
		.setName("create-match")
		.setDescription(
			"Creates a match for a tournament. (Staff Only, must be used inside the tournament's staff channel)"
		)
		.addStringOption((option) =>
			option
				.setName("custom-id")
				.setDescription('The custom ID of the match. Example: "A12"')
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
				.setName("stage")
				.setDescription("The stage of the match.")
				.addChoices(
					{
						name: "Tryouts",
						value: "Tryouts",
					},
					{
						name: "Qualifiers",
						value: "Qualifiers",
					},
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
		)
		.setDMPermission(false),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();
		const id = createId();

		const customId = interaction.options.getString("custom-id", true);
		const scheduleString = interaction.options.getString("schedule", true);
		const stage = interaction.options.get("stage", true)
			.value as TournamentStage;

		const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
		if (!dateRegex.test(scheduleString)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The schedule is not in the correct format. Please use the following format: `YYYY-MM-DD HH:MM`"
						),
				],
			});

			return;
		}

		const schedule = DateTime.fromFormat(scheduleString, "yyyy-MM-dd HH:mm", {
			zone: "utc",
		});

		if (schedule < DateTime.utc()) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You cannot create a lobby in the past."),
				],
			});

			return;
		}

		const user = await db.users.findOne({
			where: {
				discordId: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You don't have an account. Please use the `/link` command to link your osu! account."
						),
				],
			});

			return;
		}

		const tournament = await db.tournaments.findOne({
			where: {
				staffChannelId: interaction.channelId,
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This channel is not a staff channel for a tournament."
						),
				],
			});

			return;
		}

		const isUserStaff = (
			interaction.member?.roles as GuildMemberRoleManager
		).cache.some((role) => role.id === tournament.staffRoleId);

		if (!isUserStaff) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are not a staff member for this tournament."),
				],
			});

			return;
		}

		const existingLobby = await db.matches.findOne({
			where: [
				{
					tournament: {
						id: tournament.id,
					},
					customId,
				},
			],
		});

		if (existingLobby) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"A lobby with that custom ID already exists for this tournament."
						),
				],
			});

			return;
		}

		let embedDescription = `**__Lobby identification:__**\n`;
		embedDescription += `**\\- Tournament:** \`${tournament.name}\`\n`;
		embedDescription += `**\\- Lobby ID:** \`${id}\`\n`;
		embedDescription += `**\\- Custom ID:** \`${customId}\n\``;
		embedDescription += `**\\- Schedule:** <t:${schedule.toSeconds()}>\n`;
		embedDescription += `**\\- Stage:** \`${stage}\``;

		try {
			await db.matches.insert({
				id,
				customId,
				schedule: schedule.toJSDate(),
				status: "Pending",
				stage,
				tournament,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Lobby Created")
						.setDescription(embedDescription),
				],
			});
		} catch (error) {
			logger.error(error);
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("An error occurred while creating the lobby."),
				],
			});

			return;
		}
	},
};
