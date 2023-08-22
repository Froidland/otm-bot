import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces";
import { logger } from "@/utils";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { DateTime } from "luxon";

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
		await interaction.deferReply();

		const lobbyId = interaction.options.getString("lobby-id", true);

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
				player_channel_id: interaction.channelId,
			},
			include: {
				players: {
					where: {
						player: {
							discord_id: interaction.user.id,
						},
					},
				},
				stages: {
					include: {
						lobbies: {
							include: {
								players: {
									where: {
										player: {
											discord_id: interaction.user.id,
										},
									},
								},
								_count: {
									select: {
										players: true,
									},
								},
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
							"This command can only be used in a player channel.",
						),
				],
			});

			return;
		}

		if (tryout.players.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are not registered for this tryout."),
				],
			});

			return;
		}

		let selectedLobby = null;

		const stageMap = new Map(
			tryout.stages.map((stage) => {
				return [stage.id, stage];
			}),
		);

		for (const stage of tryout.stages) {
			for (const lobby of stage.lobbies) {
				if (lobby.custom_id === lobbyId) {
					selectedLobby = lobby;
				}
			}
		}

		if (!selectedLobby) {
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

		const selectedStage = stageMap.get(selectedLobby.stageId);

		if (!selectedStage) {
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

		if (selectedLobby.schedule.getTime() < DateTime.now().toMillis()) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Lobby has already started!")
						.setDescription(
							"The lobby you are trying to join has already started.",
						),
				],
			});

			return;
		}

		if (selectedLobby._count.players >= selectedLobby.player_limit) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Lobby is full!")
						.setDescription("The lobby you are trying to join is full."),
				],
			});

			return;
		}

		//? If there's no stage dependency, we let the player join the lobby.
		if (!selectedStage.stage_dependency_id) {
			try {
				await db.tryoutLobby.update({
					where: {
						id: selectedLobby.id,
					},
					data: {
						players: {
							connectOrCreate: {
								where: {
									tryout_lobby_id_user_id: {
										tryout_lobby_id: selectedLobby.id,
										user_id: user.id,
									},
								},
								create: {
									player: {
										connect: {
											id: user.id,
										},
									},
								},
							},
						},
					},
				});

				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Green")
							.setTitle("Joined!")
							.setDescription(
								`You have successfully joined lobby \`${selectedLobby.custom_id}\`.`,
							),
					],
				});
			} catch (error) {
				logger.error(error);

				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("DB Error")
							.setDescription(
								"An error occured while trying to join the lobby. Please try again later",
							),
					],
				});
			}

			return;
		}

		//? This checks whether the player fulfills all the dependencies of the lobby's stage.
		//? It assumes there are no circular dependencies, this is guaranteed in the stage creation process.
		let currentStageCheck: typeof selectedStage;
		do {
			currentStageCheck = stageMap.get(selectedStage.stage_dependency_id)!;
			let playerCheck = false;

			//? This checks for whether the player is in one of the stage's lobbies.
			//? It checks for 0 because the db query only returns players that match the player that is requesting to join.
			for (const lobby of currentStageCheck.lobbies) {
				if (lobby.players.length !== 0) {
					playerCheck = true;
				}
			}

			if (!playerCheck) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Unfulfilled requirement!")
							.setDescription(
								`In order to join this lobby, you need to register in a lobby for stage \`${currentStageCheck.name}\``,
							),
					],
				});

				return;
			}
		} while (currentStageCheck.stage_dependency_id);

		try {
			await db.tryoutLobby.update({
				where: {
					id: selectedLobby.id,
				},
				data: {
					players: {
						connectOrCreate: {
							where: {
								tryout_lobby_id_user_id: {
									tryout_lobby_id: selectedLobby.id,
									user_id: user.id,
								},
							},
							create: {
								player: {
									connect: {
										id: user.id,
									},
								},
							},
						},
					},
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Joined!")
						.setDescription(
							`You have successfully joined lobby \`${selectedLobby.custom_id}\`.`,
						),
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
							"An error occurred while trying to join the lobby. Please try again later",
						),
				],
			});
		}
	},
};
