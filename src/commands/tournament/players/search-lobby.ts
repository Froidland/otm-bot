import {
	ChatInputCommandInteraction,
	CommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "@/interfaces/command";
import { DateTime } from "luxon";
import db, { TournamentStage } from "@/db";
import { Between } from "typeorm";

export const searchLobby: Command = {
	data: new SlashCommandBuilder()
		.setName("search-lobby")
		.setDescription("Searches for a lobby in a specific date range.")
		.addStringOption((option) =>
			option
				.setName("from")
				.setDescription(
					"The start date of the search range. Format: YYYY-MM-DD"
				)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("to")
				.setDescription("The end date of the search range. Format: YYYY-MM-DD")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("stage")
				.setDescription("The stage of the tournament to search in.")
				.setRequired(true)
				.addChoices(
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
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({
			ephemeral: true,
		});

		const fromDateString = interaction.options.get("from", true)
			.value as string;

		const toDateString = interaction.options.get("to", true).value as string;

		const stage = interaction.options.get("stage", true)
			.value as TournamentStage;

		const fromDate = DateTime.fromFormat(fromDateString, "yyyy-MM-dd", {
			zone: "utc",
		});

		const toDate = DateTime.fromFormat(toDateString, "yyyy-MM-dd", {
			zone: "utc",
		});

		if (fromDate > toDate) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("The start date cannot be after the end date."),
				],
			});

			return;
		}

		const lobbies = await db.lobbies.find({
			where: {
				schedule: Between(fromDate.toJSDate(), toDate.toJSDate()),
				tournament: [
					{
						scheduleChannelId: interaction.channelId,
					},
					{
						refereeChannelId: interaction.channelId,
					},
					{
						mappoolerChannelId: interaction.channelId,
					},
					{
						staffChannelId: interaction.channelId,
					},
					{
						playerChannelId: interaction.channelId,
					},
				],
				stage,
			},
			relations: ["tournament"],
			order: {
				customId: "ASC",
				schedule: "ASC",
			},
		});

		if (lobbies.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Yellow")
						.setTitle("No lobbies found")
						.setDescription(
							`No lobbies were found in the specified range for stage \`${stage}\`.`
						),
				],
			});

			return;
		}

		const tournamentName = lobbies[0].tournament.name;

		const lobbyListMessage = lobbies.map((lobby) => {
			return `**${lobby.customId}** | \`${lobby.schedule.toUTCString()}\` (<t:${
				lobby.schedule.getTime() / 1000
			}:R>)\n`;
		});

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Lobbies")
					.setDescription(lobbyListMessage.join(""))
					.setFooter({
						text: `Tournament: ${tournamentName}`,
					}),
			],
		});
	},
};
