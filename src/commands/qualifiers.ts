import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import {
	hasTournamentMappoolerRole,
	hasTournamentOrganizerRole,
} from "@/utils";
import { createId } from "@paralleldrive/cuid2";
import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { APIEmbedField, EmbedBuilder } from "discord.js";
import { DateTime } from "luxon";
import { v2 } from "osu-api-extended";

const modCombinations = [
	"HD",
	"HR",
	"DT",
	"FL",
	"EZ",
	"HT",
	"HDHR",
	"HDDT",
	"DTHR",
	"HDDTHR",
	"FLHD",
	"FLHR",
	"FLDT",
	"FLHDHR",
	"FLHDDT",
	"FLHDDTHR",
	"EZHD",
	"EZDT",
	"EZHDDT",
	"EZFLHDDT",
	"HTHD",
	"HTHR",
	"HTHDHR",
	"HTEZ",
	"HTFL",
	"HTEZFL",
	"HTEZFLHD",
	"FM",
	"FMDT",
	"FMHT",
];

@ApplyOptions<Subcommand.Options>({
	description: "Qualifiers management commands.",
	subcommands: [
		{
			name: "map",
			type: "group",
			entries: [
				{
					name: "set",
					chatInputRun: "chatInputMapSet",
				},
				{
					name: "remove",
					chatInputRun: "chatInputMapRemove",
				},
				{
					name: "order",
					chatInputRun: "chatInputMapOrder",
				},
			],
		},
		{
			name: "schedule",
			chatInputRun: "chatInputSchedule",
		},
	],
})
export class QualifiersCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName("qualifiers")
				.setDescription("!")
				.addSubcommandGroup((builder) =>
					builder
						.setName("map")
						.setDescription("!")
						.addSubcommand((builder) =>
							builder
								.setName("set")
								.setDescription(
									"Set a specific pick for the tournament's qualifiers mappool",
								)
								.addStringOption((option) =>
									option
										.setName("pick")
										.setDescription(
											"The pick to set the map for. (Example: NM2)",
										)
										.setRequired(true),
								)
								.addNumberOption((option) =>
									option
										.setName("beatmap-id")
										.setDescription(
											"The beatmap ID of the map to set. (Not to be confused with the beatmapset ID)",
										)
										.setRequired(true),
								)
								.addStringOption((option) =>
									option
										.setName("mods")
										.setDescription(
											"The mods to set the map for. (Example: HDHR, defaults to NM, NF is enforced)",
										)
										.setRequired(false),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("remove")
								.setDescription(
									"Remove a specific pick from the tournament's qualifiers mappool",
								)
								.addStringOption((option) =>
									option
										.setName("pick")
										.setDescription("The pick to remove. (Example: NM2)")
										.setRequired(true),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("order")
								.setDescription(
									"Set the order of the tournament's qualifiers mappool",
								)
								.addStringOption((option) =>
									option
										.setName("pattern")
										.setDescription(
											"The pattern of the order. Basically the picks separated by spaces. (Example: NM1 NM2 NM3 HD1 HD2 TB)",
										)
										.setRequired(true),
								),
						),
				)
				.addSubcommand((builder) =>
					builder
						.setName("schedule")
						.setDescription(
							"Shchedule a qualifiers lobby for you or your team.",
						)
						.addStringOption((option) =>
							option
								.setName("date")
								.setDescription(
									"The date to schedule the lobby for in UTC. (Format: YYYY-MM-DD HH:MM)",
								)
								.setRequired(true),
						),
				),
		);
	}

	public async chatInputMapSet(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const pick = interaction.options.getString("pick", true).toUpperCase();
		const beatmapId = interaction.options.getNumber("beatmap-id", true);
		const mods = (
			interaction.options.getString("mods", false) || "NM"
		).toUpperCase();

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
				],
			},
			include: {
				qualifier: true,
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This command can only be executed in a tournament staff or mappooler channel.",
						),
				],
			});

			return;
		}

		if (
			!hasTournamentMappoolerRole(interaction, tournament) &&
			!hasTournamentOrganizerRole(interaction, tournament)
		) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You don't have permission to do that."),
				],
			});

			return;
		}

		if (!tournament.qualifier) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This tournament has no qualifiers."),
				],
			});

			return;
		}

		if (!modCombinations.includes(mods)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid mods!")
						.setDescription(
							`The mods you provided are invalid. Valid combinations are: ${modCombinations
								.map((m) => `\`${m}\``)
								.join(", ")}.`,
						),
				],
			});

			return;
		}

		let beatmap = await db.beatmap.findFirst({
			where: {
				id: beatmapId,
			},
		});

		if (!beatmap) {
			const apiBeatmap = await v2.beatmap.id.details(beatmapId);

			// @ts-expect-error osu! api wrapper shenanigans
			if (apiBeatmap["error"] !== undefined) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(`Beatmap with ID \`${beatmapId}\` not found.`),
					],
				});

				return;
			}

			try {
				beatmap = await db.beatmap.create({
					data: {
						id: apiBeatmap.id,
						beatmapset_id: apiBeatmap.beatmapset_id,
						artist: apiBeatmap.beatmapset.artist,
						title: apiBeatmap.beatmapset.title,
						difficulty_rating: apiBeatmap.difficulty_rating,
						circle_size: apiBeatmap.cs,
						hp_drain: apiBeatmap.drain,
						accuracy: apiBeatmap.accuracy,
						approach_rate: apiBeatmap.ar,
						mode: apiBeatmap.mode,
						status: apiBeatmap.status,
						total_length: apiBeatmap.total_length,
						creator: apiBeatmap.beatmapset.creator,
						version: apiBeatmap.version,
						cover_url: apiBeatmap.beatmapset.covers.cover,
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
								`There was an error while trying to fetch the beatmap. Please try again later.`,
							),
					],
				});

				return;
			}
		}

		const mapLengthFormat = `${(beatmap.total_length / 60)
			.toFixed(0)
			.padStart(2, "0")}:${(beatmap.total_length % 60)
			.toString()
			.padStart(2, "0")}`;

		const embedDescription = `[${beatmap.artist} - ${beatmap.title} [${beatmap.version}]](https://osu.ppy.sh/beatmaps/${beatmap.id}) has been set as the **${pick}** pick for the qualifiers mappool.`;
		const fields: APIEmbedField[] = [
			{
				name: "Star rating",
				value: beatmap.difficulty_rating.toFixed(2),
				inline: true,
			},
			{
				name: "Total length",
				value: mapLengthFormat,
				inline: true,
			},
			{
				name: "CS",
				value: beatmap.circle_size.toFixed(1),
				inline: true,
			},
			{
				name: "AR",
				value: beatmap.approach_rate.toFixed(1),
				inline: true,
			},
			{
				name: "OD",
				value: beatmap.accuracy.toFixed(1),
				inline: true,
			},
			{
				name: "HP",
				value: beatmap.hp_drain.toFixed(1),
				inline: true,
			},
		];

		try {
			await db.tournamentQualifier.update({
				where: {
					id: tournament.qualifier.id,
				},
				data: {
					mappool: {
						upsert: {
							where: {
								pick_id_qualifier_id: {
									pick_id: pick,
									qualifier_id: tournament.qualifier.id,
								},
							},
							create: {
								pick_id: pick,
								beatmap_id: beatmap.id,
								mods,
							},
							update: {
								beatmap_id: beatmap.id,
								mods,
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
							"An error occurred while setting the map. Please try again later.",
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
					.setDescription(embedDescription)
					.setFields(fields),
			],
		});
	}

	public async chatInputMapRemove(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const pick = interaction.options.getString("pick", true).toUpperCase();

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
				],
			},
			include: {
				qualifier: {
					include: {
						mappool: {
							where: {
								pick_id: pick,
							},
							include: {
								beatmap: true,
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
							"This command can only be executed in a tournament staff or mappooler channel.",
						),
				],
			});

			return;
		}

		if (!tournament.qualifier || !tournament.tournamentQualifierId) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This tournament has no qualifiers."),
				],
			});

			return;
		}

		if (
			!hasTournamentMappoolerRole(interaction, tournament) &&
			!hasTournamentOrganizerRole(interaction, tournament)
		) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You don't have permission to do that."),
				],
			});

			return;
		}

		if (tournament.qualifier.mappool.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							`The pick \`${pick}\` doesn't exist in the qualifiers mappool.`,
						),
				],
			});

			return;
		}

		const beatmap = tournament.qualifier.mappool[0].beatmap;
		const newMappoolOrder = tournament.qualifier.mappool_order
			.split(" ")
			.filter((p) => p !== pick);

		const embedDescription = `[${beatmap?.artist} - ${beatmap?.title} [${beatmap?.version}]](https://osu.ppy.sh/beatmaps/${beatmap?.id}) has removed as the \`${pick}\` from the qualifiers mappool.`;

		try {
			await db.tournamentQualifier.update({
				where: {
					id: tournament.qualifier.id,
				},
				data: {
					mappool: {
						delete: {
							pick_id_qualifier_id: {
								pick_id: pick,
								qualifier_id: tournament.qualifier.id,
							},
						},
					},
					mappool_order: newMappoolOrder.join(" "),
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
							"An error occurred while removing the map. Please try again later.",
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
					.setDescription(embedDescription),
			],
		});
	}

	public async chatInputMapOrder(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const pattern = interaction.options
			.getString("pattern", true)
			.toUpperCase()
			.split(" ");

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
				],
			},
			include: {
				qualifier: {
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

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This command can only be executed in a tournament staff or mappooler channel.",
						),
				],
			});

			return;
		}

		if (!tournament.qualifier) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This tournament has no qualifiers."),
				],
			});

			return;
		}

		if (
			!hasTournamentMappoolerRole(interaction, tournament) &&
			!hasTournamentOrganizerRole(interaction, tournament)
		) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You don't have permission to do that."),
				],
			});

			return;
		}

		const missingPicks = tournament.qualifier.mappool.filter((pick) => {
			return !pattern.includes(pick.pick_id);
		});

		if (missingPicks.length > 0) {
			// TODO: Make this look better.
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid pattern!")
						.setDescription(
							`The following picks are missing from the pattern: \n${missingPicks
								.map(
									(pick) =>
										`\\- \`${pick.pick_id}\` | [${pick.beatmap!.title} [${
											pick.beatmap!.version
										}]](https://osu.ppy.sh/beatmaps/${pick.beatmap!.id})`,
								)
								.join("\n")}`,
						),
				],
			});

			return;
		}

		try {
			await db.tournamentQualifier.update({
				where: {
					id: tournament.qualifier.id,
				},
				data: {
					mappool_order: pattern.join(" "),
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
							"An error occurred while setting the order. Please try again later.",
						),
				],
			});

			return;
		}

		await interaction.editReply({
			embeds: [
				// TODO: Maybe display each pick's beatmap info.
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Map order set!")
					.setDescription(
						`The map order for the tournament's qualifiers has been set to:\n ${pattern
							.map((pick) => "`" + pick + "`")
							.join(" -> ")}`,
					),
			],
		});
	}

	public async chatInputSchedule(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const id = createId();
		const dateString = interaction.options.getString("date", true);

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
				player_channel_id: interaction.channelId,
			},
			include: {
				teams: {
					where: {
						OR: [
							{
								players: {
									some: {
										user_id: user.id,
									},
								},
							},
							{
								creator_id: user.id,
							},
						],
					},
				},
				qualifier: true,
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This command can only be executed in a tournament player channel.",
						),
				],
			});

			return;
		}

		if (!tournament.qualifier) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This tournament has no qualifiers."),
				],
			});

			return;
		}

		if (tournament.teams.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are not in a team for this tournament."),
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
							"Only the team captain can schedule a lobby for the team.",
						),
				],
			});

			return;
		}

		if (team.qualifier_played) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"Your team has already played their qualifier lobby.",
						),
				],
			});

			return;
		}

		const date = DateTime.fromFormat(dateString, "yyyy-MM-dd HH:mm", {
			zone: "utc",
		});

		if (!date.isValid) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid date!")
						.setDescription(
							`The date you provided is invalid. Please use the following format: \`YYYY-MM-DD HH:MM\``,
						),
				],
			});

			return;
		}

		if (date < DateTime.now().plus({ minutes: 5 })) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid date!")
						.setDescription(
							`The date you provided is invalid. The lobby must be scheduled at least 5 minutes in the future.`,
						),
				],
			});

			return;
		}

		if (date.toJSDate() > tournament.qualifier.deadline) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid date!")
						.setDescription(
							`The date you provided is invalid. The deadline for scheduling a lobby is \`${DateTime.fromJSDate(
								tournament.qualifier.deadline,
							).toFormat("DDDD T")}\`.`,
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
					qualifier_lobby: {
						upsert: {
							create: {
								id,
								schedule: date.toJSDate(),
								tournament_qualifier_id: tournament.qualifier.id,
							},
							update: {
								schedule: date.toJSDate(),
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
							"An error occurred while scheduling the lobby. Please try again later.",
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
						`Your qualifier lobby has been scheduled for \`${date.toFormat(
							"ccc, LL LLL yyyy HH:mm",
						)}\`.`,
					)
					.setFooter({
						text: `Unique ID: ${id}`,
					}),
			],
		});
	}
}
