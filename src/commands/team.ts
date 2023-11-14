import db from "@/db";
import { NoAccountEmbed, tournamentTeamInvite } from "@/embeds";
import { hasTournamentOrganizerRole } from "@/utils";
import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { unparse } from "papaparse";

@ApplyOptions<Subcommand.Options>({
	description: "Team management commands.",
	subcommands: [
		{
			name: "invite",
			chatInputRun: "chatInputRunInvite",
		},
		{
			name: "kick",
			chatInputRun: "chatInputRunKick",
		},
		{
			name: "list",
			chatInputRun: "chatInputRunList",
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
				),
		);
	}

	public async chatInputRunInvite(
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

		if (!user) {
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
					captainDiscordId: user.discord_id!,
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

	public async chatInputRunKick(
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
								creator: true,
								tournament: true,
								players: {
									where: {
										player: {
											discord_id: player.id,
										},
									},
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

		if (user.teams.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"Either this channel is not a tournament player channel or you are not part of a team for this tournament.",
						),
				],
			});

			return;
		}

		const tournament = user.teams[0].team.tournament;
		const team = user.teams[0].team;

		if (team.players.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The player you are trying to kick is not in your team.",
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
	}

	public async chatInputRunList(
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
}
