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
export const join: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("join")
		.setDescription("Join a tryout lobby.")
		.addStringOption((option) =>
			option
				.setName("lobby-id")
				.setDescription("The ID of the lobby to join.")
				.setRequired(true),
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({
			ephemeral: true,
		});

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
					include: {
						tryoutLobby: true,
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

		const tryout = await db.tryout.findFirst({
			where: {
				player_channel_id: interaction.channel!.id,
			},
			include: {
				_count: {
					select: {
						players: {
							where: {
								user_id: user.id,
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
							"This command can only be used in a tryout player channel.",
						),
				],
			});

			return;
		}

		if (tryout._count.players === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Not registered!")
						.setDescription(
							"You must register for the tryout before joining a lobby.",
						),
				],
			});
		}

		if (user.tryout_lobbies.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid lobby!")
						.setDescription("The lobby you are trying to join does not exist."),
				],
			});

			return;
		}

		const previousLobby = await db.playersOnTryoutLobbies.findFirst({
			where: {
				user_id: user.id,
				tryoutLobby: {
					NOT: {
						id: lobbyId,
					},
					stageId: user.tryout_lobbies[0].tryoutLobby.stageId,
				},
			},
		});

		if (previousLobby && previousLobby.played) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Already played!")
						.setDescription(
							"You have already played a lobby in this tryout stage. If you believe this is a mistake, please contact a staff member.",
						),
				],
			});

			return;
		}

		try {
			if (previousLobby) {
				await db.playersOnTryoutLobbies.update({
					where: {
						tryout_lobby_id_user_id: {
							user_id: user.id,
							tryout_lobby_id: previousLobby.tryout_lobby_id,
						},
					},
					data: {
						tryout_lobby_id: lobbyId,
					},
				});
			} else {
				await db.playersOnTryoutLobbies.create({
					data: {
						user_id: user.id,
						tryout_lobby_id: lobbyId,
					},
				});
			}

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Lobby joined!")
						.setDescription(
							`You have successfully joined lobby \`${lobbyId}\`.`,
						),
				],
			});
		} catch (error) {
			logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Something went wrong!")
						.setDescription(
							"An unexpected error occurred. Please try again later or contact a staff member.",
						),
				],
			});
		}
	},
};
