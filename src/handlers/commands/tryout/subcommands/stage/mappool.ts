import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces";
import { isUserTryoutAdmin } from "@/utils/discordUtils";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";

export const mappool: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("mappool")
		.setDescription("View the specified stage's mappool.")
		.addStringOption((option) =>
			option
				.setName("stage-id")
				.setDescription("The custom ID of the stage to view the mappool for.")
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
						player_channel_id: interaction.channel?.id,
					},
					{
						staff_channel_id: interaction.channel?.id,
					},
				],
			},
			include: {
				stages: {
					where: {
						custom_id: stageId,
					},
					include: {
						mappool: {
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
						.setTitle("Invalid channel!")
						.setDescription(
							"This command can only be used in a tryout channel.",
						),
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
						.setDescription(
							"Either this stage doesn't exist or it hasn't been published yet.",
						),
				],
			});

			return;
		}

		if (
			interaction.channel?.id === tryout.staff_channel_id &&
			!isUserTryoutAdmin(interaction, tryout)
		) {
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

		if (
			interaction.channel?.id === tryout.player_channel_id &&
			!tryout.stages[0].is_published &&
			!isUserTryoutAdmin(interaction, tryout)
		) {
			console.log("no");
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid stage!")
						.setDescription(
							"Either this stage doesn't exist or it hasn't been published yet.",
						),
				],
			});

			return;
		}

		// TODO: For the love of anything please implement a custom sort function to do this or something cause this is sacrilege (or not, who knows...)
		// TODO: Automate grouping the different mods as to not rely on the "extra" array in the object and support additional mods.
		const mappoolObject = {
			NM: tryout.stages[0].mappool
				.filter((pick) => pick.pick_id.startsWith("NM"))
				.sort(),
			HD: tryout.stages[0].mappool
				.filter((pick) => pick.pick_id.startsWith("HD"))
				.sort(),
			HR: tryout.stages[0].mappool
				.filter((pick) => pick.pick_id.startsWith("HR"))
				.sort(),
			DT: tryout.stages[0].mappool
				.filter((pick) => pick.pick_id.startsWith("DT"))
				.sort(),
			FM: tryout.stages[0].mappool
				.filter((pick) => pick.pick_id.startsWith("FM"))
				.sort(),
			Extra: tryout.stages[0].mappool
				.filter((pick) => {
					const pickText = pick.pick_id.slice(0, 2);

					if (["NM", "HD", "HR", "DT", "FM", "TB"].includes(pickText)) {
						return false;
					}

					return true;
				})
				.sort(),
			TB: tryout.stages[0].mappool
				.filter((pick) => pick.pick_id.startsWith("TB"))
				.sort(),
		};

		let embedDescription = "";

		for (const [mod, maps] of Object.entries(mappoolObject)) {
			if (maps.length === 0) {
				continue;
			}

			embedDescription += `**${mod}** pool:\n`;

			for (const map of maps) {
				embedDescription += `\\- \`${map.pick_id}\` | [${map.beatmap
					?.artist} - ${map.beatmap?.title} [${map.beatmap
					?.version}] [${map.beatmap?.difficulty_rating.toFixed(
					2,
				)}★]](https://osu.ppy.sh/beatmaps/${map.beatmap_id})\n`;
			}

			embedDescription += "\n";
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle(`${tryout.stages[0].name} Mappool`)
					.setDescription(embedDescription),
			],
		});
	},
};
