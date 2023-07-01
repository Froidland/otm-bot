import {
	CategoryChannel,
	ChannelType,
	CommandInteraction,
	EmbedBuilder,
	GuildBasedChannel,
	PermissionFlagsBits,
	Role,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "@/interfaces/command";
import { createId } from "@paralleldrive/cuid2";
import db, { ScoringType, TournamentType, WinCondition } from "@/db";
import { logger } from "@/utils";
import { DateTime } from "luxon";

export const createTournament: Command = {
	data: new SlashCommandBuilder()
		.setName("create-tournament")
		.setDescription(
			"Create a tournament with all the roles and channels necessary for it."
		)
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
					},
					{
						name: "Battle Royale",
						value: "BattleRoyale",
					},
					{
						name: "Custom",
						value: "Custom",
					}
				)
		)
		.addStringOption((option) =>
			option
				.setName("start-date")
				.setDescription(
					"The date at which the tournament will start. (Format: YYYY-MM-DD)"
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
				.addChannelTypes(ChannelType.GuildCategory)
				.setRequired(false)
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false),
	execute: async (interaction: CommandInteraction) => {
		await interaction.deferReply();
		const id = createId();

		// Check if the user has linked their account.
		const user = await db.users.findOne({
			where: {
				discordId: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You don't have an account. Please use the `/link` command to link your osu! account."
						),
				],
			});

			return;
		}

		const name = interaction.options.get("name", true).value as string;

		const acronym = (
			interaction.options.get("acronym", true).value as string
		).toUpperCase();

		const tournamentType = interaction.options.get("type", true)
			.value as TournamentType;

		const teamSize = interaction.options.get("team-size", true).value as number;

		const winCondition = interaction.options.get("win-condition", true)
			.value as WinCondition;

		const scoring = interaction.options.get("scoring", true)
			.value as ScoringType;

		const startDateOption = interaction.options.get("start-date", true)
			.value as string;

		// Regex to check if the date is in the correct format.
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

		if (!dateRegex.test(startDateOption)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The date you provided is invalid. Please use the format `YYYY-MM-DD`."
						),
				],
			});

			return;
		}

		try {
			Date.parse(startDateOption);
		} catch (error) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The date you provided is invalid. Please use the format `YYYY-MM-DD`."
						),
				],
			});

			return;
		}

		const startDateUTC = DateTime.fromFormat(startDateOption, "yyyy-MM-dd", {
			zone: "utc",
		});

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

		let embedDescription = "**__Tournament identification:__**\n";
		embedDescription += `**\\- ID:** \`${id}\`\n`;
		embedDescription += `**\\- Name:** \`${name}\`\n`;
		embedDescription += `**\\- Acronym:** \`${acronym}\`\n`;
		embedDescription += `**\\- Owner:** \`${interaction.user.tag}\`\n`;
		embedDescription += "-------------------------------------------\n";
		embedDescription += "**__Tournament settings:__**\n";
		embedDescription += `**\\- Type:** \`${tournamentType}\`\n`;
		embedDescription += `**\\- Scoring:** \`${scoring}\`\n`;
		embedDescription += `**\\- Win condition:** \`${winCondition}\`\n`;
		embedDescription += `**\\- Team size:** \`${teamSize ?? 8}\`\n`;
		embedDescription += `**\\- Start date:** \`${startDateUTC.toString()}\`\n`;
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
			await db.tournaments.insert({
				id,
				name,
				acronym,
				serverId: interaction.guild!.id,
				startDate: startDateUTC.toJSDate(),
				staffChannelId: staffChannel.id,
				mappoolerChannelId: mappoolerChannel.id,
				refereeChannelId: refereeChannel.id,
				scheduleChannelId: scheduleChannel.id,
				staffRoleId: staffRole.id,
				mappoolerRoleId: mappoolerRole.id,
				refereeRoleId: refereeRole.id,
				playerRoleId: playerRole.id,
				creator: user,
				winCondition,
				scoring,
				style: tournamentType,
				teamSize,
			});
		} catch (error) {
			logger.error(`Error while creating tournament: ${error}`);
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"There was an error while creating the tournament. Please try again later. Created roles and channels will be deleted."
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

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Tournament created")
					.setDescription(embedDescription),
			],
		});
	},
};

/**
 *
 * @description Creates or gets the roles for the tournament with the correct permissions.
 * @returns An array containing the staff, referee and player roles, in that order.
 */
async function getTournamentRoles(interaction: CommandInteraction) {
	const guild = interaction.guild!;
	const acronym = interaction.options.get("acronym", true).value as string;

	let staffRole = interaction.options.get("staff-role")?.role as
		| Role
		| undefined;

	let mappoolerRole = interaction.options.get("mappooler-role")?.role as
		| Role
		| undefined;

	let refereeRole = interaction.options.get("referee-role")?.role as
		| Role
		| undefined;

	let playerRole = interaction.options.get("player-role")?.role as
		| Role
		| undefined;

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
	interaction: CommandInteraction,
	staffRole: Role,
	mappoolerRole: Role,
	refereeRole: Role,
	playerRole: Role
) {
	const guild = interaction.guild!;
	const parentCategory = interaction.options.get("parent-category")?.channel as
		| CategoryChannel
		| undefined;
	const acronym = interaction.options.get("acronym", true).value as string;
	let scheduleChannel = interaction.options.get("schedule-channel")?.channel as
		| GuildBasedChannel
		| undefined;

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
