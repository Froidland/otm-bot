import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";

// TODO: Implement pagination.
// TODO: Maybe make this message interactive with a dropdown for the lobby the player wishes to join.
export const list: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("list")
		.setDescription("List all the lobbies in the tryout."),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({
			ephemeral: true,
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

		const tryout = await db.tryout.findFirst({
			where: {
				playerChannelId: interaction.channel!.id,
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
						stageDependency: true,
					},
					orderBy: {
						createdAt: "asc",
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
							"This command can only be used in a player channel."
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
			if (stage.stageDependency) {
				embedDescription += `**Stage \`${stage.name}\`** *(Depends on \`${stage.stageDependency.customId}\`)*\n`;
			} else {
				embedDescription += `**Stage \`${stage.name}\`**\n`;
			}

			if (stage.lobbies.length < 1) {
				embedDescription += `\\- *No lobbies in this stage*\n\n`;
				continue;
			}

			for (const lobby of stage.lobbies) {
				if (lobby._count.players >= lobby.playerLimit) {
					embedDescription += `\\- ~Lobby \`${lobby.customId}\`~ (${
						lobby._count.players
					}/${lobby.playerLimit}) <t:${lobby.startDate.getTime() / 1000}:R>\n`;
					continue;
				}
				embedDescription += `\\- \`${lobby.customId}\` (${
					lobby._count.players
				}/${lobby.playerLimit}) <t:${lobby.startDate.getTime() / 1000}:R>\n`;
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
