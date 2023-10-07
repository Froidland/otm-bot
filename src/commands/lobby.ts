import db from "@/db";
import { InvalidDateTime, NoAccountEmbed } from "@/embeds";
import { isUserTryoutAdmin, isUserTryoutReferee } from "@/utils";
import { createId } from "@paralleldrive/cuid2";
import { Prisma } from "@prisma/client";
import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import {
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
	userMention,
} from "discord.js";
import { DateTime } from "luxon";

@ApplyOptions<Subcommand.Options>({
	description: "Commands for managing tryout lobbies.",
	subcommands: [
		{
			name: "create",
			chatInputRun: "chatInputCreate",
		},
		{
			name: "batch-create",
			chatInputRun: "chatInputBatchCreate",
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
		{
			name: "info",
			chatInputRun: "chatInputInfo",
		},
		{
			name: "player",
			type: "group",
			entries: [
				{
					name: "assign",
					chatInputRun: "chatInputPlayerAssign",
				},
				{
					name: "unassign",
					chatInputRun: "chatInputPlayerUnassign",
				},
				{
					name: "unassign-id",
					chatInputRun: "chatInputPlayerUnassignId",
				},
			],
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
						.setName("batch-create")
						.setDescription("Creates multiple tryout lobbies at once.")
						.addStringOption((option) =>
							option
								.setName("stage-id")
								.setDescription("The custom ID of the tryout stage.")
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("custom-id-prefix")
								.setDescription(
									"The prefix of the custom ID of the lobbies. (Example: A)",
								)
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("start-date")
								.setDescription(
									"The start date of the lobbies. (Format: YYYY-MM-DD HH:MM)",
								)
								.setRequired(true),
						)
						.addNumberOption((option) =>
							option
								.setName("player-limit")
								.setDescription("The player limit of the lobbies. (Max: 16)")
								.setRequired(true)
								.setMaxValue(16),
						)
						.addNumberOption((option) =>
							option
								.setName("count")
								.setDescription("The amount of lobbies to create. (Max: 8)")
								.setRequired(true)
								.setMaxValue(8),
						)
						.addStringOption((option) =>
							option
								.setName("interval")
								.setDescription(
									"The interval between each lobby. (Format: HH:MM)",
								)
								.setRequired(true),
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
				)
				.addSubcommand((builder: SlashCommandSubcommandBuilder) =>
					builder
						.setName("info")
						.setDescription("Get information about a tryout lobby.")
						.addStringOption((option) =>
							option
								.setName("lobby-id")
								.setDescription(
									"The custom ID of the lobby to get information about.",
								)
								.setRequired(true),
						),
				)
				.addSubcommandGroup((builder: SlashCommandSubcommandGroupBuilder) =>
					builder
						.setName("player")
						.setDescription("Commands for managing players in a tryout lobby.")
						.addSubcommand((builder: SlashCommandSubcommandBuilder) =>
							builder
								.setName("assign")
								.setDescription(
									"Manually assign a player to a tryout lobby. (This will override the player's current lobby)",
								)
								.addStringOption((option) =>
									option
										.setName("lobby-id")
										.setDescription(
											"The ID of the lobby to assign the player to.",
										)
										.setRequired(true),
								)
								.addUserOption((option) =>
									option
										.setName("player")
										.setDescription("The user to assign to the lobby.")
										.setRequired(true),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("unassign")
								.setDescription(
									"Manually unassign a player from a tryout lobby.",
								)
								.addStringOption((option) =>
									option
										.setName("lobby-id")
										.setDescription(
											"The ID of the lobby to unassign the player from.",
										)
										.setRequired(true),
								)
								.addUserOption((option) =>
									option
										.setName("player")
										.setDescription("The user to unassign from the lobby.")
										.setRequired(true),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("unassign-id")
								.setDescription(
									"Manually unassign a player from a tryout lobby by their osu! ID when the user is not in the server.",
								)
								.addStringOption((option) =>
									option
										.setName("lobby-id")
										.setDescription(
											"The ID of the lobby to unassign the player from.",
										)
										.setRequired(true),
								)
								.addStringOption((option) =>
									option
										.setName("player-id")
										.setDescription(
											"The osu! ID of the player to unassign from the lobby.",
										)
										.setRequired(true),
								),
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

	public async chatInputBatchCreate(
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

		const stageId = interaction.options
			.getString("stage-id", true)
			.toUpperCase();
		const customIdPrefix = interaction.options
			.getString("custom-id-prefix", true)
			.toUpperCase();
		const startDateOption = interaction.options.getString("start-date", true);
		const playerLimit = interaction.options.getNumber("player-limit", true);
		const count = interaction.options.getNumber("count", true);
		const interval = interaction.options.getString("interval", true);

		const startDate = DateTime.fromFormat(startDateOption, "yyyy-MM-dd HH:mm", {
			zone: "utc",
		});

		const tryout = await db.tryout.findFirst({
			where: {
				staff_channel_id: interaction.channelId,
			},
			include: {
				stages: {
					where: {
						custom_id: stageId,
					},
				},
			},
		});

		if (!tryout || tryout.stages.length === 0) {
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

		const stage = tryout.stages[0];

		if (startDate < DateTime.fromJSDate(stage.start_date as Date)) {
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

		const lobbies = await db.tryoutLobby.findMany({
			where: {
				stage: {
					tryout_id: tryout.id,
				},
			},
		});

		const existingLobbies = lobbies.filter((lobby) =>
			lobby.custom_id.startsWith(customIdPrefix),
		);

		if (existingLobbies.length > 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Duplicate lobby ID!")
						.setDescription(
							"The custom prefix ID is already in use by another lobby. Please consider using a different one,using the `create` command instead or deleting the existing lobbies.",
						),
				],
			});

			return;
		}

		if (!startDate.isValid) {
			await interaction.editReply({
				embeds: [InvalidDateTime],
			});

			return;
		}

		const intervalDuration = DateTime.fromFormat(interval, "HH:mm", {
			zone: "utc",
		});

		if (!intervalDuration.isValid) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid interval!")
						.setDescription(
							"The interval you provided is invalid. Please make sure it is in the format `HH:MM`.",
						),
				],
			});

			return;
		}

		const lobbiesToCreate: Prisma.TryoutLobbyCreateManyInput[] = [];

		for (let i = 0; i < count; i++) {
			const currentSchedule = startDate.plus({
				hours: intervalDuration.hour * i,
				minutes: intervalDuration.minute * i,
			});

			if (
				currentSchedule.day !== startDate.day ||
				currentSchedule > DateTime.fromJSDate(stage.end_date as Date)
			) {
				break;
			}

			lobbiesToCreate.push({
				id: createId(),
				player_limit: playerLimit,
				custom_id: `${customIdPrefix}${i + 1}`,
				schedule: startDate
					.plus({
						hours: intervalDuration.hour * i,
						minutes: intervalDuration.minute * i,
					})
					.toJSDate(),
				stageId: stage.id,
			});
		}

		let embedDescription = "**__Tryout Lobbies info:__**\n";
		embedDescription += `**Tryout:** \`${tryout.name}\`\n`;
		embedDescription += `**Stage:** \`${stage.name}\` (\`${stage.custom_id}\`)\n`;
		embedDescription += `**Lobby count:** \`${lobbiesToCreate.length}\`\n\n`;
		embedDescription += `**__Details:__**\n`;

		for (const lobby of lobbiesToCreate) {
			embedDescription += `Lobby \`${lobby.custom_id}\`\n`;
			embedDescription += `\\- Unique ID: \`${lobby.id}\`\n`;
			embedDescription += `\\- Start Date: \`${DateTime.fromJSDate(
				lobby.schedule as Date,
				{
					zone: "utc",
				},
			).toRFC2822()}\` (<t:${DateTime.fromJSDate(
				lobby.schedule as Date,
			).toSeconds()}:R>)\n`;
			embedDescription += `\\- Player Limit: \`${lobby.player_limit}\`\n`;
			embedDescription += "\n";
		}

		try {
			await db.tryoutLobby.createMany({
				data: lobbiesToCreate,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Tryout lobbies created!")
						.setDescription(embedDescription),
				],
			});
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("DB error!")
						.setDescription(
							"There was an error while creating the tryout lobbies. All changes will be reverted. Please contact the bot owner if this error persists.",
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

	public async chatInputInfo(
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
							where: {
								custom_id: lobbyId,
							},
							include: {
								referee: true,
								players: {
									include: {
										player: true,
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

		const stage = tryout.stages[0];

		if (stage.lobbies.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("No lobbies!")
						.setDescription("There are no lobbies in this stage yet."),
				],
			});

			return;
		}

		const lobby = stage.lobbies[0];

		let embedDescription = "**Details:**\n";
		embedDescription += `\\- **Stage:** \`${stage.name}\` (\`${stage.custom_id}\`)\n`;
		embedDescription += `\\- **Lobby:** \`${lobby.custom_id}\`\n`;
		embedDescription += `\\- **Referee:** ${
			lobby.referee ? `<@${lobby.referee.discord_id}>` : "*No referee assigned*"
		}\n`;
		embedDescription += `\\- **Schedule:** \`${DateTime.fromJSDate(
			lobby.schedule as Date,
			{
				zone: "utc",
			},
		).toRFC2822()}\` (<t:${DateTime.fromJSDate(
			lobby.schedule as Date,
		).toSeconds()}:R>)\n\n`;
		embedDescription += `**Players (${lobby._count.players}/${lobby.player_limit}):**\n`;

		if (lobby._count.players > 0) {
			for (const player of lobby.players) {
				embedDescription += `\\- ${userMention(player.player.discord_id!)} (\`${
					player.player.osu_username
				}\`)\n`;
			}
		} else {
			embedDescription += "*No players in this lobby*\n";
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`Lobby \`${lobby.custom_id}\` info`)
					.setDescription(embedDescription)
					.setFooter({
						text: `Unique ID: ${lobby.id}`,
					}),
			],
		});
	}

	public async chatInputPlayerAssign(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const lobbyId = interaction.options
			.getString("lobby-id", true)
			.toUpperCase();

		const playerOption = interaction.options.getUser("player", true);

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
							some: {
								custom_id: lobbyId,
							},
						},
					},
					include: {
						lobbies: {
							where: {
								OR: [
									{
										players: {
											some: {
												player: {
													discord_id: playerOption.id,
												},
											},
										},
									},
									{
										custom_id: lobbyId,
									},
								],
							},
							include: {
								players: {
									where: {
										player: {
											discord_id: playerOption.id,
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
				players: {
					where: {
						player: {
							discord_id: playerOption.id,
						},
					},
					include: {
						player: {
							include: {
								tryout_lobbies: {
									where: {
										tryoutLobby: {
											custom_id: lobbyId,
										},
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
							"This command can only be used in a tryout channel.",
						),
				],
			});

			return;
		}

		if (
			!isUserTryoutReferee(interaction, tryout) &&
			!isUserTryoutAdmin(interaction, tryout)
		) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Not a referee!")
						.setDescription(
							"You are not a referee for this tryout. Please contact an organizer if you believe this is a mistake.",
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
						.setTitle("No players!")
						.setDescription(
							"There are no players in this tryout that match the provided osu! ID.",
						),
				],
			});

			return;
		}

		const player = tryout.players[0];

		if (tryout.stages.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("No stages!")
						.setDescription("There are no stages that match the provided ID."),
				],
			});

			return;
		}

		const stage = tryout.stages[0];

		const originLobby = stage.lobbies.find((lobby) => {
			return lobby.custom_id !== lobbyId;
		});

		const destinationLobby = stage.lobbies.find((lobby) => {
			return lobby.custom_id === lobbyId;
		});

		if (!destinationLobby) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid lobby!")
						.setDescription(
							"The lobby you are trying to assign to does not exist.",
						),
				],
			});

			return;
		}

		if (destinationLobby.players.length > 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Already assigned!")
						.setDescription(
							`The player you are trying to assign is already in lobby \`${destinationLobby.custom_id}\`.`,
						),
				],
			});

			return;
		}

		if (originLobby && originLobby.players[0].played) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Already played!")
						.setDescription(
							"You cannot assign a player that has already played a lobby.",
						),
				],
			});

			return;
		}

		if (destinationLobby._count.players >= destinationLobby.player_limit) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Lobby full!")
						.setDescription(
							"The lobby you are trying to assign to is already full.",
						),
				],
			});

			return;
		}

		try {
			if (originLobby) {
				await db.playersOnTryoutLobbies.update({
					where: {
						tryout_lobby_id_user_id: {
							tryout_lobby_id: originLobby.id,
							user_id: player.player.id,
						},
					},
					data: {
						tryout_lobby_id: destinationLobby.id,
					},
				});
			} else {
				await db.playersOnTryoutLobbies.create({
					data: {
						tryout_lobby_id: destinationLobby.id,
						user_id: player.player.id,
					},
				});
			}

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success!")
						.setDescription(
							`Successfully assigned <@${player.player.discord_id}> (\`${player.player.osu_username}\`) to lobby \`${destinationLobby.custom_id}\`.`,
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

			return;
		}
	}

	public async chatInputPlayerUnassign(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const lobbyId = interaction.options
			.getString("lobby-id", true)
			.toUpperCase();

		const playerOption = interaction.options.getUser("player", true);

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
								players: {
									where: {
										player: {
											discord_id: playerOption.id,
										},
									},
									include: {
										player: true,
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
							"This command can only be used in a tryout channel.",
						),
				],
			});

			return;
		}

		if (
			!isUserTryoutReferee(interaction, tryout) &&
			!isUserTryoutAdmin(interaction, tryout)
		) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Not a referee!")
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
						.setTitle("No stages!")
						.setDescription("There are no lobbies that match the provided ID."),
				],
			});

			return;
		}

		//? At this point, lobby is guaranteed to exist because we only bring back stages that have lobbies that match the provided ID.
		const lobby = tryout.stages[0].lobbies[0];

		if (lobby.players.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("No players!")
						.setDescription(
							"The player you are trying to unassign is not in this lobby.",
						),
				],
			});

			return;
		}

		if (lobby.players[0].played) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Already played!")
						.setDescription(
							"You cannot unassign a player that has already played a lobby.",
						),
				],
			});

			return;
		}

		try {
			await db.playersOnTryoutLobbies.delete({
				where: {
					tryout_lobby_id_user_id: {
						tryout_lobby_id: lobby.id,
						user_id: lobby.players[0].player.id,
					},
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success!")
						.setDescription(
							`Successfully unassigned <@${lobby.players[0].player.discord_id}> (\`${lobby.players[0].player.osu_username}\`) from lobby \`${lobby.custom_id}\`.`,
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

	public async chatInputPlayerUnassignId(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const lobbyId = interaction.options
			.getString("lobby-id", true)
			.toUpperCase();

		const playerId = interaction.options.getString("player-id", true);

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
								players: {
									where: {
										player: {
											osu_id: playerId,
										},
									},
									include: {
										player: true,
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
							"This command can only be used in a tryout channel.",
						),
				],
			});

			return;
		}

		if (
			!isUserTryoutReferee(interaction, tryout) &&
			!isUserTryoutAdmin(interaction, tryout)
		) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Not a referee!")
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
						.setTitle("No stages!")
						.setDescription("There are no lobbies that match the provided ID."),
				],
			});

			return;
		}

		//? At this point, lobby is guaranteed to exist because we only bring back stages that have lobbies that match the provided ID.
		const lobby = tryout.stages[0].lobbies[0];

		if (lobby.players.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("No players!")
						.setDescription(
							"The player you are trying to unassign is not in this lobby.",
						),
				],
			});

			return;
		}

		if (lobby.players[0].played) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Already played!")
						.setDescription(
							"You cannot unassign a player that has already played a lobby.",
						),
				],
			});

			return;
		}

		try {
			await db.playersOnTryoutLobbies.delete({
				where: {
					tryout_lobby_id_user_id: {
						tryout_lobby_id: lobby.id,
						user_id: lobby.players[0].player.id,
					},
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success!")
						.setDescription(
							`Successfully unassigned <@${lobby.players[0].player.discord_id}> (\`${lobby.players[0].player.osu_username}\`) from lobby \`${lobby.custom_id}\`.`,
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
}
