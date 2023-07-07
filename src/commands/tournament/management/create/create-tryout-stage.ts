import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "@/interfaces/command";
import { DateTime } from "luxon";
import db from "@/db";
import { logger } from "@/utils";
import { createId } from "@paralleldrive/cuid2";
import { LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { NoAccountEmbed } from "@/embeds";

export const createTryoutStage: Command = {
	data: new SlashCommandBuilder()
		.setName("create-tryout-stage")
		.setDescription(
			"Creates a tryout stage. Needs to be run in a tryout staff channel."
		)
		.addStringOption((option) =>
			option
				.setName("name")
				.setDescription('The name of the tryout stage. (Example: "Week 1")')
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("custom-id")
				.setDescription('The custom ID of the tryout stage. (Example: "W1")')
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("start-date")
				.setDescription(
					"The start date of the tryout stage. (Format: YYYY-MM-DD HH:MM)"
				)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("end-date")
				.setDescription(
					"The end date of the tryout stage. (Format: YYYY-MM-DD HH:MM)"
				)
				.setRequired(true)
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();
		const id = createId();

		const name = interaction.options.getString("name", true);
		const customId = interaction.options
			.getString("custom-id", true)
			.toUpperCase();
		const startDateString = interaction.options.getString("start-date", true);
		const endDateString = interaction.options.getString("end-date", true);

		const startDate = DateTime.fromFormat(startDateString, "yyyy-MM-dd HH:mm", {
			zone: "utc",
		});
		const endDate = DateTime.fromFormat(endDateString, "yyyy-MM-dd HH:mm", {
			zone: "utc",
		});

		// Check if the user has linked their account.
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

		if (!startDate.isValid || !endDate.isValid) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid Date!")
						.setDescription(
							"The date format you provided is invalid. Please use the following format: `YYYY-MM-DD HH:MM`"
						),
				],
			});

			return;
		}

		const tryout = await db.tryouts.findOne({
			where: {
				staffChannelId: interaction.channelId,
			},
		});

		if (!tryout) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid Channel!")
						.setDescription(
							"This command needs to be run in a tryout staff channel."
						),
				],
			});

			return;
		}

		const existingTryoutStage = await db.tryoutStages.findOne({
			where: {
				tryout: {
					id: tryout.id,
				},
				customId,
			},
		});

		if (existingTryoutStage) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid Custom ID!")
						.setDescription(
							"A tryout stage with the provided custom ID already exists."
						),
				],
			});

			return;
		}

		const collidingTryoutStage = await db.tryoutStages.findOne({
			where: [
				{
					tryout: {
						id: tryout.id,
					},
					startDate: startDate.toJSDate(),
				},
				{
					tryout: {
						id: tryout.id,
					},
					endDate: endDate.toJSDate(),
				},
				{
					tryout: {
						id: tryout.id,
					},
					endDate: MoreThanOrEqual(startDate.toJSDate()),
				},
				{
					tryout: {
						id: tryout.id,
					},
					startDate: LessThanOrEqual(endDate.toJSDate()),
				},
			],
		});

		if (collidingTryoutStage) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid Date!")
						.setDescription(
							`One of the dates provided collides with the existing tryout stage \`${collidingTryoutStage.name}\``
						),
				],
			});

			return;
		}

		let embedDescription = "**__Tryout stage info:__**\n";
		embedDescription += `**Name:** \`${name}\`\n`;
		embedDescription += `**Custom ID:** \`${customId}\`\n`;
		embedDescription += `**Start date:** \`${startDate.toRFC2822()}\`\n`;
		embedDescription += `**End date:** \`${endDate.toRFC2822()}\`\n`;

		try {
			await db.tryoutStages.insert({
				id,
				customId,
				name,
				startDate: startDate.toJSDate(),
				endDate: endDate.toJSDate(),
				tryout,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Tryout Stage Created!")
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
						.setTitle("DB Error!")
						.setDescription(
							"An error occurred while creating the tryout stage. All changes will be reverted. Please contact the bot owner if this error persists."
						),
				],
			});
		}
	},
};
