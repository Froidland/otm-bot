import db from "@/db";
import { NoAccountEmbed, tournamentRegistration } from "@/embeds";
import { createId } from "@paralleldrive/cuid2";
import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { ChannelType, EmbedBuilder } from "discord.js";
import { DateTime } from "luxon";

export type TournamentType = "OneVsOne" | "TeamVsTeam";
type WinCondition = "Score" | "Accuracy" | "MissCount";
type Scoring = "ScoreV1" | "ScoreV2";

@ApplyOptions<Subcommand.Options>({
	description: "Tournament management commands.",
	subcommands: [
		{
			name: "create",
			chatInputRun: "chatInputRunCreate",
			preconditions: ["ServerAdminOnly"],
		},
	],
})
export class TournamentCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((builder) =>
					builder
						.setName("create")
						.setDescription("Create a tournament.")
						.addStringOption((option) =>
							option
								.setName("name")
								.setDescription("The name of the tournament.")
								.setRequired(true)
								.setMaxLength(255),
						)
						.addStringOption((option) =>
							option
								.setName("acronym")
								.setDescription(
									"The acronym of the tournament. Used in the name of the created channels and roles by default.",
								)
								.setRequired(true)
								.setMaxLength(64),
						)
						.addStringOption((option) =>
							option
								.setName("type")
								.setDescription("The type of the tournament.")
								.addChoices(
									{
										name: "1v1",
										value: "OneVsOne",
									},
									{
										name: "TeamVsTeam",
										value: "TeamVsTeam",
									},
								)
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("start-date")
								.setDescription(
									"The start date of the tournament, including qualifiers if aplicable.(Format: YYYY-MM-DD HH:MM)",
								)
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("registration-end-date")
								.setDescription(
									"The end date of the tournament. (Format: YYYY-MM-DD HH:MM)",
								)
								.setRequired(true),
						)
						.addChannelOption((option) =>
							option
								.setName("embed-channel")
								.setDescription(
									"The channel to send the tournament registration embed to.",
								)
								.addChannelTypes(ChannelType.GuildText)
								.setRequired(true),
						)
						.addBooleanOption((option) =>
							option
								.setName("has-qualifiers")
								.setDescription(
									"Whether the tournament has qualifiers. Defaults to false.",
								),
						)
						.addStringOption((option) =>
							option
								.setName("qualifiers-deadline")
								.setDescription(
									"The deadline for playing qualifiers. (Format: YYYY-MM-DD HH:MM, ignored if has-qualifiers is false)",
								),
						)
						.addStringOption((option) =>
							option
								.setName("win-condition")
								.setDescription(
									"The win condition of the tournament. Defaults to Score.",
								)
								.addChoices(
									{
										name: "Score",
										value: "Score",
									},
									{
										name: "Accuracy",
										value: "Accuracy",
									},
									{
										name: "Miss count",
										value: "MissCount",
									},
								),
						)
						.addStringOption((option) =>
							option
								.setName("scoring")
								.setDescription(
									"The scoring system of the tournament. Defaults to ScoreV2.",
								)
								.addChoices(
									{
										name: "ScoreV1",
										value: "ScoreV1",
									},
									{
										name: "ScoreV2",
										value: "ScoreV2",
									},
								),
						)
						.addBooleanOption((option) =>
							option
								.setName("acronym-in-names")
								.setDescription(
									"Whether to include the acronym in the names of the created channels and roles. Defaults to true.",
								),
						)
						.addIntegerOption((option) =>
							option
								.setName("min-team-size")
								.setDescription(
									"The minimum team size for the tournament. Defaults to 6, max 16.",
								)
								.setMaxValue(16),
						)
						.addIntegerOption((option) =>
							option
								.setName("max-team_size")
								.setDescription(
									"The maximum team size for the tournament. Defaults to 8, max 16.",
								)
								.setMaxValue(16),
						)
						.addIntegerOption((option) =>
							option
								.setName("in-lobby-team-size")
								.setDescription(
									"The team size in lobby. Defaults to 4, max 8. Ignored for 1v1.",
								)
								.setMaxValue(8),
						),
				),
		);
	}

	public async chatInputRunCreate(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const id = createId();

		const name = interaction.options.getString("name", true);
		const acronym = interaction.options
			.getString("acronym", true)
			.toUpperCase();

		const startDateString = interaction.options.getString("start-date", true);
		const registrationEndDateString = interaction.options.getString(
			"registration-end-date",
			true,
		);

		const type = interaction.options.getString("type", true) as TournamentType;
		const winCondition =
			(interaction.options.getString("win-condition") as WinCondition | null) ||
			"Score";
		const scoring =
			(interaction.options.getString("scoring") as Scoring | null) || "ScoreV2";

		const hasQualifiers =
			interaction.options.getBoolean("has-qualifiers") || false;
		const qualifiersDeadlineString = interaction.options.getString(
			"qualifiers-deadline",
		);

		//? If the tournament is 1v1, ignore the provided minTeamSize.
		const minTeamSize =
			type === "OneVsOne"
				? 1
				: interaction.options.getInteger("min-team-size") || 6;
		//? If no maxTeamSize is provided, default to 1 for 1v1 and 8 for TeamVsTeam.
		const maxTeamSize =
			interaction.options.getInteger("max-team-size") || type === "OneVsOne"
				? 1
				: 8;
		//? If the tournament is 1v1, ignore the provided inLobbyTeamSize.
		const inLobbyTeamSize =
			type === "OneVsOne"
				? 1
				: interaction.options.getInteger("in-lobby-team-size") || 4;

		const embedChannel = interaction.options.getChannel("embed-channel", true, [
			ChannelType.GuildText,
		]);

		const acronymInNames =
			interaction.options.getBoolean("acronym-in-names") || true;

		const prefix = acronymInNames ? `${acronym}: ` : "";

		if (!interaction.guild) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This command can only be used in a server."),
				],
			});

			return;
		}

		if (minTeamSize > maxTeamSize) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"Minimum team size must be less than max team size.",
						),
				],
			});

			return;
		}

		if (inLobbyTeamSize > minTeamSize) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"In lobby team size must be less than or equal to the minimum team size.",
						),
				],
			});

			return;
		}

		if (hasQualifiers && !qualifiersDeadlineString) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You must provide a deadline for qualifiers if the tournament has qualifiers.",
						),
				],
			});

			return;
		}

		let qualifiersDeadline;

		if (hasQualifiers && qualifiersDeadlineString) {
			qualifiersDeadline = DateTime.fromFormat(
				qualifiersDeadlineString,
				"yyyy-MM-dd HH:mm",
				{
					zone: "utc",
				},
			);

			if (!qualifiersDeadline.isValid) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription("Invalid date format for qualifiers deadline."),
					],
				});

				return;
			}
		}

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

		const startDate = DateTime.fromFormat(startDateString, "yyyy-MM-dd HH:mm", {
			zone: "utc",
		});

		const registrationEndDate = DateTime.fromFormat(
			registrationEndDateString,
			"yyyy-MM-dd HH:mm",
			{
				zone: "utc",
			},
		);

		if (!startDate.isValid || !registrationEndDate.isValid) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("Invalid date format."),
				],
			});

			return;
		}

		if (startDate > registrationEndDate) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("Start date must be before end date."),
				],
			});

			return;
		}

		const tournamentEmbedUsedChannel = await db.tournament.findFirst({
			where: {
				embed_channel_id: embedChannel.id,
			},
		});

		if (tournamentEmbedUsedChannel) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The channel selected for the embed is already in use by another tournament. Please select another channel.",
						),
				],
			});

			return;
		}

		let organizerRole, staffRole, mappoolerRole, refereeRole, playerRole;

		try {
			organizerRole = await interaction.guild.roles.create({
				name: `${prefix}Organizer`,
			});

			staffRole = await interaction.guild.roles.create({
				name: `${prefix}Staff`,
			});

			mappoolerRole = await interaction.guild.roles.create({
				name: `${prefix}Mappooler`,
			});

			refereeRole = await interaction.guild.roles.create({
				name: `${prefix}Referee`,
			});

			playerRole = await interaction.guild.roles.create({
				name: `${prefix}Player`,
			});
		} catch (error) {
			this.container.logger.error(error);

			if (organizerRole) await organizerRole.delete();
			if (staffRole) await staffRole.delete();
			if (mappoolerRole) await mappoolerRole.delete();
			if (refereeRole) await refereeRole.delete();
			if (playerRole) await playerRole.delete();

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occured while creating roles. Please try again later.",
						),
				],
			});

			return;
		}

		let staffChannel,
			mappoolerChannel,
			refereeChannel,
			scheduleChannel,
			playerChannel,
			tournamentCategory;

		try {
			tournamentCategory = await interaction.guild.channels.create({
				name: acronym,
				type: ChannelType.GuildCategory,
			});

			staffChannel = await interaction.guild.channels.create({
				name: `${prefix}staff`,
				type: ChannelType.GuildText,
				parent: tournamentCategory,
				permissionOverwrites: [
					{
						id: interaction.guild.roles.everyone,
						deny: "ViewChannel",
					},
					{
						id: organizerRole,
						allow: ["SendMessages", "ReadMessageHistory", "ViewChannel"],
					},
					{
						id: staffRole,
						allow: ["SendMessages", "ReadMessageHistory", "ViewChannel"],
					},
				],
			});

			mappoolerChannel = await interaction.guild.channels.create({
				name: `${prefix}mappool`,
				type: ChannelType.GuildText,
				parent: tournamentCategory,
				permissionOverwrites: [
					{
						id: interaction.guild.roles.everyone,
						deny: "ViewChannel",
					},
					{
						id: organizerRole,
						allow: ["SendMessages", "ReadMessageHistory", "ViewChannel"],
					},
					{
						id: mappoolerRole,
						allow: ["SendMessages", "ReadMessageHistory", "ViewChannel"],
					},
				],
			});

			refereeChannel = await interaction.guild.channels.create({
				name: `${prefix}referees`,
				type: ChannelType.GuildText,
				parent: tournamentCategory,
				permissionOverwrites: [
					{
						id: interaction.guild.roles.everyone,
						deny: "ViewChannel",
					},
					{
						id: organizerRole,
						allow: ["SendMessages", "ReadMessageHistory", "ViewChannel"],
					},
					{
						id: refereeRole,
						allow: ["SendMessages", "ReadMessageHistory", "ViewChannel"],
					},
				],
			});

			scheduleChannel = await interaction.guild.channels.create({
				name: `${prefix}schedule`,
				type: ChannelType.GuildText,
				parent: tournamentCategory,
				permissionOverwrites: [
					{
						id: interaction.guild.roles.everyone,
						deny: "ViewChannel",
					},
					{
						id: organizerRole,
						allow: ["SendMessages", "ReadMessageHistory", "ViewChannel"],
					},
					{
						id: staffRole,
						allow: ["SendMessages", "ReadMessageHistory", "ViewChannel"],
					},
					{
						id: playerRole,
						allow: ["SendMessages", "ReadMessageHistory", "ViewChannel"],
					},
				],
			});

			playerChannel = await interaction.guild.channels.create({
				name: `${prefix}players`,
				type: ChannelType.GuildText,
				parent: tournamentCategory,
				permissionOverwrites: [
					{
						id: interaction.guild.roles.everyone,
						deny: "ViewChannel",
					},
					{
						id: organizerRole,
						allow: ["SendMessages", "ReadMessageHistory", "ViewChannel"],
					},
					{
						id: staffRole,
						allow: ["SendMessages", "ReadMessageHistory", "ViewChannel"],
					},
					{
						id: playerRole,
						allow: ["SendMessages", "ReadMessageHistory", "ViewChannel"],
					},
				],
			});
		} catch (error) {
			this.container.logger.error(error);

			if (staffChannel) await staffChannel.delete();
			if (mappoolerChannel) await mappoolerChannel.delete();
			if (refereeChannel) await refereeChannel.delete();
			if (scheduleChannel) await scheduleChannel.delete();
			if (playerChannel) await playerChannel.delete();
			if (tournamentCategory) await tournamentCategory.delete();

			await organizerRole.delete();
			await staffRole.delete();
			await mappoolerRole.delete();
			await refereeRole.delete();
			await playerRole.delete();

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occured while creating channels. Please try again later.",
						),
				],
			});

			return;
		}

		let infoField = `Name: \`${name}\`\n`;
		infoField += `Acronym: \`${acronym}\`\n`;
		infoField += `Creator: <@${user.discord_id}> (\`${user.osu_username}\` - \`#${user.osu_id}\`)\n`;

		let settingsField = `Type: \`${type}\`\n`;
		settingsField += `Scoring: \`${scoring}\`\n`;
		settingsField += `Win condition: \`${winCondition}\`\n`;
		settingsField += `Minimum team size: \`${minTeamSize}\`\n`;
		settingsField += `Maximum team size: \`${maxTeamSize}\`\n`;
		settingsField += `In lobby team size: \`${inLobbyTeamSize}\`\n`;
		settingsField += `Has qualifiers: \`${hasQualifiers ? "Yes" : "No"}\`\n`;

		let datesField = `Start date: \`${startDate.toFormat("DDDD T")}\`\n`;
		datesField += `Registration end date: \`${registrationEndDate.toFormat(
			"DDDD T",
		)}\`\n`;

		if (hasQualifiers && qualifiersDeadline) {
			datesField += `Qualifiers deadline: \`${qualifiersDeadline.toFormat(
				"DDDD T",
			)}\`\n`;
		}

		let channelsField = `Staff channel: <#${staffChannel.id}>\n`;
		channelsField += `Mappooler channel: <#${mappoolerChannel.id}>\n`;
		channelsField += `Referee channel: <#${refereeChannel.id}>\n`;
		channelsField += `Schedule channel: <#${scheduleChannel.id}>\n`;
		channelsField += `Player channel: <#${playerChannel.id}>\n`;

		let rolesField = `Organizer role: <@&${organizerRole.id}>\n`;
		rolesField += `Staff role: <@&${staffRole.id}>\n`;
		rolesField += `Mappooler role: <@&${mappoolerRole.id}>\n`;
		rolesField += `Referee role: <@&${refereeRole.id}>\n`;
		rolesField += `Player role: <@&${playerRole.id}>\n`;

		const embedMessage = await embedChannel.send(
			tournamentRegistration({ tournamentName: name, type }),
		);

		try {
			await db.tournament.create({
				data: {
					id,
					server_id: interaction.guild.id,
					creator_id: user.id,
					name,
					acronym,
					start_date: startDate.toJSDate(),
					registration_end_date: registrationEndDate.toJSDate(),
					embed_channel_id: embedChannel.id,
					embed_message_id: embedMessage.id,
					staff_channel_id: staffChannel.id,
					mappooler_channel_id: mappoolerChannel.id,
					referee_channel_id: refereeChannel.id,
					schedule_channel_id: scheduleChannel.id,
					player_channel_id: playerChannel.id,
					organizer_role_id: organizerRole.id,
					staff_role_id: staffRole.id,
					mappooler_role_id: mappoolerRole.id,
					referee_role_id: refereeRole.id,
					player_role_id: playerRole.id,
					min_team_size: minTeamSize,
					max_team_size: maxTeamSize,
					lobby_team_size: inLobbyTeamSize,
					type,
					win_condition: winCondition,
					scoring,
					qualifier: hasQualifiers
						? {
								create: {
									id: createId(),
									deadline: qualifiersDeadline!.toJSDate(),
								},
						  }
						: undefined,
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
							"An error occured while creating the tournament, please try again later.",
						),
				],
			});

			return;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Tournament created")
					.setFields([
						{
							name: "Info",
							value: infoField,
						},
						{
							name: "Settings",
							value: settingsField,
						},
						{
							name: "Dates",
							value: datesField,
						},
						{
							name: "Channels",
							value: channelsField,
							inline: true,
						},
						{
							name: "Roles",
							value: rolesField,
							inline: true,
						},
					])
					.setFooter({
						text: `Unique ID: ${id}`,
					}),
			],
		});
	}
}
