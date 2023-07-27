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

export const create: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("create")
		.setDescription("Creates a tryout lobby.")
		.addStringOption((option) =>
			option
				.setName("stage-id")
				.setDescription("The ID of the tryout stage.")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("custom-id")
				.setDescription("The custom ID of the lobby. (Example: A1)")
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
		const hasAdminPermission = isMemberAdmin(interaction);

		if (!hasAdminPermission) {
			await interaction.editReply({
				embeds: [NoAdminEmbed],
			});

			return;
		}

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

		const stageId = interaction.options.getString("stage-id", true);
		const customId = interaction.options.getString("custom-id", true);
		const startDateString = interaction.options.getString("start-date", true);
		const playerLimit = interaction.options.getNumber("player-limit", true);

		const startDate = DateTime.fromFormat(startDateString, "yyyy-MM-dd HH:mm", {
			zone: "utc",
		});

		if (!startDate.isValid) {
			await interaction.editReply({
				embeds: [InvalidDateTime],
			});

			return;
		}

		const stage = await db.tryoutStage.findFirst({
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
						.setTitle("Invalid stage!")
						.setDescription(
							"Please make sure you are in a tryout staff channel and that the stage exists."
						),
				],
			});

			return;
		}

		const duplicateLobby = await db.tryoutLobby.findFirst({
			where: {
				customId,
				stage: {
					customId: stageId,
				},
			},
		});

		if (duplicateLobby) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Duplicate lobby ID!")
						.setDescription(
							"The lobby ID you provided is already in use. Please use a different one."
						),
				],
			});

			return;
		}

		let embedDescription = "**__Tryout Lobby info:__**\n";
		embedDescription += `**Lobby ID:** \`${customId}\`\n`;
		embedDescription += `**Start Date:** \`${startDate.toRFC2822()}\` (<t:${startDate.toSeconds()}:R>)\n`;
		embedDescription += `**Player Limit:** \`${playerLimit}\`\n`;

		try {
			/* await db.tryoutLobbies.insert({
				id,
				playerLimit,
				lobbyId: customId,
				startDate: startDate.toJSDate(),
				stage,
			}); */
			await db.tryoutLobby.create({
				data: {
					id,
					playerLimit,
					customId,
					startDate: startDate.toJSDate(),
					stage: {
						connect: {
							id: stage.id,
						},
					},
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Tryout lobby created!")
						.setDescription(embedDescription)
						.setFooter({
							text: `Unique ID: ${id}`,
						}),
				],
			});
		} catch (error) {
			logger.error(`Error while creating tournament: ${error}`);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("DB error!")
						.setDescription(
							"There was an error while creating the tryout lobby. All changes will be reverted. Please contact the bot owner if this error persists."
						),
				],
			});
		}
	},
};
