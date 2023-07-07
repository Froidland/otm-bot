import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "@/interfaces/command";
import { DateTime } from "luxon";
import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { createId } from "@paralleldrive/cuid2";
import { logger } from "@/utils";

export const createTryoutLobby: Command = {
	data: new SlashCommandBuilder()
		.setName("create-tryout-lobby")
		.setDescription("Creates a tryout lobby.")
		.addStringOption((option) =>
			option
				.setName("stage-id")
				.setDescription("The ID of the tryout stage.")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("lobby-id")
				.setDescription("The ID of the lobby.")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("start-date")
				.setDescription(
					"The start date of the lobby. (Format: YYYY-MM-DD HH:MM)"
				)
				.setRequired(true)
		)
		.addNumberOption(
			(option) =>
				option
					.setName("player-limit")
					.setDescription("The player limit of the lobby.")
					.setRequired(true)
					.setMaxValue(16) //! This will stay as 16 for now, but it will be changed to more when lazer becomes mainstream.
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();
		const id = createId();

		const user = await db.users.findOne({
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

		const stageId = interaction.options.getString("stage-id", true);
		const lobbyId = interaction.options.getString("lobby-id", true);
		const startDateString = interaction.options.getString("start-date", true);
		const playerLimit = interaction.options.getNumber("player-limit", true);

		const startDate = DateTime.fromFormat(startDateString, "yyyy-MM-dd HH:mm", {
			zone: "utc",
		});

		if (!startDate.isValid) {
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

		const stage = await db.tryoutStages.findOne({
			where: {
				customId: stageId,
				tryout: {
					staffChannelId: interaction.channelId,
				},
			},
		});

		if (!stage) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid Stage!")
						.setDescription(
							"Please make sure you are in a tryout staff channel and that the stage exists."
						),
				],
			});

			return;
		}

		const duplicateLobby = await db.tryoutLobbies.findOne({
			where: {
				lobbyId,
			},
		});

		if (duplicateLobby) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Duplicate Lobby ID!")
						.setDescription(
							"The lobby ID you provided is already in use. Please use a different one."
						),
				],
			});

			return;
		}

		let embedDescription = "**__Tryout Lobby info:__**\n";
		embedDescription += `**Unique ID:** \`${id}\`\n`;
		embedDescription += `**Lobby ID:** \`${lobbyId}\`\n`;
		embedDescription += `**Start Date:** \`${startDate.toRFC2822()}\`\n`;
		embedDescription += `**Player Limit:** \`${playerLimit}\`\n`;

		try {
			await db.tryoutLobbies.insert({
				id,
				playerLimit,
				lobbyId,
				startDate: startDate.toJSDate(),
				stage,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Tryout Lobby Created!")
						.setDescription(embedDescription),
				],
			});
		} catch (error) {
			logger.error(`Error while creating tournament: ${error}`);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("DB Error!")
						.setDescription(
							"There was an error while creating the tryout lobby. All changes will be reverted. Please contact the bot owner if this error persists."
						),
				],
			});
		}
	},
};
