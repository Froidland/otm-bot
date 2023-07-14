import db, { TournamentStage } from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces/subCommand";
import { logger } from "@/utils";
import { createId } from "@paralleldrive/cuid2";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	GuildMemberRoleManager,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { DateTime } from "luxon";

const create: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("create")
		.setDescription("Creates a match.")
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
					// TODO: Remove tryout and qualifiers from here, tryouts has their own command and qualifiers should have its own too.
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
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();
		const id = createId();

		const customId = interaction.options.getString("custom-id", true);
		const scheduleString = interaction.options.getString("schedule", true);
		const stage = interaction.options.getString(
			"stage",
			true
		) as TournamentStage;

		const schedule = DateTime.fromFormat(scheduleString, "yyyy-MM-dd HH:mm", {
			zone: "utc",
		});

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

		if (!schedule.isValid) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid Date!")
						.setDescription(
							"The schedule you provided is invalid. Please use the following format: `YYYY-MM-DD HH:MM`"
						),
				],
			});

			return;
		}

		if (schedule < DateTime.utc()) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid Date!")
						.setDescription("You cannot create a lobby in the past."),
				],
			});

			return;
		}

		const tournament = await db.tournament.findFirst({
			where: {
				staffChannelId: interaction.channelId,
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid Channel!")
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
						.setTitle("Invalid Permissions!")
						.setDescription("You are not a staff member for this tournament."),
				],
			});

			return;
		}

		const existingLobby = await db.match.findFirst({
			where: {
				AND: [
					{
						tournament: {
							id: tournament.id,
						},
					},
					{
						customId,
					},
				],
			},
		});

		if (existingLobby) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid Custom ID!")
						.setDescription(
							"A lobby with that custom ID already exists for this tournament."
						),
				],
			});

			return;
		}

		let embedDescription = `**__Lobby identification:__**\n`;
		embedDescription += `**\\- Tournament:** \`${tournament.name}\`\n`;
		embedDescription += `**\\- Custom ID:** \`${customId}\n\``;
		embedDescription += `**\\- Schedule:** <t:${schedule.toSeconds()}>\n`;
		embedDescription += `**\\- Stage:** \`${stage}\``;

		try {
			await db.match.create({
				data: {
					id,
					customId,
					schedule: schedule.toJSDate(),
					status: "Pending",
					stage,
					tournament: {
						connect: {
							id: tournament.id,
						},
					},
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Lobby Created")
						.setDescription(embedDescription)
						.setFooter({
							text: `Unique ID: ${id}`,
						}),
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

export default create;
