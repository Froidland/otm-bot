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
import { TryoutStage } from "@prisma/client";

export const create: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("create")
		.setDescription("Creates a tryout stage.")
		.addStringOption((option) =>
			option
				.setName("name")
				.setDescription('The name of the tryout stage. (Example: "Week 1")')
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName("custom-id")
				.setDescription('The custom ID of the tryout stage. (Example: "W1")')
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName("start-date")
				.setDescription(
					"The start date of the tryout stage. (Format: YYYY-MM-DD HH:MM)",
				)
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName("end-date")
				.setDescription(
					"The end date of the tryout stage. (Format: YYYY-MM-DD HH:MM)",
				)
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName("stage-dependency-id")
				.setDescription(
					"The custom ID of the stage players will have to play before joining this one. (Default: None)",
				)
				.setRequired(false),
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();
		const hasAdminPermission = isMemberAdmin(interaction);
		let stageDependency: TryoutStage | null = null;

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

		const startDate = DateTime.fromFormat(
			interaction.options.getString("start-date", true),
			"yyyy-MM-dd HH:mm",
			{
				zone: "utc",
			},
		);
		const endDate = DateTime.fromFormat(
			interaction.options.getString("end-date", true),
			"yyyy-MM-dd HH:mm",
			{
				zone: "utc",
			},
		);

		const stageDependencyId = interaction.options.getString(
			"stage-dependency-id",
		);

		const user = await db.user.findFirst({
			where: {
				discord_id: interaction.user.id,
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
				staff_channel_id: interaction.channelId,
			},
			include: {
				_count: {
					select: {
						stages: true,
					},
				},
			},
		});

		if (!tryout) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid channel!")
						.setDescription(
							"This command needs to be run in a tryout staff channel.",
						),
				],
			});

			return;
		}

		if (
			startDate.toJSDate() < tryout.start_date ||
			endDate.toJSDate() > tryout.end_date
		) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid dates!")
						.setDescription(
							"The dates provided for the stage cannot be outside the range provided for the tryout itself.",
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
				custom_id: customId,
			},
		});

		if (existingTryoutStage) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid custom ID!")
						.setDescription(
							"A tryout stage with the provided custom ID already exists.",
						),
				],
			});

			return;
		}

		if (stageDependencyId) {
			stageDependency = await db.tryoutStage.findFirst({
				where: {
					custom_id: stageDependencyId,
				},
			});

			if (!stageDependency) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Invalid stage dependency!")
							.setDescription(
								"The stage dependency provided does not exist. Please make sure you are using the correct custom ID.",
							),
					],
				});

				return;
			}
		}

		let embedDescription = "**__Tryout stage info:__**\n";
		embedDescription += `**Name:** \`${name}\`\n`;
		embedDescription += `**Custom ID:** \`${customId}\`\n`;
		embedDescription += `**Start date:** \`${startDate.toRFC2822()}\`\n`;
		embedDescription += `**End date:** \`${endDate.toRFC2822()}\`\n`;
		embedDescription += `**Stage dependency:** \`${
			stageDependency?.name ?? "None"
		}\``;

		try {
			await db.tryoutStage.create({
				data: {
					id,
					custom_id: customId,
					name,
					tryout: {
						connect: {
							id: tryout.id,
						},
					},
					//? If the stageDependency does exist, then we just connect it. Otherwise, we set it to undefined, which is basically sending nothing.
					stage_dependency:
						stageDependency === null
							? undefined
							: {
									connect: {
										id: stageDependency.id,
									},
							  },
					root_stage: tryout._count.stages === 0 ? true : false,
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
							"An error occurred while creating the tryout stage. All changes will be reverted. Please contact the bot owner if this error persists.",
						),
				],
			});
		}
	},
};
