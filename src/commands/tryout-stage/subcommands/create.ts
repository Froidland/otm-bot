import { isMemberAdmin } from "@/utils/discordUtils";
import db from "@/db";
import { InvalidDateTime, NoAccountEmbed, NoAdminEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces/subCommand";
import { logger } from "@/utils";
import { createId } from "@paralleldrive/cuid2";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { DateTime } from "luxon";

const create: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("create")
		.setDescription("Creates a tryout stage.")
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
		const hasAdminPermission = isMemberAdmin(interaction);

		if (!hasAdminPermission) {
			await interaction.editReply({
				embeds: [NoAdminEmbed],
			});

			return;
		}

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

		if (!startDate.isValid || !endDate.isValid) {
			await interaction.editReply({
				embeds: [InvalidDateTime],
			});

			return;
		}

		const tryout = await db.tryout.findFirst({
			where: {
				staffChannelId: interaction.channelId,
			},
		});

		if (!tryout) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid channel!")
						.setDescription(
							"This command needs to be run in a tryout staff channel."
						),
				],
			});

			return;
		}

		const existingTryoutStage = await db.tryoutStage.findFirst({
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
						.setTitle("Invalid custom ID!")
						.setDescription(
							"A tryout stage with the provided custom ID already exists."
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
			await db.tryoutStage.create({
				data: {
					id,
					customId,
					name,
					tryout: {
						connect: {
							id: tryout.id,
						},
					},
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Tryout stage created!")
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
						.setTitle("DB error!")
						.setDescription(
							"An error occurred while creating the tryout stage. All changes will be reverted. Please contact the bot owner if this error persists."
						),
				],
			});
		}
	},
};

export default create;
