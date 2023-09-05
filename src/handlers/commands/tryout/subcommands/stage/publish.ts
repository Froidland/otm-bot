import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { isUserTryoutAdmin } from "@/utils/discordUtils";
import { logger } from "@/utils";

// TODO: Add an interactive message to confirm publication of the stage.
// TODO: Maybe add an option to send a message in a channel when the pool is published.
// TODO: Add an option to the above setting to ping players or not. (Default to no)
export const publish: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("publish")
		.setDescription("Publishes the specified tryout stage.")
		.addStringOption((option) =>
			option
				.setName("stage-id")
				.setDescription("The custom ID of the stage to publish.")
				.setRequired(true),
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({ ephemeral: true });

		const stageId = interaction.options
			.getString("stage-id", true)
			.toUpperCase();

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

		const tryout = await db.tryout.findFirst({
			where: {
				OR: [
					{
						staff_channel_id: interaction.channel?.id,
					},
					{
						player_channel_id: interaction.channel?.id,
					},
				],
			},
			include: {
				stages: {
					where: {
						custom_id: stageId,
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
							"This command can only be used in a tryout channel.",
						),
				],
			});

			return;
		}

		if (!isUserTryoutAdmin(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription("You don't have permission to do this."),
				],
			});

			return;
		}

		if (tryout.stages.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid stage!")
						.setDescription("The stage you specified does not exist."),
				],
			});

			return;
		}

		if (tryout.stages[0].is_published) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid stage!")
						.setDescription("The stage you specified is already published."),
				],
			});

			return;
		}

		try {
			await db.tryoutStage.update({
				where: {
					id: tryout.stages[0].id,
				},
				data: {
					is_published: true,
				},
			});

			// TODO: Add additional info to the reply like mappool and stage full information.
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							`Stage \`${tryout.stages[0].name}\` was published successfully.`,
						),
				],
			});
		} catch (error) {
			logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occurred while publishing the stage. Please try again later.",
						),
				],
			});
		}
	},
};
