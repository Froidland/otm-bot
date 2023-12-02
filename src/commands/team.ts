import db from "@/db";
import { NoAccountEmbed, tournamentTeamInvite } from "@/embeds";
import { hasTournamentOrganizerRole, hasTournamentRefereeRole } from "@/utils";
import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { unparse } from "papaparse";

const timezoneRegex = /^UTC(?:\+|-)(?:\d){1,2}$/;
const urlRegex =
	/[(http(s)?)://(www.)?a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

@ApplyOptions<Subcommand.Options>({
	description: "Team management commands.",
	subcommands: [
		{
			name: "invite",
			chatInputRun: "chatInputInvite",
		},
		{
			name: "kick",
			chatInputRun: "chatInputKick",
		},
		{
			name: "info",
			chatInputRun: "chatInputInfo",
		},
		{
			name: "list",
			chatInputRun: "chatInputList",
		},
		{
			name: "edit",
			type: "group",
			entries: [
				{
					name: "name",
					chatInputRun: "chatInputEditName",
				},
				{
					name: "timezone",
					chatInputRun: "chatInputEditTimezone",
				},
				{
					name: "icon",
					chatInputRun: "chatInputEditIcon",
				},
			],
		},
		{
			name: "remove",
			chatInputRun: "chatInputRemove",
		},
	],
})
export class TeamCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((builder) =>
					builder
						.setName("invite")
						.setDescription("Invite a player to your team.")
						.addUserOption((option) =>
							option
								.setName("player")
								.setDescription("The player you want to invite.")
								.setRequired(true),
						),
				)
				.addSubcommand((builder) =>
					builder
						.setName("kick")
						.setDescription("Kick a player from your team.")
						.addUserOption((option) =>
							option
								.setName("player")
								.setDescription("The player you want to kick.")
								.setRequired(true),
						),
				)
				.addSubcommand((builder) =>
					builder
						.setName("info")
						.setDescription("Get information about a team.")
						.addStringOption((option) =>
							option
								.setName("team-name")
								.setDescription(
									"The name of the team you want to get information about. (Staff only, case insensitive)",
								),
						),
				)
				.addSubcommand((builder) =>
					builder
						.setName("list")
						.setDescription("List all players in your team.")
						.addStringOption((option) =>
							option
								.setName("format")
								.setDescription(
									"The format you want to list the players in. (Default: message)",
								)
								.addChoices(
									{
										name: "Message",
										value: "message",
									},
									{
										name: "CSV",
										value: "csv",
									},
								),
						),
				)
				.addSubcommandGroup((builder) =>
					builder
						.setName("edit")
						.setDescription("!")
						.addSubcommand((builder) =>
							builder
								.setName("name")
								.setDescription("Edit your team name.")
								.addStringOption((option) =>
									option
										.setName("value")
										.setDescription("The new name of your team.")
										.setMinLength(3)
										.setMaxLength(127)
										.setRequired(true),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("timezone")
								.setDescription("Edit your team timezone.")
								.addStringOption((option) =>
									option
										.setName("value")
										.setDescription(
											"The new timezone of your team. (Format: UTC+/-<number>)",
										)
										.setMinLength(5)
										.setMaxLength(16)
										.setRequired(true),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("icon")
								.setDescription("Edit your team icon.")
								.addStringOption((option) =>
									option
										.setName("value")
										.setDescription("The new icon of your team.")
										.setMinLength(3)
										.setMaxLength(255)
										.setRequired(true),
								),
						),
				)
				.addSubcommand((builder) =>
					builder
						.setName("remove")
						.setDescription("Remove a team from the tournament. (Staff only)")
						.addStringOption((option) =>
							option
								.setName("id")
								.setDescription("The unique ID of the team you want to remove.")
								.setRequired(true),
						),
				),
		);
	}

	public async chatInputInvite(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const player = interaction.options.getUser("player", true);

		const user = await db.user.findFirst({
			where: {
				discord_id: interaction.user.id,
			},
			include: {
				teams: {
					where: {
						team: {
							tournament: {
								player_channel_id: interaction.channelId,
							},
						},
					},
					include: {
						team: {
							include: {
								players: {
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

		if (!user || !user.discord_id) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		const tournament = await db.tournament.findFirst({
			where: {
				player_channel_id: interaction.channelId,
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This command can only be used in a tournament player channel.",
						),
				],
			});

			return;
		}

		if (tournament.type === "OneVsOne") {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This command can only be used in a team vs team tournament.",
						),
				],
			});

			return;
		}

		if (tournament.registration_end_date < new Date()) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The registration period for this tournament has ended. You can no longer invite players to your team.",
						),
				],
			});

			return;
		}

		if (!user.teams.length) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You are not part of a team. You can't invite players.",
						),
				],
			});

			return;
		}

		const team = user.teams[0];

		if (team.team.creator_id !== user.id) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You are not the team's captain. Only the team captain can invite players.",
						),
				],
			});

			return;
		}

		if (team.team.players.length >= tournament.max_team_size) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"Your team is already full. You can't invite more players.",
						),
				],
			});

			return;
		}

		const playerData = await db.user.findFirst({
			where: {
				discord_id: player.id,
			},
			include: {
				team_invites: {
					where: {
						team_id: team.team.id,
						status: "Pending",
					},
				},
				teams: {
					where: {
						team_id: team.team.id,
					},
				},
			},
		});

		if (!playerData) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The player you want to invite doesn't have an account.",
						),
				],
			});

			return;
		}

		if (playerData.teams.length > 0) {
			if (playerData.teams[0].team_id === team.team.id) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(
								"The player you want to invite is already in your team.",
							),
					],
				});

				return;
			}

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The player you want to invite is already in a team.",
						),
				],
			});
		}

		if (playerData.team_invites.length > 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The player you want to invite already has a pending invite.",
						),
				],
			});

			return;
		}

		try {
			const message = await player.send(
				tournamentTeamInvite({
					captainDiscordId: user.discord_id,
					captainOsuId: user.osu_id,
					captainOsuUsername: user.osu_username,
					teamName: team.team.name,
					tournamentName: tournament.name,
					players: team.team.players.map((player) => player.player),
				}),
			);

			await db.teamInvite.create({
				data: {
					team_id: team.team.id,
					user_id: playerData.id,
					embed_message_id: message.id,
				},
			});
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occurred while inviting the player. Please try again later.",
						),
				],
			});

			return;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription(
						`You have successfully invited <@${playerData.discord_id}> (\`${playerData.osu_username}\` - \`#${playerData.osu_id}\`) to your team.`,
					),
			],
		});
	}

	public async chatInputKick(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		if (!interaction.guildId) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid channel")
						.setDescription("This command can only be used in a server."),
				],
			});

			return;
		}

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

		const tournament = await db.tournament.findFirst({
			where: {
				OR: [
					{
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
					{
						mappooler_channel_id: interaction.channelId,
					},
					{
						referee_channel_id: interaction.channelId,
					},
				],
			},
			include: {
				teams: {
					where: {
						OR: [
							{
								creator_id: user.id,
							},
							{
								players: {
									some: {
										user_id: user.id,
									},
								},
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
							include: {
								player: true,
							},
						},
					},
				},
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid channel")
						.setDescription(
							"This command can only be used in a tournament channel.",
						),
				],
			});

			return;
		}

		if (tournament.teams.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are not part of a team for this tournament."),
				],
			});

			return;
		}

		const team = tournament.teams[0];

		if (team.creator_id !== user.id) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Teams")
						.setDescription(
							"You are not the team's captain. Only the team captain can kick players.",
						),
				],
			});

			return;
		}

		if (tournament.registration_end_date < new Date()) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The registration period for this tournament has ended. You can no longer kick players from your team. If you really need to, please contact a tournament organizer.",
						),
				],
			});

			return;
		}

		if (team.players.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("The player you want to kick is not in your team."),
				],
			});

			return;
		}

		const player = team.players[0];

		if (player.user_id === user.id) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You can't kick yourself from your team."),
				],
			});

			return;
		}

		try {
			await db.team.update({
				where: {
					id: team.id,
				},
				data: {
					players: {
						delete: {
							team_id_user_id: {
								team_id: team.id,
								user_id: player.user_id,
							},
						},
					},
				},
			});
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occurred while kicking the player. Please try again later.",
						),
				],
			});

			return;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription(
						`You have successfully kicked <@${player.player.discord_id}> (\`${player.player.osu_username}\` - \`#${player.player.osu_id}\`) from your team.`,
					),
			],
		});

		await playerOption.send({
			embeds: [
				new EmbedBuilder()
					.setColor("Yellow")
					.setTitle("Kicked")
					.setDescription(
						`You have been kicked from team \`${team.name}\` for tournament \`${tournament.name}\`.`,
					),
			],
		});

		try {
			const guild = await this.container.client.guilds.fetch(
				interaction.guildId,
			);

			const member = await guild.members.fetch(playerOption.id);

			await member.roles.remove(tournament.player_role_id);
		} catch (error) {
			this.container.logger.error(error);
		}
	}

	public async chatInputInfo(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const teamName = interaction.options.getString("team-name", false)?.trim();

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

		const tournament = await db.tournament.findFirst({
			where: {
				OR: [
					{
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
					{
						mappooler_channel_id: interaction.channelId,
					},
					{
						referee_channel_id: interaction.channelId,
					},
				],
			},
			include: {
				teams: {
					where: teamName
						? {
								name: teamName,
						  }
						: {
								OR: [
									{
										creator_id: user.id,
									},
									{
										players: {
											some: {
												user_id: user.id,
											},
										},
									},
								],
						  },
					include: {
						creator: true,
						players: {
							include: {
								player: true,
							},
						},
					},
				},
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid channel")
						.setDescription(
							"This command can only be used in a tournament channel.",
						),
				],
			});

			return;
		}

		if (teamName) {
			if (
				!hasTournamentOrganizerRole(interaction, tournament) &&
				!hasTournamentRefereeRole(interaction, tournament)
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
		}

		if (tournament.teams.length < 1) {
			if (teamName) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(
								`There is no team registered for this tournament with the name \`${teamName}\`.`,
							),
					],
				});

				return;
			}

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are not part of a team for this tournament."),
				],
			});

			return;
		}

		const team = tournament.teams[0];

		let embedDescription = `**Team name:** \`${team.name}\`\n`;
		embedDescription += `**Team captain:** <@${team.creator.discord_id}> (\`${team.creator.osu_username}\` - \`#${team.creator.osu_id}\`)\n`;
		embedDescription += "**Players:**\n";

		for (const player of team.players) {
			embedDescription += `<@${player.player.discord_id}> (\`${player.player.osu_username}\` - \`#${player.player.osu_id}\`)\n`;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Blue")
					.setTitle("Team info")
					.setDescription(embedDescription)
					.setFooter({
						text: `Unique ID: ${team.id}`,
					}),
			],
		});
	}

	public async chatInputList(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const format = interaction.options.getString("format", false) || "message";

		if (format === "message") {
			await this.handleListMessage(interaction);

			return;
		}

		if (format === "csv") {
			await this.handleListCSV(interaction);

			return;
		}
	}

	// TODO: Add pagination.
	private async handleListMessage(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
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

		const tournament = await db.tournament.findFirst({
			where: {
				OR: [
					{
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
					{
						mappooler_channel_id: interaction.channelId,
					},
					{
						referee_channel_id: interaction.channelId,
					},
				],
			},
			include: {
				teams: {
					include: {
						creator: true,
						_count: {
							select: {
								players: true,
							},
						},
					},
				},
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This command can only be used in a tournament channel.",
						),
				],
			});

			return;
		}

		if (!hasTournamentOrganizerRole(interaction, tournament)) {
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

		const teams = tournament.teams;

		if (teams.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Blue")
						.setTitle("Teams")
						.setDescription(
							"There are no teams registered for this tournament.",
						),
				],
			});

			return;
		}

		let embedDescription = `There is a total of \`${teams.length}\` teams registered for the tournament.\n`;
		embedDescription += "List of teams:\n";

		for (const team of teams) {
			embedDescription += `\`${team.name}\` - <@${team.creator.discord_id}> (\`${team.creator.osu_username}\` - \`#${team.creator.osu_id}\`) | \`${team._count.players}\` players\n`;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Blue")
					.setTitle("Teams")
					.setDescription(embedDescription),
			],
		});
	}

	private async handleListCSV(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
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

		const tournament = await db.tournament.findFirst({
			where: {
				OR: [
					{
						staff_channel_id: interaction.channelId,
					},
					{
						mappooler_channel_id: interaction.channelId,
					},
					{
						referee_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
			},
			include: {
				teams: {
					include: {
						creator: true,
						qualifier_lobby: true,
					},
				},
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This command can only be used in a tournament channel.",
						),
				],
			});

			return;
		}

		if (!hasTournamentOrganizerRole(interaction, tournament)) {
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

		const teams = tournament.teams;

		if (teams.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Blue")
						.setTitle("Teams")
						.setDescription(
							"There are no teams registered for this tournament.",
						),
				],
			});

			return;
		}

		const csv = unparse(
			{
				fields: [
					"team_id",
					"team_name",
					"captain_discord_id",
					"captain_discord_username",
					"captain_osu_id",
					"captain_osu_username",
					"qualifier_lobby_id",
				],
				data: teams.map((team) => {
					return [
						team.id,
						team.name,
						team.creator.discord_id,
						team.creator.discord_username,
						team.creator.osu_id,
						team.creator.osu_username,
						team.qualifier_lobby?.id || "Not scheduled",
					];
				}),
			},
			{
				quotes: true,
			},
		);

		const data = Buffer.from(csv, "utf-8");

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Blue")
					.setTitle("Teams")
					.setDescription(
						`There are a total of \`${teams.length}\` teams registered for this tournament.`,
					),
			],
			files: [
				new AttachmentBuilder(data)
					.setName("teams.csv")
					.setDescription("List of teams in CSV format."),
			],
		});
	}

	public async chatInputEditName(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const name = interaction.options.getString("value", true).trim();

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

		const tournament = await db.tournament.findFirst({
			where: {
				OR: [
					{
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
					{
						mappooler_channel_id: interaction.channelId,
					},
					{
						referee_channel_id: interaction.channelId,
					},
				],
			},
			include: {
				teams: {
					where: {
						OR: [
							{
								creator_id: user.id,
							},
							{
								players: {
									some: {
										user_id: user.id,
									},
								},
							},
						],
					},
				},
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid channel")
						.setDescription(
							"This command can only be used in a tournament channel.",
						),
				],
			});

			return;
		}

		if (tournament.teams.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are not part of a team for this tournament."),
				],
			});

			return;
		}

		if (tournament.type !== "TeamVsTeam") {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This command can only be used in a team vs team tournament.",
						),
				],
			});

			return;
		}

		const team = tournament.teams[0];

		if (team.creator_id !== user.id) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You are not the team's captain. Only the team captain can edit the team name.",
						),
				],
			});

			return;
		}

		if (tournament.registration_end_date < new Date()) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The registration period for this tournament has ended. You can no longer edit your team name.",
						),
				],
			});

			return;
		}

		try {
			await db.team.update({
				where: {
					id: team.id,
				},
				data: {
					name,
				},
			});
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occurred while editing the team name. Please try again later.",
						),
				],
			});

			return;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription(
						`You have successfully edited your team name to \`${name}\`.`,
					),
			],
		});
	}

	public async chatInputEditTimezone(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const timezone = interaction.options
			.getString("value", true)
			.trim()
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

		const tournament = await db.tournament.findFirst({
			where: {
				OR: [
					{
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
					{
						mappooler_channel_id: interaction.channelId,
					},
					{
						referee_channel_id: interaction.channelId,
					},
				],
			},
			include: {
				teams: {
					where: {
						OR: [
							{
								creator_id: user.id,
							},
							{
								players: {
									some: {
										user_id: user.id,
									},
								},
							},
						],
					},
				},
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid channel")
						.setDescription(
							"This command can only be used in a tournament channel.",
						),
				],
			});

			return;
		}

		if (tournament.teams.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are not part of a team for this tournament."),
				],
			});

			return;
		}

		if (!timezoneRegex.test(timezone)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid Timezone")
						.setDescription(
							"Please provide a valid timezone. A valid timezone is in the format of `UTC+/-<number>`.",
						),
				],
			});

			return;
		}

		const team = tournament.teams[0];

		if (team.creator_id !== user.id) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You are not the team's captain. Only the team captain can edit the team name.",
						),
				],
			});

			return;
		}

		if (tournament.registration_end_date < new Date()) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The registration period for this tournament has ended. You can no longer edit your team name.",
						),
				],
			});

			return;
		}

		try {
			await db.team.update({
				where: {
					id: team.id,
				},
				data: {
					timezone,
				},
			});
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occurred while editing the team timezone. Please try again later.",
						),
				],
			});

			return;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription(
						`You have successfully edited your team timezone to \`${timezone}\`.`,
					),
			],
		});
	}

	public async chatInputEditIcon(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const icon = interaction.options.getString("value", true).trim();

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

		const tournament = await db.tournament.findFirst({
			where: {
				OR: [
					{
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
					{
						mappooler_channel_id: interaction.channelId,
					},
					{
						referee_channel_id: interaction.channelId,
					},
				],
			},
			include: {
				teams: {
					where: {
						OR: [
							{
								creator_id: user.id,
							},
							{
								players: {
									some: {
										user_id: user.id,
									},
								},
							},
						],
					},
				},
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid channel")
						.setDescription(
							"This command can only be used in a tournament channel.",
						),
				],
			});

			return;
		}

		if (tournament.teams.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are not part of a team for this tournament."),
				],
			});

			return;
		}

		if (tournament.type !== "TeamVsTeam") {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This command can only be used in a team vs team tournament.",
						),
				],
			});

			return;
		}

		const team = tournament.teams[0];

		if (team.creator_id !== user.id) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You are not the team's captain. Only the team captain can edit the team name.",
						),
				],
			});

			return;
		}

		if (tournament.registration_end_date < new Date()) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The registration period for this tournament has ended. You can no longer edit your team name.",
						),
				],
			});

			return;
		}

		if (!urlRegex.test(icon)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid Icon URL")
						.setDescription("Please provide a valid URL for your team icon."),
				],
			});

			return;
		}

		try {
			await db.team.update({
				where: {
					id: team.id,
				},
				data: {
					icon_url: icon,
				},
			});
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occurred while editing the team icon. Please try again later.",
						),
				],
			});

			return;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription(
						`You have successfully edited your team icon to \`${icon}\`.`,
					)
					.setThumbnail(icon),
			],
		});
	}

	public async chatInputRemove(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const teamId = interaction.options.getString("id", true).trim();

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

		const tournament = await db.tournament.findFirst({
			where: {
				OR: [
					{
						staff_channel_id: interaction.channelId,
					},
					{
						mappooler_channel_id: interaction.channelId,
					},
					{
						referee_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
			},
			include: {
				teams: {
					where: {
						id: teamId,
					},
					include: {
						players: {
							include: {
								player: true,
							},
						},
					},
				},
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid channel")
						.setDescription(
							"This command can only be used in a tournament channel.",
						),
				],
			});

			return;
		}

		if (!hasTournamentOrganizerRole(interaction, tournament)) {
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

		if (tournament.teams.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Team not found")
						.setDescription(
							"There is no team registered for this tournament with the provided ID.",
						),
				],
			});

			return;
		}

		const team = tournament.teams[0];

		try {
			await db.team.delete({
				where: {
					id: team.id,
				},
			});
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"There was an error while removing the team. Please try again later.",
						),
				],
			});

			return;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription(
						`You have successfully removed team \`${team.name}\`. The members of the team have been notified.`,
					),
			],
		});

		for (const player of team.players) {
			if (!player.player.discord_id) {
				continue;
			}

			try {
				const user = await this.container.client.users.fetch(
					player.player.discord_id,
				);

				await user.send({
					embeds: [
						new EmbedBuilder()
							.setColor("Yellow")
							.setTitle("Team Removed")
							.setDescription(
								`Your team \`${team.name}\` has been removed from tournament \`${tournament.name}\`. This action was performed by the tournament organizers, if you believe this is a mistake, please contact them.`,
							),
					],
				});
			} catch (error) {
				this.container.logger.error(error);
			}
		}
	}
}
