import db from "@/db";
import { InvalidDateTime, NoAccountEmbed } from "@/embeds";
import { isUserTryoutAdmin, isUserTryoutReferee } from "@/utils";
import { createId } from "@paralleldrive/cuid2";
import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { EmbedBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import { DateTime } from "luxon";

@ApplyOptions<Subcommand.Options>({
	description: "Commands for managing tryout lobbies.",
	subcommands: [
		{
			name: "create",
			chatInputRun: "chatInputCreate",
		},
		{
			name: "claim",
			chatInputRun: "chatInputClaim",
		},
		{
			name: "unclaim",
			chatInputRun: "chatInputUnclaim",
		},
		{
			name: "join",
			chatInputRun: "chatInputJoin",
		},
		{
			name: "leave",
			chatInputRun: "chatInputLeave",
		},
		{
			name: "list",
			chatInputRun: "chatInputList",
		},
	],
})
export class LobbyCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((builder: SlashCommandSubcommandBuilder) =>
					builder
						.setName("create")
						.setDescription("Creates a tryout lobby.")
						.addStringOption((option) =>
							option
								.setName("stage-id")
								.setDescription("The custom ID of the tryout stage.")
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("custom-id")
								.setDescription("The custom ID of the lobby. (Example: A1)")
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("start-date")
								.setDescription(
									"The start date of the lobby. (Format: YYYY-MM-DD HH:MM)",
								)
								.setRequired(true),
						)
						.addNumberOption(
							(option) =>
								option
									.setName("player-limit")
									.setDescription("The player limit of the lobby.")
									.setRequired(true)
									.setMaxValue(16), //! This will stay as 16 for now, but it will be changed to more when lazer becomes mainstream.
						),
				)
				.addSubcommand((builder: SlashCommandSubcommandBuilder) =>
					builder
						.setName("claim")
						.setDescription("Claim a lobby as a referee.")
						.addStringOption((option) =>
							option
								.setName("lobby-id")
								.setDescription("The ID of the lobby to claim.")
								.setRequired(true),
						),
				)
				.addSubcommand((builder: SlashCommandSubcommandBuilder) =>
					builder
						.setName("unclaim")
						.setDescription("Unclaim a lobby as a referee.")
						.addStringOption((option) =>
							option
								.setName("lobby-id")
								.setDescription("The ID of the lobby to unclaim.")
								.setRequired(true),
						),
				)
				.addSubcommand((builder: SlashCommandSubcommandBuilder) =>
					builder
						.setName("join")
						.setDescription("Join a tryout lobby.")
						.addStringOption((option) =>
							option
								.setName("lobby-id")
								.setDescription("The ID of the lobby to join.")
								.setRequired(true),
						),
				)
				.addSubcommand((builder: SlashCommandSubcommandBuilder) =>
					builder
						.setName("leave")
						.setDescription("Leave a tryout lobby.")
						.addStringOption((option) =>
							option
								.setName("lobby-id")
								.setDescription("The ID of the lobby to leave.")
								.setRequired(true),
						),
				)
				.addSubcommand((builder: SlashCommandSubcommandBuilder) =>
					builder
						.setName("list")
						.setDescription(
							"List all the lobbies in the tryout. By default, this will only show the pending lobbies.",
						)
						.addBooleanOption((option) =>
							option
								.setName("show-all")
								.setDescription(
									"Include the lobbies that are no longer available. (Default: false)",
								)
								.setRequired(false),
						),
				),
		);
	}

	// TODO: Set up proper permissions for this command.
	public async chatInputCreate(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const id = createId();

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

		const stageId = interaction.options
			.getString("stage-id", true)
			.toUpperCase();
		const customId = interaction.options
			.getString("custom-id", true)
			.toUpperCase();
		const playerLimit = interaction.options.getNumber("player-limit", true);

		const startDate = DateTime.fromFormat(
			interaction.options.getString("start-date", true),
			"yyyy-MM-dd HH:mm",
			{
				zone: "utc",
			},
		);

		if (!startDate.isValid) {
			await interaction.editReply({
				embeds: [InvalidDateTime],
			});

			return;
		}

		const stage = await db.tryoutStage.findFirst({
			where: {
				custom_id: stageId,
				tryout: {
					staff_channel_id: interaction.channelId,
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
							"Please make sure you are in a tryout staff channel and that the stage exists.",
						),
				],
			});

			return;
		}

		if (
			startDate < DateTime.fromJSDate(stage.start_date as Date) ||
			startDate > DateTime.fromJSDate(stage.end_date as Date)
		) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid date!")
						.setDescription(
							"The date you provided is not within the tryout's date range.",
						),
				],
			});

			return;
		}

		const duplicateLobby = await db.tryoutLobby.findFirst({
			where: {
				custom_id: customId,
				stage: {
					custom_id: stageId,
					tryout: {
						staff_channel_id: interaction.channel?.id,
					},
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
							"The lobby ID you provided is already in use. Please use a different one.",
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
			await db.tryoutLobby.create({
				data: {
					id,
					player_limit: playerLimit,
					custom_id: customId,
					schedule: startDate.toJSDate(),
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
			this.container.logger.error(`Error while creating tournament: ${error}`);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("DB error!")
						.setDescription(
							"There was an error while creating the tryout lobby. All changes will be reverted. Please contact the bot owner if this error persists.",
						),
				],
			});
		}
	}

	public async chatInputClaim(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

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

		const lobbyId = interaction.options
			.getString("lobby-id", true)
			.toUpperCase();

		//? Get the tryout for the current staff channel and include any lobbies that match the lobby ID.
		const tryout = await db.tryout.findFirst({
			where: {
				staff_channel_id: interaction.channelId,
			},
			include: {
				stages: {
					where: {
						lobbies: {
							some: {
								custom_id: lobbyId,
							},
						},
					},
					include: {
						lobbies: {
							where: {
								custom_id: lobbyId,
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
						.setDescription(
							"This channel is not a staff channel for a tryout.",
						),
				],
			});

			return;
		}

		if (!isUserTryoutReferee(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You are not a referee for this tryout. Please contact an organizer if you believe this is a mistake.",
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
						.setTitle("Error")
						.setDescription("No lobbies were found for the provided ID."),
				],
			});

			return;
		}

		const lobby = tryout.stages[0].lobbies[0];

		if (lobby.referee_id) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This lobby has already been claimed."),
				],
			});

			return;
		}

		try {
			await db.tryoutLobby.update({
				where: {
					id: lobby.id,
				},
				data: {
					referee_id: user.id,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Lobby claimed!")
						.setDescription(
							`You have successfully claimed lobby \`${lobby.custom_id}\`.`,
						),
				],
			});
		} catch (error) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occurred while claiming the lobby. Please try again later or contact an organizer if this issue persists.",
						),
				],
			});

			return;
		}
	}

	public async chatInputUnclaim(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const lobbyId = interaction.options
			.getString("lobby-id", true)
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
				staff_channel_id: interaction.channel?.id,
			},
			include: {
				stages: {
					where: {
						lobbies: {
							some: {
								custom_id: lobbyId,
							},
						},
					},
					include: {
						lobbies: {
							where: {
								custom_id: lobbyId,
							},
							include: {
								referee: true,
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
						.setDescription(
							"This channel is not a staff channel for a tryout.",
						),
				],
			});

			return;
		}

		if (!isUserTryoutReferee(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You are not a referee for this tryout. Please contact an organizer if you believe this is a mistake.",
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
						.setTitle("Error")
						.setDescription("No lobbies were found for the provided ID."),
				],
			});

			return;
		}

		const lobby = tryout.stages[0].lobbies[0];

		if (lobby.referee && lobby.referee_id !== user.id) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Already claimed!")
						.setDescription(
							`This lobby is claimed by <@${lobby.referee.discord_id}>.`,
						),
				],
			});

			return;
		}

		try {
			await db.tryoutLobby.update({
				where: {
					id: lobby.id,
				},
				data: {
					referee_id: null,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Lobby unclaimed!")
						.setDescription(
							`You have successfully unclaimed lobby \`${lobby.custom_id}\`.`,
						),
				],
			});
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occurred while trying to unclaim this lobby. Please try again later or contact an organizer if this issue persists.",
						),
				],
			});
		}
	}

	public async chatInputJoin(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({
			ephemeral: true,
		});

		const lobbyId = interaction.options
			.getString("lobby-id", true)
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

			return;
		}

		if (
			!tryout.allow_staff &&
			(isUserTryoutReferee(interaction, tryout) ||
				isUserTryoutAdmin(interaction, tryout))
		) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Staff not allowed!")
						.setDescription(
							"Staff members are not allowed to join lobbies in this tryout.",
						),
				],
			});

			return;
		}

		const lobby = await db.tryoutLobby.findFirst({
			where: {
				custom_id: lobbyId,
				stage: {
					tryout: {
						player_channel_id: interaction.channel?.id,
					},
					is_published: true,
				},
			},
			include: {
				_count: {
					select: {
						players: true,
					},
				},
			},
		});

		if (!lobby) {
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
					stageId: lobby.stageId,
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
				await db.tryoutLobby.update({
					where: {
						id: previousLobby.tryout_lobby_id,
					},
					data: {
						players: {
							delete: {
								tryout_lobby_id_user_id: {
									tryout_lobby_id: previousLobby.tryout_lobby_id,
									user_id: user.id,
								},
							},
						},
					},
				});
			}

			await db.tryoutLobby.update({
				where: {
					id: lobby.id,
				},
				data: {
					players: {
						connectOrCreate: {
							where: {
								tryout_lobby_id_user_id: {
									tryout_lobby_id: lobby.id,
									user_id: user.id,
								},
							},
							create: {
								user_id: user.id,
							},
						},
					},
				},
			});

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
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Something went wrong!")
						.setDescription(
							"An unexpected error occurred. Please try again later or contact a staff member if the issue persists.",
						),
				],
			});
		}
	}

	public async chatInputLeave(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const lobbyId = interaction.options
			.getString("lobby-id", true)
			.toUpperCase();

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
			this.container.logger.error(error);

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
	}

	public async chatInputList(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
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
									referee: true,
									_count: {
										select: {
											players: true,
										},
									},
								},
								orderBy: {
									schedule: "asc",
								},
							},
						},
						where: {
							is_published: true,
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
							is_published: true,
						},
						include: {
							lobbies: {
								where: {
									schedule: {
										gt: DateTime.now().toJSDate(),
									},
								},
								include: {
									referee: true,
									_count: {
										select: {
											players: true,
										},
									},
								},
								orderBy: {
									schedule: "asc",
								}
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
			embedDescription += `**Stage \`${stage.name}\`** (\`${stage.custom_id}\`)\n`;

			if (stage.lobbies.length < 1) {
				embedDescription += `\\- *No lobbies in this stage*\n\n`;

				continue;
			}

			for (const lobby of stage.lobbies) {
				if (lobby._count.players >= lobby.player_limit) {
					embedDescription += `\\- ~Lobby \`${lobby.custom_id}\`~ (${
						lobby._count.players
					}/${lobby.player_limit}) <t:${lobby.schedule.getTime() / 1000}:R> | ${
						lobby.referee
							? `Referee: <@${lobby.referee?.discord_id}>`
							: "*No Referee*"
					}\n`;

					continue;
				}

				embedDescription += `\\- \`${lobby.custom_id}\` (\`${
					lobby._count.players
				}/${lobby.player_limit}\`) <t:${lobby.schedule.getTime() / 1000}:R> | ${
					lobby.referee
						? `Referee: <@${lobby.referee?.discord_id}>`
						: "*No Referee*"
				}\n`;
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
	}
}
