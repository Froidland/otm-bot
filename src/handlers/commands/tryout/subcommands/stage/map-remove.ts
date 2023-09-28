import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces";
import { logger } from "@/utils";
import { isUserTryoutAdmin } from "@/utils/discordUtils";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";

export const mapRemove: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("map-remove")
		.setDescription("Remove a pick from the stage's mappool.")
		.addStringOption((option) =>
			option
				.setName("stage-id")
				.setDescription("The custom ID of the stage to remove the pick from.")
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName("pick")
				.setDescription("The pick to remove. (Example: NM2)")
				.setRequired(true),
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({ ephemeral: true });

		const stageId = interaction.options
			.getString("stage-id", true)
			.toUpperCase();

		const pick = interaction.options.getString("pick", true).toUpperCase();

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
				staff_channel_id: interaction.channel?.id,
			},
			include: {
				stages: {
					where: {
						custom_id: stageId,
					},
					include: {
						mappool: {
							where: {
								pick_id: pick,
							},
							include: {
								beatmap: true,
							},
						},
					},
				},
			},
		});

		if (!tryout) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This channel is not a tryout staff channel."),
				],
			});

			return;
		}

		if (!isUserTryoutAdmin(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
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
						.setTitle("Error")
						.setDescription(
							`No stage with custom ID \`${stageId}\` was found.`,
						),
				],
			});

			return;
		}

		if (tryout.stages[0].mappool.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							`The pick \`${pick}\` does not exist on stage ${tryout.stages[0].name}.`,
						),
				],
			});

			return;
		}

		const beatmap = tryout.stages[0].mappool[0].beatmap;

		const embedDescription = `[${beatmap?.artist} - ${beatmap?.title} [${beatmap?.version}]](https://osu.ppy.sh/beatmaps/${beatmap?.id}) has removed as the **${pick}** from stage \`${tryout.stages[0].name}\`.`;

		try {
			await db.tryoutStage.update({
				where: {
					id: tryout.stages[0].id,
				},
				data: {
					mappool: {
						delete: {
							pick_id_stage_id: {
								pick_id: pick,
								stage_id: tryout.stages[0].id,
							},
						},
					},
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Yellow")
						.setTitle(`${pick} removed!`)
						.setImage(tryout.stages[0].mappool[0].beatmap!.cover_url)
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
						.setDescription(
							"An error occurred while removing the pick. Please try again later.",
						),
				],
			});
		}
	},
};
