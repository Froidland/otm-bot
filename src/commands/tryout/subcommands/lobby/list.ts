import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { DateTime } from "luxon";

// TODO: Implement pagination.
// TODO: Maybe make this message interactive with a dropdown for the lobby the player wishes to join.
// TODO: Consider only showing the lobbies in the future and add an option to show all the lobbies.
export const list: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("list")
		.setDescription(
			"List all the lobbies in the tryout. By default, this will only show the pending lobbies.",
		)
		.addBooleanOption((option) =>
			option
				.setName("show-all")
				.setDescription("Show all the lobbies in the tryout. (Default: false)")
				.setRequired(false),
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({
			ephemeral: true,
		});

		const showAll = interaction.options.getBoolean("show-all") ?? false;

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

		let tryout = null;

		if (showAll) {
			tryout = await db.tryout.findFirst({
				where: {
					OR: [
						{
							player_channel_id: interaction.channel!.id,
						},
						{
							staff_channel_id: interaction.channel!.id,
						},
					],
				},
				include: {
					stages: {
						include: {
							lobbies: {
								include: {
									_count: {
										select: {
											players: true,
										},
									},
								},
							},
						},
						orderBy: {
							created_at: "asc",
						},
					},
				},
			});
		} else {
			tryout = await db.tryout.findFirst({
				where: {
					OR: [
						{
							player_channel_id: interaction.channel!.id,
						},
						{
							staff_channel_id: interaction.channel!.id,
						},
					],
				},
				include: {
					stages: {
						where: {
							lobbies: {
								every: {
									schedule: {
										gt: DateTime.now().toJSDate(),
									},
								},
							},
						},
						include: {
							lobbies: {
								where: {
									schedule: {
										gt: DateTime.now().toJSDate(),
									},
								},
								include: {
									_count: {
										select: {
											players: true,
										},
									},
								},
							},
						},
						orderBy: {
							created_at: "asc",
						},
					},
				},
			});
		}

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

		if (tryout.stages.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("No stages!")
						.setDescription("There are no stages in this tryout yet."),
				],
			});

			return;
		}

		let embedDescription = "";

		for (const stage of tryout.stages) {
			embedDescription += `**Stage \`${stage.name}\`**\n`;

			if (stage.lobbies.length < 1) {
				embedDescription += `\\- *No lobbies in this stage*\n\n`;

				continue;
			}

			for (const lobby of stage.lobbies) {
				if (lobby._count.players >= lobby.player_limit) {
					embedDescription += `\\- ~Lobby \`${lobby.custom_id}\`~ (${
						lobby._count.players
					}/${lobby.player_limit}) <t:${lobby.schedule.getTime() / 1000}:R>\n`;

					continue;
				}

				embedDescription += `\\- \`${lobby.custom_id}\` (${
					lobby._count.players
				}/${lobby.player_limit}) <t:${lobby.schedule.getTime() / 1000}:R>\n`;
			}

			embedDescription += "\n";
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Blue")
					.setTitle("List of lobbies")
					.setDescription(embedDescription)
					.setFooter({
						text: "The times displayed are localized to your timezone.",
					}),
			],
		});
	},
};
