import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces";
import { logger } from "@/utils";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";

// TODO: Needs testing.
export const leave: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("leave")
		.setDescription("Leave a tryout lobby.")
		.addStringOption((option) =>
			option
				.setName("lobby-id")
				.setDescription("The ID of the lobby to leave.")
				.setRequired(true),
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();

		const lobbyId = interaction.options.getString("lobby-id", true);

		const user = await db.user.findFirst({
			where: {
				discord_id: interaction.user.id,
			},
			include: {
				tryout_lobbies: {
					where: {
						tryoutLobby: {
							custom_id: lobbyId,
							stage: {
								tryout: {
									player_channel_id: interaction.channel?.id,
								},
							},
						},
					},
				},
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		if (user.tryout_lobbies.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Not in lobby!")
						.setDescription(
							"Either the specified lobby does not exist or you are not in it.",
						),
				],
			});

			return;
		}

		if (user.tryout_lobbies[0].played) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Already played!")
						.setDescription(
							"You cannot leave a lobby that you have already played in.",
						),
				],
			});

			return;
		}

		try {
			await db.playersOnTryoutLobbies.delete({
				where: {
					tryout_lobby_id_user_id: {
						tryout_lobby_id: user.tryout_lobbies[0].tryout_lobby_id,
						user_id: user.id,
					},
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success!")
						.setDescription("You have left the lobby."),
				],
			});
		} catch (error) {
			logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error!")
						.setDescription(
							"There was an error leaving the lobby. Please try again later or contact a staff member.",
						),
				],
			});
		}
	},
};
