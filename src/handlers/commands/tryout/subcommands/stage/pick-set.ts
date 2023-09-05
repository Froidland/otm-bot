import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces";
import { logger } from "@/utils";
import { isUserTryoutAdmin } from "@/utils/discordUtils";
import {
	APIEmbedField,
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { v2 } from "osu-api-extended";

export const pickSet: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("pick-set")
		.setDescription("Set a specific pick for the specified stage's mappool.")
		.addStringOption((option) =>
			option
				.setName("stage-id")
				.setDescription("The custom ID of the stage to set the pick for.")
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName("pick")
				.setDescription("The pick to set the map for. (Example: NM2)")
				.setRequired(true),
		)
		.addNumberOption((option) =>
			option
				.setName("beatmap-id")
				.setDescription(
					"The beatmap ID of the map to set. (Not to be confused with the beatmapset ID)",
				)
				.setRequired(true),
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({ ephemeral: true });

		const stageId = interaction.options
			.getString("stage-id", true)
			.toUpperCase();
		const pick = interaction.options.getString("pick", true).toUpperCase();
		const beatmapId = interaction.options.getNumber("beatmap-id", true);

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

		let beatmap = null;
		beatmap = await db.beatmap.findUnique({
			where: {
				id: beatmapId,
			},
		});

		if (!beatmap) {
			const apiBeatmap = await v2.beatmap.id.details(beatmapId);

			// @ts-expect-error osu! api wrapper shenanigans
			if (apiBeatmap["error"] !== undefined) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(`Beatmap with ID \`${beatmapId}\` not found.`),
					],
				});

				return;
			}

			beatmap = await db.beatmap.create({
				data: {
					id: apiBeatmap.id,
					beatmapset_id: apiBeatmap.beatmapset_id,
					artist: apiBeatmap.beatmapset.artist,
					title: apiBeatmap.beatmapset.title,
					difficulty_rating: apiBeatmap.difficulty_rating,
					circle_size: apiBeatmap.cs,
					hp_drain: apiBeatmap.drain,
					accuracy: apiBeatmap.accuracy,
					approach_rate: apiBeatmap.ar,
					mode: apiBeatmap.mode,
					status: apiBeatmap.status,
					total_length: apiBeatmap.total_length,
					creator: apiBeatmap.beatmapset.creator,
					version: apiBeatmap.version,
					cover_url: apiBeatmap.beatmapset.covers.cover,
				},
			});
		}
		const mapLengthFormat = `${(beatmap.total_length / 60)
			.toFixed(0)
			.padStart(2, "0")}:${(beatmap.total_length % 60)
			.toString()
			.padStart(2, "0")}`;

		const embedDescription = `[${beatmap.artist} - ${beatmap.title} [${beatmap.version}]](https://osu.ppy.sh/beatmaps/${beatmap.id}) has been set as the **${pick}** pick for stage \`${tryout.stages[0].name}\`.`;
		const fields: APIEmbedField[] = [
			{
				name: "Star rating",
				value: beatmap.difficulty_rating.toFixed(2),
				inline: true,
			},
			{
				name: "Total length",
				value: mapLengthFormat,
				inline: true,
			},
			{
				name: "CS",
				value: beatmap.circle_size.toFixed(1),
				inline: true,
			},
			{
				name: "AR",
				value: beatmap.approach_rate.toFixed(1),
				inline: true,
			},
			{
				name: "OD",
				value: beatmap.accuracy.toFixed(1),
				inline: true,
			},
			{
				name: "HP",
				value: beatmap.hp_drain.toFixed(1),
				inline: true,
			},
		];

		try {
			await db.tryoutStage.update({
				where: {
					id: tryout.stages[0].id,
				},
				data: {
					mappool: {
						upsert: {
							where: {
								pick_id_stage_id: {
									pick_id: pick,
									stage_id: tryout.stages[0].id,
								},
							},
							create: {
								pick_id: pick,
								beatmap_id: beatmap.id,
							},
							update: {
								beatmap_id: beatmap.id,
							},
						},
					},
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle(`${pick} set!`)
						.setImage(beatmap.cover_url)
						.setDescription(embedDescription)
						.addFields(fields),
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
							`An error occurred while setting the pick. Please try again later.`,
						),
				],
			});
		}
	},
};
