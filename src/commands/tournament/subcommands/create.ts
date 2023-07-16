import { isMemberAdmin } from "@/commands/utils";
import db, { ScoringType, TournamentType, WinCondition } from "@/db";
import { NoAccountEmbed, NoAdminEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces/subCommand";
import { logger } from "@/utils";
import { createId } from "@paralleldrive/cuid2";
import {
	CategoryChannel,
	ChannelType,
	ChatInputCommandInteraction,
	EmbedBuilder,
	GuildBasedChannel,
	PermissionFlagsBits,
	Role,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { DateTime } from "luxon";

export const create: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("create")
		.setDescription("Create a tournament.")
		.addStringOption((option) =>
			option
				.setName("name")
				.setDescription("The name of the tournament. (Max. 64 characters)")
				.setRequired(true)
				.setMaxLength(64)
		)
		.addStringOption((option) =>
			option
				.setName("acronym")
				.setDescription(
					"The acronym for the tournament. (Max. 16 characters, will be transformed to uppercase.)"
				)
				.setRequired(true)
				.setMaxLength(16)
		)
		.addStringOption((option) =>
			option
				.setName("win-condition")
				.setDescription("The win condition rule for the tournament.")
				.setRequired(true)
				.addChoices(
					{ name: "Score", value: "Score" },
					{ name: "Accuracy", value: "Accuracy" },
					{ name: "Miss count", value: "MissCount" }
				)
		)
		.addStringOption((option) =>
			option
				.setName("scoring")
				.setDescription("The scoring type the tournament is based on.")
				.setRequired(true)
				.addChoices(
					{ name: "ScoreV1", value: "ScoreV1" },
					{ name: "ScoreV2", value: "ScoreV2" }
				)
		)
		.addStringOption((option) =>
			option
				.setName("type")
				.setDescription("The type of tournament it will be.")
				.setRequired(true)
				.addChoices(
					{
						name: "Team based",
						value: "TeamBased",
					},
					{
						name: "One vs One",
						value: "OneVsOne",
					}
				)
		)
		.addStringOption((option) =>
			option
				.setName("start-date")
				.setDescription(
					"The date at which the tournament will start. (Format: YYYY-MM-DD HH:MM)"
				)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("registration-end-date")
				.setDescription(
					"The date at which the registration for the tournament will end. (Format: YYYY-MM-DD HH:MM)"
				)
				.setRequired(true)
		)
		.addNumberOption((option) =>
			option
				.setName("team-size")
				.setDescription(
					"The size of the teams for the tournament. (Defaults to 8, max. 64)"
				)
				.setMaxValue(64)
				.setRequired(true)
		)
		.addNumberOption((option) =>
			option
				.setName("lobby-team-size")
				.setDescription(
					"The amount of players per team in the lobby. (Can't be higher than the team size)"
				)
				.setRequired(true)
		)
		.addChannelOption((option) =>
			option
				.setName("schedule-channel")
				.setDescription(
					"The channel where the schedules for the tournament will be posted."
				)
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)
		)
		.addRoleOption((option) =>
			option
				.setName("staff-role")
				.setDescription(
					"The staff role for the tournament. One will be created based on the acronym if not specified."
				)
				.setRequired(false)
		)
		.addRoleOption((option) =>
			option
				.setName("mappooler-role")
				.setDescription(
					"The mappooler role for the tournament. One will be created based on the acronym if not specified."
				)
				.setRequired(false)
		)
		.addRoleOption((option) =>
			option
				.setName("referee-role")
				.setDescription(
					"The referee role for the tournament. One will be created based on the acronym if not specified."
				)
				.setRequired(false)
		)
		.addRoleOption((option) =>
			option
				.setName("player-role")
				.setDescription(
					"The player role for the tournament. One will be created based on the acronym if not specified."
				)
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option
				.setName("parent-category")
				.setDescription(
					"The category under which the created channels will be placed."
				)
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();
		const hasAdminPermission = isMemberAdmin(interaction);

		if (!hasAdminPermission) {
			await interaction.editReply({
				embeds: [NoAdminEmbed],
			});

			return;
		}

		const id = createId();

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

		const name = interaction.options.getString("name", true);

		const acronym = interaction.options
			.getString("acronym", true)
			.toUpperCase();

		const tournamentType = interaction.options.getString(
			"type",
			true
		) as TournamentType;

		const teamSize = interaction.options.getNumber("team-size", true);

		const lobbyTeamSize = interaction.options.getNumber(
			"lobby-team-size",
			true
		);

		const winCondition = interaction.options.getString(
			"win-condition",
			true
		) as WinCondition;

		const scoring = interaction.options.getString(
			"scoring",
			true
		) as ScoringType;

		const startDateString = interaction.options.getString("start-date", true);

		const registrationEndDateString = interaction.options.getString(
			"registration-end-date",
			true
		);

		const startDate = DateTime.fromFormat(startDateString, "yyyy-MM-dd HH:mm", {
			zone: "utc",
		});

		const registrationEndDate = DateTime.fromFormat(
			registrationEndDateString,
			"yyyy-MM-dd HH:mm",
			{
				zone: "utc",
			}
		);

		// TODO: Maybe give feedback on each error instead of just one generic error message.
		if (!startDate.isValid || !registrationEndDate.isValid) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid date!")
						.setDescription(
							"One of the dates you provided is invalid. Please use the format `YYYY-MM-DD HH:MM` for the dates."
						),
				],
			});

			return;
		}

		if (startDate > registrationEndDate) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid date!")
						.setDescription(
							"The registration end date cannot be before the start date."
						),
				],
			});

			return;
		}

		// TODO: Check for schedule channel collisions.

		const [staffRole, mappoolerRole, refereeRole, playerRole] =
			await getTournamentRoles(interaction);

		const [
			staffChannel,
			mappoolerChannel,
			refereeChannel,
			scheduleChannel,
			playerChannel,
		] = await getTournamentChannels(
			interaction,
			staffRole,
			mappoolerRole,
			refereeRole,
			playerRole
		);

		let embedDescription = "**__Tournament info:__**\n";
		embedDescription += `**\\- Name:** \`${name}\`\n`;
		embedDescription += `**\\- Acronym:** \`${acronym}\`\n`;
		embedDescription += `**\\- Owner:** \`${interaction.user.tag}\`\n`;
		embedDescription += "-------------------------------------------\n";
		embedDescription += "**__Tournament settings:__**\n";
		embedDescription += `**\\- Type:** \`${tournamentType}\`\n`;
		embedDescription += `**\\- Scoring:** \`${scoring}\`\n`;
		embedDescription += `**\\- Win condition:** \`${winCondition}\`\n`;
		embedDescription += `**\\- Team size:** \`${teamSize ?? 8}\`\n`;
		embedDescription += `**\\- Start date:** \`${startDate.toRFC2822()}\` (<t:${startDate.toSeconds()}:R>)\n`;
		embedDescription += `**\\- Registration end date:** \`${registrationEndDate.toRFC2822()}\` (<t:${registrationEndDate.toSeconds()}:R>)\n`;
		embedDescription += "-------------------------------------------\n";
		embedDescription += "**__Tournament roles:__**\n";
		embedDescription += `**\\- Staff:** <@&${staffRole.id}>\n`;
		embedDescription += `**\\- Mappooler:** <@&${mappoolerRole.id}>\n`;
		embedDescription += `**\\- Referee:** <@&${refereeRole.id}>\n`;
		embedDescription += `**\\- Player:** <@&${playerRole.id}>\n`;
		embedDescription += "-------------------------------------------\n";
		embedDescription += "**__Tournament channels:__**\n";
		embedDescription += `**\\- Staff:** <#${staffChannel.id}>\n`;
		embedDescription += `**\\- Mappooler:** <#${mappoolerChannel.id}>\n`;
		embedDescription += `**\\- Referee:** <#${refereeChannel.id}>\n`;
		embedDescription += `**\\- Schedules:** <#${scheduleChannel.id}>\n`;
		embedDescription += `**\\- Player:** <#${playerChannel.id}>\n`;

		try {
			await db.tournament.create({
				data: {
					id,
					name,
					acronym,
					serverId: interaction.guild!.id,
					startDate: startDate.toJSDate(),
					registrationEndDate: registrationEndDate.toJSDate(),
					staffChannelId: staffChannel.id,
					mappolerChannelId: mappoolerChannel.id,
					refereeChannelId: refereeChannel.id,
					scheduleChannelId: scheduleChannel.id,
					playerChannelId: playerChannel.id,
					staffRoleId: staffRole.id,
					mappolerRoleId: mappoolerRole.id,
					refereeRoleId: refereeRole.id,
					playerRoleId: playerRole.id,
					owner: {
						connect: {
							discordId: interaction.user.id,
						},
					},
					winCondition,
					scoring,
					type: tournamentType,
					teamSize,
					lobbyTeamSize,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Tournament created!")
						.setDescription(embedDescription)
						.setFooter({
							text: `Unique ID: ${id}`,
						}),
				],
			});
		} catch (error) {
			logger.error(`Error while creating tournament: ${error}`);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("DB error!")
						.setDescription(
							"There was an error while creating the tournament. All changes will be reverted. Please contact the bot owner if this error persists."
						),
				],
			});

			// Roles
			await staffRole.delete();
			await mappoolerRole.delete();
			await refereeRole.delete();
			await playerRole.delete();

			// Channels
			await staffChannel.delete();
			await mappoolerChannel.delete();
			await refereeChannel.delete();
			await scheduleChannel.delete();
			await playerChannel.delete();

			return;
		}
	},
};

/**
 *
 * @description Creates or gets the roles for the tournament with the correct permissions.
 * @returns An array containing the staff, referee and player roles, in that order.
 */
async function getTournamentRoles(interaction: ChatInputCommandInteraction) {
	const guild = interaction.guild!;
	const acronym = interaction.options.getString("acronym", true);

	let staffRole = interaction.options.getRole("staff-role") as Role | null;

	let mappoolerRole = interaction.options.getRole(
		"mappooler-role"
	) as Role | null;

	let refereeRole = interaction.options.getRole("referee-role") as Role | null;

	let playerRole = interaction.options.getRole("player-role") as Role | null;

	if (!staffRole) {
		staffRole = await guild.roles.create({
			name: `${acronym}: Staff`,
		});
	}

	if (!mappoolerRole) {
		mappoolerRole = await guild.roles.create({
			name: `${acronym}: Mappooler`,
		});
	}

	if (!refereeRole) {
		refereeRole = await guild.roles.create({
			name: `${acronym}: Referee`,
		});
	}

	if (!playerRole) {
		playerRole = await guild.roles.create({
			name: `${acronym}: Player`,
		});
	}

	return [staffRole, mappoolerRole, refereeRole, playerRole];
}

/**
 *
 * @description Creates the channels for the tournament with the correct permissions.
 * @returns An array containing the staff, mappool, referee and player channels.
 */
async function getTournamentChannels(
	interaction: ChatInputCommandInteraction,
	staffRole: Role,
	mappoolerRole: Role,
	refereeRole: Role,
	playerRole: Role
) {
	const guild = interaction.guild!;

	const acronym = interaction.options.getString("acronym", true) as string;

	const parentCategory = interaction.options.getChannel(
		"parent-category"
	) as CategoryChannel | null;

	let scheduleChannel = interaction.options.getChannel(
		"schedule-channel"
	) as GuildBasedChannel | null;

	const staffChannel = await guild.channels.create({
		name: `${acronym}-staff`,
		parent: parentCategory,
		permissionOverwrites: [
			{
				id: guild.roles.everyone.id,
				deny: [PermissionFlagsBits.ViewChannel],
			},
			{
				id: staffRole.id,
				allow: [PermissionFlagsBits.ViewChannel],
			},
		],
	});

	const mappoolerChannel = await guild.channels.create({
		name: `${acronym}-mappooler`,
		parent: parentCategory,
		permissionOverwrites: [
			{
				id: guild.roles.everyone.id,
				deny: [PermissionFlagsBits.ViewChannel],
			},
			{
				id: mappoolerRole.id,
				allow: [PermissionFlagsBits.ViewChannel],
			},
		],
	});

	const refereeChannel = await guild.channels.create({
		name: `${acronym}-referee`,
		parent: parentCategory,
		permissionOverwrites: [
			{
				id: guild.roles.everyone.id,
				deny: [PermissionFlagsBits.ViewChannel],
			},
			{
				id: refereeRole.id,
				allow: [PermissionFlagsBits.ViewChannel],
			},
		],
	});

	if (!scheduleChannel) {
		scheduleChannel = await guild.channels.create({
			name: `${acronym}-schedules`,
			parent: parentCategory,
			permissionOverwrites: [
				{
					id: guild.roles.everyone.id,
					deny: [PermissionFlagsBits.ViewChannel],
				},
				{
					id: staffRole.id,
					allow: [PermissionFlagsBits.ViewChannel],
				},
				{
					id: playerRole.id,
					allow: [PermissionFlagsBits.ViewChannel],
				},
			],
		});
	}

	const playerChannel = await guild.channels.create({
		name: `${acronym}-players`,
		parent: parentCategory,
		permissionOverwrites: [
			{
				id: guild.roles.everyone.id,
				deny: [PermissionFlagsBits.ViewChannel],
			},
			{
				id: staffRole.id,
				allow: [PermissionFlagsBits.ViewChannel],
			},
			{
				id: playerRole.id,
				allow: [PermissionFlagsBits.ViewChannel],
			},
		],
	});

	return [
		staffChannel,
		mappoolerChannel,
		refereeChannel,
		scheduleChannel,
		playerChannel,
	];
}
