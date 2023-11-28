import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { tryoutRegistration } from "@/embeds/osu/tryoutRegistration";
import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import {
	APIEmbedField,
	AttachmentBuilder,
	ChannelType,
	EmbedBuilder,
	GuildTextBasedChannel,
	PermissionFlagsBits,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
} from "discord.js";
import { DateTime } from "luxon";
import { createId } from "@paralleldrive/cuid2";
import { hasTryoutAdminRole } from "@/utils";
import { v2 } from "osu-api-extended";
import { unparse } from "papaparse";

// TODO: Revise this, it doesn't really convince me.
const modCombinations = [
	"NM",
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
	description: "Tryout management commands.",
	preconditions: ["GuildOnly"],
	subcommands: [
		{
			name: "create",
			chatInputRun: "chatInputCreate",
			preconditions: ["ServerAdminOnly"],
		},
		{
			name: "info",
			chatInputRun: "chatInputInfo",
		},
		{
			name: "mappool",
			chatInputRun: "chatInputMappool",
		},
		{
			name: "stage",
			type: "group",
			entries: [
				{
					name: "create",
					chatInputRun: "chatInputStageCreate",
				},
				{
					name: "publish",
					chatInputRun: "chatInputStagePublish",
				},
			],
		},
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
			name: "embed",
			type: "group",
			entries: [
				{
					name: "send",
					chatInputRun: "chatInputEmbedSend",
				},
			],
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
					name: "acronym",
					chatInputRun: "chatInputEditAcronym",
				},
				{
					name: "start-date",
					chatInputRun: "chatInputEditStartDate",
				},
				{
					name: "end-date",
					chatInputRun: "chatInputEditEndDate",
				},
				{
					name: "staff-channel",
					chatInputRun: "chatInputEditStaffChannel",
					preconditions: ["ServerAdminOnly"],
				},
				{
					name: "player-channel",
					chatInputRun: "chatInputEditPlayerChannel",
					preconditions: ["ServerAdminOnly"],
				},
				{
					name: "player-role",
					chatInputRun: "chatInputEditPlayerRole",
					preconditions: ["ServerAdminOnly"],
				},
				{
					name: "management-role",
					chatInputRun: "chatInputEditManagementRole",
					preconditions: ["ServerAdminOnly"],
				},
				{
					name: "referee-role",
					chatInputRun: "chatInputEditRefereeRole",
					preconditions: ["ServerAdminOnly"],
				},
				{
					name: "allow-staff",
					chatInputRun: "chatInputEditAllowStaff",
					preconditions: ["ServerAdminOnly"],
				},
			],
		},
		{
			name: "player",
			type: "group",
			entries: [
				{
					name: "remove",
					chatInputRun: "chatInputPlayerRemove",
				},
				{
					name: "list",
					chatInputRun: "chatInputPlayerList",
				},
			],
		},
	],
})
export class TryoutCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((builder: SlashCommandSubcommandBuilder) =>
					builder
						.setName("create")
						.setDescription("Creates a tryout.")
						.addStringOption((option) =>
							option
								.setName("name")
								.setDescription(
									'The name of the tryout. (Example: "5WC Chile Tryouts 2023")',
								)
								.setRequired(true)
								.setMaxLength(128),
						)
						.addStringOption((option) =>
							option
								.setName("acronym")
								.setDescription(
									'The acronym of the tryout stage. (Example: "5WC CLT")',
								)
								.setRequired(true)
								.setMaxLength(64),
						)
						.addStringOption((option) =>
							option
								.setName("start-date")
								.setDescription(
									"The date when the tryout starts. (Format: YYYY-MM-DD HH:MM)",
								)
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName("end-date")
								.setDescription(
									"The date when the tryout ends. (Format: YYYY-MM-DD HH:MM)",
								)
								.setRequired(true),
						)
						.addChannelOption((option) =>
							option
								.setName("embed-channel")
								.setDescription(
									"The channel where the tryout embed will be sent.",
								)
								.addChannelTypes(ChannelType.GuildText)
								.setRequired(true),
						)
						.addBooleanOption((option) =>
							option
								.setName("allow-staff")
								.setDescription(
									"Whether or not staff members can join the tryout. (Default: false)",
								)
								.setRequired(false),
						),
				)
				.addSubcommand((builder) =>
					builder //
						.setName("info")
						.setDescription("View a tryout's info.")
						.addStringOption((option) =>
							option
								.setName("unique-id")
								.setDescription(
									"The unique ID of the tryout to view the info for.",
								),
						),
				)
				.addSubcommand((builder) =>
					builder
						.setName("mappool")
						.setDescription("View a tryout stage's mappool.")
						.addStringOption((option) =>
							option
								.setName("stage-id")
								.setDescription(
									"The custom ID of the stage to view the mappool for.",
								)
								.setRequired(true),
						),
				)
				.addSubcommandGroup((builder: SlashCommandSubcommandGroupBuilder) =>
					builder
						.setName("stage")
						.setDescription("!")
						.addSubcommand((builder: SlashCommandSubcommandBuilder) =>
							builder
								.setName("create")
								.setDescription("Creates a tryout stage.")
								.addStringOption((option) =>
									option
										.setName("name")
										.setDescription(
											'The name of the tryout stage. (Example: "Week 1")',
										)
										.setRequired(true),
								)
								.addStringOption((option) =>
									option
										.setName("custom-id")
										.setDescription(
											'The custom ID of the tryout stage. (Example: "W1")',
										)
										.setRequired(true),
								),
						)
						.addSubcommand((builder: SlashCommandSubcommandBuilder) =>
							builder
								.setName("publish")
								.setDescription("Publishes the specified tryout stage.")
								.addStringOption((option) =>
									option
										.setName("stage-id")
										.setDescription("The custom ID of the stage to publish.")
										.setRequired(true),
								),
						),
				)
				.addSubcommandGroup((builder) =>
					builder
						.setName("map")
						.setDescription("!")
						.addSubcommand((builder) =>
							builder
								.setName("set")
								.setDescription(
									"Set a specific pick for the specified stage's mappool.",
								)
								.addStringOption((option) =>
									option
										.setName("stage-id")
										.setDescription(
											"The custom ID of the stage to set the pick for.",
										)
										.setRequired(true),
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
											"The mods to set the map for. (Example: HD, NF is always enforced)",
										)
										.setRequired(false),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("remove")
								.setDescription(
									"Remove a specific pick for the specified stage's mappool.",
								)
								.addStringOption((option) =>
									option
										.setName("stage-id")
										.setDescription(
											"The custom ID of the stage to remove the pick from.",
										)
										.setRequired(true),
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
									"Set the order of the specified stage's mappool.",
								)
								.addStringOption((option) =>
									option
										.setName("stage-id")
										.setDescription(
											"The custom ID of the stage to set the order for.",
										)
										.setRequired(true),
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
				.addSubcommandGroup((builder: SlashCommandSubcommandGroupBuilder) =>
					builder
						.setName("embed")
						.setDescription("!")
						.addSubcommand((builder: SlashCommandSubcommandBuilder) =>
							builder
								.setName("send")
								.setDescription(
									"Resends the tryout embed to the specified channel, deleting the old one.",
								)
								.addChannelOption((option) =>
									option
										.setName("channel")
										.setDescription(
											"The channel where the tryout embed will be sent.",
										)
										.setRequired(true)
										.addChannelTypes(ChannelType.GuildText),
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
								.setDescription("Edit the tryout name.")
								.addStringOption((option) =>
									option
										.setName("value")
										.setDescription("The new tryout name.")
										.setRequired(true),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("acronym")
								.setDescription("Edit the tryout acronym.")
								.addStringOption((option) =>
									option
										.setName("value")
										.setDescription("The new tryout acronym.")
										.setRequired(true),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("start-date")
								.setDescription("Edit the tryout start date.")
								.addStringOption((option) =>
									option
										.setName("value")
										.setDescription(
											"The new tryout start date. (Format: YYYY-MM-DD HH:MM)",
										)
										.setRequired(true),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("end-date")
								.setDescription("Edit the tryout end date.")
								.addStringOption((option) =>
									option
										.setName("value")
										.setDescription(
											"The new tryout end date. (Format: YYYY-MM-DD HH:MM)",
										)
										.setRequired(true),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("staff-channel")
								.setDescription(
									"Edit the tryout staff channel. (Channel permissions are not updated)",
								)
								.addChannelOption((option) =>
									option
										.setName("channel")
										.setDescription(
											"The new tryout staff channel. (Default: New Channel)",
										)
										.addChannelTypes(ChannelType.GuildText),
								)
								.addBooleanOption((option) =>
									option
										.setName("delete-previous")
										.setDescription(
											"Whether or not to delete the previous staff channel. (Default: false)",
										),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("player-channel")
								.setDescription(
									"Edit the tryout player channel. (Channel permissions are not updated)",
								)
								.addChannelOption((option) =>
									option
										.setName("channel")
										.setDescription(
											"The new tryout player channel. (Default: New Channel)",
										)
										.addChannelTypes(ChannelType.GuildText),
								)
								.addBooleanOption((option) =>
									option
										.setName("delete-previous")
										.setDescription(
											"Whether or not to delete the previous player channel. (Default: false)",
										),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("player-role")
								.setDescription(
									"Edit the tryout player role. (Channel permissions are not updated)",
								)
								.addRoleOption((option) =>
									option
										.setName("role")
										.setDescription(
											"The new tryout player role. (Default: New Role)",
										),
								)
								.addBooleanOption((option) =>
									option
										.setName("delete-previous")
										.setDescription(
											"Whether or not to delete the previous player role. (Default: false)",
										),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("management-role")
								.setDescription(
									"Edit the tryout management role. (Channel permissions are not updated)",
								)
								.addRoleOption((option) =>
									option
										.setName("role")
										.setDescription(
											"The new tryout management role. (Default: New Role)",
										),
								)
								.addBooleanOption((option) =>
									option
										.setName("delete-previous")
										.setDescription(
											"Whether or not to delete the previous management role. (Default: false)",
										),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("referee-role")
								.setDescription(
									"Edit the tryout referee role. (Channel permissions are not updated)",
								)
								.addRoleOption((option) =>
									option
										.setName("role")
										.setDescription(
											"The new tryout referee role. (Default: New Role)",
										),
								)
								.addBooleanOption((option) =>
									option
										.setName("delete-previous")
										.setDescription(
											"Whether or not to delete the previous referee role. (Default: false)",
										),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("allow-staff")
								.setDescription("Edit whether or not staff can join.")
								.addBooleanOption((option) =>
									option
										.setName("value")
										.setDescription(
											"Whether or not staff members can join the tryout.",
										)
										.setRequired(true),
								),
						),
				)
				.addSubcommandGroup((builder) =>
					builder //
						.setName("player")
						.setDescription("!")
						.addSubcommand((builder) =>
							builder
								.setName("remove")
								.setDescription("Manually remove a player from the tryout.")
								.addUserOption((option) =>
									option
										.setName("player")
										.setDescription("The player to remove from the tryout.")
										.setRequired(true),
								),
						)
						.addSubcommand((builder) =>
							builder
								.setName("list")
								.setDescription("List all the players registered.")
								.addStringOption((option) =>
									option
										.setName("stage-id")
										.setDescription(
											"The custom ID of the stage. (Default: None)",
										)
										.setRequired(false),
								)
								.addStringOption((option) =>
									option
										.setName("format")
										.setDescription(
											"The format to use for the list. (Default: Message)",
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
				),
		);
	}

	// TODO: Add the ability to set restrictions to the tryout, like only players with a certain role can join, or players from a specific country.
	public async chatInputCreate(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

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

		const id = createId();

		const name = interaction.options.getString("name", true).trim();
		const acronym = interaction.options
			.getString("acronym", true)
			.trim()
			.toUpperCase();
		const embedChannel = interaction.options.getChannel("embed-channel", true, [
			ChannelType.GuildText,
		]);

		const startDate = DateTime.fromFormat(
			interaction.options.getString("start-date", true).trim(),
			"yyyy-MM-dd HH:mm",
			{
				zone: "utc",
			},
		);

		const endDate = DateTime.fromFormat(
			interaction.options.getString("end-date", true).trim(),
			"yyyy-MM-dd HH:mm",
			{
				zone: "utc",
			},
		);

		const allowStaff = interaction.options.getBoolean("allow-staff") || false;

		if (!startDate.isValid || !endDate.isValid) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid date!")
						.setDescription(
							"One of the dates you provided is not in the correct format. Please correct it and try again.",
						),
				],
			});

			return;
		}

		if (endDate < startDate) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid date!")
						.setDescription("The end date cannot be before the start date."),
				],
			});

			return;
		}

		let playerRole, adminRole, refereeRole;

		try {
			playerRole = await interaction.guild.roles.create({
				name: `${acronym}: Player`,
			});

			// TODO: Rename this to Organizer.
			adminRole = await interaction.guild.roles.create({
				name: `${acronym}: Management`,
			});

			refereeRole = await interaction.guild.roles.create({
				name: `${acronym}: Referee`,
			});
		} catch (error) {
			this.container.logger.error(error);

			if (playerRole) await playerRole.delete();
			if (adminRole) await adminRole.delete();
			if (refereeRole) await refereeRole.delete();

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occured while creating roles. Please try again later. All changes will be reverted.",
						),
				],
			});

			return;
		}

		let tryoutCategory, staffChannel, playerChannel;

		try {
			tryoutCategory = await interaction.guild.channels.create({
				name: `${acronym}`,
				type: ChannelType.GuildCategory,
			});

			staffChannel = await interaction.guild.channels.create({
				name: `${acronym}-staff`,
				type: ChannelType.GuildText,
				permissionOverwrites: [
					{
						id: interaction.guild?.roles.everyone.id,
						deny: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: adminRole.id,
						allow: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: refereeRole.id,
						allow: [PermissionFlagsBits.ViewChannel],
					},
				],
				parent: tryoutCategory,
			});

			playerChannel = await interaction.guild.channels.create({
				name: `${acronym}-players`,
				type: ChannelType.GuildText,
				permissionOverwrites: [
					{
						id: interaction.guild?.roles.everyone.id,
						deny: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: playerRole.id,
						allow: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: adminRole.id,
						allow: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: refereeRole.id,
						allow: [PermissionFlagsBits.ViewChannel],
					},
				],
				parent: tryoutCategory,
			});
		} catch (error) {
			this.container.logger.error(error);

			if (playerChannel) await playerChannel.delete();
			if (staffChannel) await staffChannel.delete();
			if (tryoutCategory) await tryoutCategory.delete();

			if (playerRole) await playerRole.delete();
			if (refereeRole) await refereeRole.delete();
			if (adminRole) await adminRole.delete();

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occured while creating channels. Please try again later. All changes will be reverted.",
						),
				],
			});

			return;
		}

		let infoField = `Name: \`${name}\`\n`;
		infoField += `Acronym: \`${acronym}\`\n`;
		infoField += `Creator: <@${user.discord_id}> (\`${user.osu_username}\` - \`#${user.osu_id}\`)`;
		infoField += `Is staff allowed: \`${allowStaff ? "Yes" : "No"}\`\n`;

		let datesField = `Start date: \`${startDate.toFormat("DDDD T")}\`\n`;
		datesField += `End date: \`${endDate.toFormat("DDDD T")}\`\n`;

		let rolesField = `Admin Role: <@&${adminRole.id}>\n`;
		rolesField += `Referee Role: <@&${refereeRole.id}>\n`;
		rolesField += `Player Role: <@&${playerRole.id}>\n`;

		let channelsField = `Staff Channel: <#${staffChannel.id}>\n`;
		channelsField += `Player Channel: <#${playerChannel.id}>`;

		const embedMessage = await embedChannel.send(tryoutRegistration(name));

		try {
			await db.tryout.create({
				data: {
					id,
					name,
					acronym,
					server_id: interaction.guild.id,
					embed_channel_id: embedChannel.id,
					embed_message_id: embedMessage.id,
					admin_role_id: adminRole.id,
					referee_role_id: refereeRole.id,
					player_role_id: playerRole.id,
					player_channel_id: playerChannel.id,
					staff_channel_id: staffChannel.id,
					allow_staff: allowStaff,
					start_date: startDate.toJSDate(),
					end_date: endDate.toJSDate(),
					creator_id: user.id,
				},
			});
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("DB error!")
						.setDescription(
							"An error occurred while creating the tryout. All changes will be reverted. Please contact the bot owner if this error persists.",
						),
				],
			});

			if (playerChannel) await playerChannel.delete();
			if (staffChannel) await staffChannel.delete();
			if (tryoutCategory) await tryoutCategory.delete();

			if (playerRole) await playerRole.delete();
			if (refereeRole) await refereeRole.delete();
			if (adminRole) await adminRole.delete();

			return;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Tryout created!")
					.setFields([
						{
							name: "Info",
							value: infoField,
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

	public async chatInputInfo(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const uniqueId = interaction.options.getString("unique-id")?.trim();

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
			where: uniqueId
				? {
						id: uniqueId,
				  }
				: {
						OR: [
							{
								player_channel_id: interaction.channelId,
							},
							{
								staff_channel_id: interaction.channelId,
							},
						],
				  },
			include: {
				stages: true,
				creator: true,
				_count: {
					select: {
						players: true,
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
							uniqueId
								? "No tryout with the provided unique ID was found."
								: "This command can only be used in a tryout channel.",
						),
				],
			});

			return;
		}

		let infoField = `Name: \`${tryout.name}\`\n`;
		infoField += `Acronym: \`${tryout.acronym}\`\n`;
		infoField += `Creator: <@${tryout.creator.discord_id}> (\`${tryout.creator.osu_username}\` - \`#${tryout.creator.osu_id}\`)\n`;
		infoField += `Server ID: \`${tryout.server_id}\`\n`;
		infoField += `Is staff allowed: \`${tryout.allow_staff ? "Yes" : "No"}\`\n`;
		infoField += `Registered players: \`${tryout._count.players}\`\n`;

		let datesField = `Start date: \`${DateTime.fromJSDate(tryout.start_date, {
			zone: "utc",
		}).toFormat("DDDD T")}\`\n`;
		datesField += `End date: \`${DateTime.fromJSDate(tryout.end_date, {
			zone: "utc",
		}).toFormat("DDDD T")}\`\n`;

		let stagesField = "";

		if (tryout.stages.length === 0) {
			stagesField += "*No stages have been created yet.*";
		} else {
			stagesField += tryout.stages
				.map((stage) => `\`${stage.name}\` (\`${stage.custom_id}\`)`)
				.join("\n");
		}

		let channelsField = `Staff Channel: <#${tryout.staff_channel_id}>\n`;
		channelsField += `Player Channel: <#${tryout.player_channel_id}>\n`;
		channelsField += `Embed Channel: <#${tryout.embed_channel_id}>`;

		let rolesField = `Admin Role: <@&${tryout.admin_role_id}>\n`;
		rolesField += `Referee Role: <@&${tryout.referee_role_id}>\n`;
		rolesField += `Player Role: <@&${tryout.player_role_id}>`;

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Blue")
					.setTitle("Tryout info")
					.setFields([
						{
							name: "Info",
							value: infoField,
						},
						{
							name: "Dates",
							value: datesField,
						},
						{
							name: "Stages",
							value: stagesField,
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
						text: `Unique ID: ${tryout.id}`,
					}),
			],
		});
	}

	public async chatInputStageCreate(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const id = createId();

		const name = interaction.options.getString("name", true).trim();
		const customId = interaction.options
			.getString("custom-id", true)
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

		const tryout = await db.tryout.findFirst({
			where: {
				staff_channel_id: interaction.channelId,
			},
			include: {
				_count: {
					select: {
						stages: true,
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
							"This command needs to be run in a tryout staff channel.",
						),
				],
			});

			return;
		}

		if (!hasTryoutAdminRole(interaction, tryout)) {
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

		const existingTryoutStage = await db.tryoutStage.findFirst({
			where: {
				tryout: {
					id: tryout.id,
				},
				custom_id: customId,
			},
		});

		if (existingTryoutStage) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid custom ID!")
						.setDescription(
							"A tryout stage with the provided custom ID already exists.",
						),
				],
			});

			return;
		}

		let embedDescription = "**__Tryout stage info:__**\n";
		embedDescription += `**Name:** \`${name}\`\n`;
		embedDescription += `**Custom ID:** \`${customId}\`\n`;

		try {
			await db.tryoutStage.create({
				data: {
					id,
					custom_id: customId,
					name,
					tryout_id: tryout.id,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Tryout stage created!")
						.setDescription(embedDescription)
						.setFooter({
							text: `Unique ID: ${id}`,
						}),
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
							"An error occurred while creating the tryout stage. All changes will be reverted. Please contact the bot owner if this error persists.",
						),
				],
			});
		}
	}

	public async chatInputMapRemove(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const stageId = interaction.options
			.getString("stage-id", true)
			.trim()
			.toUpperCase();

		const pick = interaction.options
			.getString("pick", true)
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

		const tryout = await db.tryout.findFirst({
			where: {
				staff_channel_id: interaction.channel?.id,
			},
			include: {
				stages: {
					where: {
						custom_id: stageId,
					},
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

		if (!tryout) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This channel is not a tryout staff channel."),
				],
			});

			return;
		}

		if (!hasTryoutAdminRole(interaction, tryout)) {
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

		if (tryout.stages.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							`No stage with custom ID \`${stageId}\` was found.`,
						),
				],
			});

			return;
		}

		if (tryout.stages[0].mappool.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							`The pick \`${pick}\` does not exist on stage ${tryout.stages[0].name}.`,
						),
				],
			});

			return;
		}

		const beatmap = tryout.stages[0].mappool[0].beatmap;

		const newMappoolOrder = tryout.stages[0].mappool_order
			.split(" ")
			.filter((p) => p !== pick);

		const embedDescription = `[${beatmap?.artist} - ${beatmap?.title} [${beatmap?.version}]](https://osu.ppy.sh/beatmaps/${beatmap?.id}) has removed as the **${pick}** from stage \`${tryout.stages[0].name}\`.`;

		try {
			await db.tryoutStage.update({
				where: {
					id: tryout.stages[0].id,
				},
				data: {
					mappool: {
						delete: {
							pick_id_stage_id: {
								pick_id: pick,
								stage_id: tryout.stages[0].id,
							},
						},
					},
					mappool_order: newMappoolOrder.join(" "),
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Yellow")
						.setTitle(`${pick} removed!`)
						.setImage(tryout.stages[0].mappool[0].beatmap!.cover_url)
						.setDescription(embedDescription),
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
							"An error occurred while removing the pick. Please try again later.",
						),
				],
			});
		}
	}

	public async chatInputMapSet(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const stageId = interaction.options
			.getString("stage-id", true)
			.trim()
			.toUpperCase();
		const pick = interaction.options
			.getString("pick", true)
			.trim()
			.toUpperCase();
		const mods = (interaction.options.getString("mods") || "NM")
			.trim()
			.toUpperCase();
		const beatmapId = interaction.options.getNumber("beatmap-id", true);

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

		const tryout = await db.tryout.findFirst({
			where: {
				staff_channel_id: interaction.channel?.id,
			},
			include: {
				stages: {
					where: {
						custom_id: stageId,
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
						.setDescription("This channel is not a tryout staff channel."),
				],
			});

			return;
		}

		if (!hasTryoutAdminRole(interaction, tryout)) {
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

		if (tryout.stages.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							`No stage with custom ID \`${stageId}\` was found.`,
						),
				],
			});

			return;
		}

		let beatmap = null;
		beatmap = await db.beatmap.findUnique({
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
		}

		const mapLengthFormat = `${(beatmap.total_length / 60)
			.toFixed(0)
			.padStart(2, "0")}:${(beatmap.total_length % 60)
			.toString()
			.padStart(2, "0")}`;

		const embedDescription = `[${beatmap.artist} - ${beatmap.title} [${beatmap.version}]](https://osu.ppy.sh/beatmaps/${beatmap.id}) has been set as the **${pick}** pick for stage \`${tryout.stages[0].name}\`.`;
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

		const mappoolOrderArray =
			tryout.stages[0].mappool_order === ""
				? []
				: tryout.stages[0].mappool_order.split(" ");

		//? If the pick is already in the mappool order, there's no need to add it again.
		if (!mappoolOrderArray.includes(pick)) {
			mappoolOrderArray.push(pick);
		}

		const newMappoolOrder = mappoolOrderArray.join(" ");

		try {
			await db.tryoutStage.update({
				where: {
					id: tryout.stages[0].id,
				},
				data: {
					mappool: {
						upsert: {
							where: {
								pick_id_stage_id: {
									pick_id: pick,
									stage_id: tryout.stages[0].id,
								},
							},
							create: {
								pick_id: pick,
								mods,
								beatmap_id: beatmap.id,
							},
							update: {
								mods,
								beatmap_id: beatmap.id,
							},
						},
					},
					mappool_order: newMappoolOrder,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle(`${pick} set!`)
						.setImage(beatmap.cover_url)
						.setDescription(embedDescription)
						.addFields(fields),
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
							`An error occurred while setting the pick. Please try again later.`,
						),
				],
			});
		}
	}

	public async chatInputMapOrder(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({
			ephemeral: true,
		});

		const stageId = interaction.options
			.getString("stage-id", true)
			.trim()
			.toUpperCase();

		const pattern = interaction.options
			.getString("pattern", true)
			.trim()
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

		const tryout = await db.tryout.findFirst({
			where: {
				staff_channel_id: interaction.channel?.id,
			},
			include: {
				stages: {
					where: {
						custom_id: stageId,
					},
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
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

		if (tryout.stages.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							`No stage with custom ID \`${stageId}\` was found.`,
						),
				],
			});

			return;
		}

		const stage = tryout.stages[0];

		const missingPicks = stage.mappool.filter((pick) => {
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
			await db.tryoutStage.update({
				where: {
					id: stage.id,
				},
				data: {
					mappool_order: pattern.join(" "),
				},
			});

			await interaction.editReply({
				embeds: [
					// TODO: Maybe display each pick's beatmap info.
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Map order set!")
						.setDescription(
							`The map order for stage \`${
								stage.name
							}\` has been set to:\n ${pattern
								.map((pick) => "`" + pick + "`")
								.join(" -> ")}`,
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
							"An error occurred while setting the map order. Please try again later.",
						),
				],
			});
		}
	}

	public async chatInputMappool(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const stageId = interaction.options
			.getString("stage-id", true)
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

		const tryout = await db.tryout.findFirst({
			where: {
				OR: [
					{
						player_channel_id: interaction.channel?.id,
					},
					{
						staff_channel_id: interaction.channel?.id,
					},
				],
			},
			include: {
				stages: {
					where: {
						custom_id: stageId,
					},
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

		if (tryout.stages.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid stage!")
						.setDescription(
							"Either this stage doesn't exist or it hasn't been published yet.",
						),
				],
			});

			return;
		}

		if (
			interaction.channel?.id === tryout.staff_channel_id &&
			!hasTryoutAdminRole(interaction, tryout)
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

		if (
			interaction.channel?.id === tryout.player_channel_id &&
			!tryout.stages[0].is_published &&
			!hasTryoutAdminRole(interaction, tryout)
		) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid stage!")
						.setDescription(
							"Either this stage doesn't exist or it hasn't been published yet.",
						),
				],
			});

			return;
		}

		if (tryout.stages[0].mappool.length < 1) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid stage!")
						.setDescription("This stage's mappool is empty."),
				],
			});

			return;
		}

		// TODO: For the love of anything please implement a custom sort function to do this or something cause this is sacrilege (or not, who knows...)
		// TODO: Automate grouping the different mods as to not rely on the "extra" array in the object and support additional mods.
		const mappoolObject = {
			NM: tryout.stages[0].mappool
				.filter((pick) => pick.pick_id.startsWith("NM"))
				.sort(),
			HD: tryout.stages[0].mappool
				.filter((pick) => pick.pick_id.startsWith("HD"))
				.sort(),
			HR: tryout.stages[0].mappool
				.filter((pick) => pick.pick_id.startsWith("HR"))
				.sort(),
			DT: tryout.stages[0].mappool
				.filter((pick) => pick.pick_id.startsWith("DT"))
				.sort(),
			FM: tryout.stages[0].mappool
				.filter((pick) => pick.pick_id.startsWith("FM"))
				.sort(),
			Extra: tryout.stages[0].mappool
				.filter((pick) => {
					const pickText = pick.pick_id.slice(0, 2);

					if (["NM", "HD", "HR", "DT", "FM", "TB"].includes(pickText)) {
						return false;
					}

					return true;
				})
				.sort(),
			TB: tryout.stages[0].mappool
				.filter((pick) => pick.pick_id.startsWith("TB"))
				.sort(),
		};

		let embedDescription = "";

		for (const [mod, maps] of Object.entries(mappoolObject)) {
			if (maps.length === 0) {
				continue;
			}

			embedDescription += `**${mod}** pool:\n`;

			for (const map of maps) {
				embedDescription += `\\- \`${map.pick_id}\` | [${map.beatmap
					?.artist} - ${map.beatmap?.title} [${map.beatmap
					?.version}] [${map.beatmap?.difficulty_rating.toFixed(
					2,
				)}★]](https://osu.ppy.sh/beatmaps/${map.beatmap_id}) \`#${
					map.beatmap_id
				}\`\n`;
			}

			embedDescription += "\n";
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle(`${tryout.stages[0].name} Mappool`)
					.setDescription(embedDescription),
			],
		});
	}

	// TODO: Add an interactive message to confirm publication of the stage.
	// TODO: Maybe add an option to send a message in a channel when the pool is published.
	// TODO: Add an option to the above setting to ping players or not. (Default to no)
	// TODO: Add checks for numbered picks (NM1, NM2, NM3...) in case a number is skipped and send a warning in the confirmation message (ex: NM1, NM3, NM4 | missing NM2)
	public async chatInputStagePublish(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });

		const stageId = interaction.options
			.getString("stage-id", true)
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

		const tryout = await db.tryout.findFirst({
			where: {
				OR: [
					{
						staff_channel_id: interaction.channel?.id,
					},
					{
						player_channel_id: interaction.channel?.id,
					},
				],
			},
			include: {
				stages: {
					where: {
						custom_id: stageId,
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription("You don't have permission to do this."),
				],
			});

			return;
		}

		if (tryout.stages.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid stage!")
						.setDescription("The stage you specified does not exist."),
				],
			});

			return;
		}

		if (tryout.stages[0].is_published) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid stage!")
						.setDescription("The stage you specified is already published."),
				],
			});

			return;
		}

		try {
			await db.tryoutStage.update({
				where: {
					id: tryout.stages[0].id,
				},
				data: {
					is_published: true,
				},
			});

			// TODO: Add additional info to the reply like mappool and stage full information.
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							`Stage \`${tryout.stages[0].name}\` was published successfully.`,
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
							"An error occurred while publishing the stage. Please try again later.",
						),
				],
			});
		}
	}

	public async chatInputEmbedSend(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();
		let wasPreviousEmbedDeleted = false;

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
				staff_channel_id: interaction.channelId,
			},
		});

		if (!tryout) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This channel is not a tryout staff channel."),
				],
			});

			return;
		}

		if (!hasTryoutAdminRole(interaction, tryout)) {
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

		const channel = interaction.options.getChannel(
			"channel",
			true,
		) as GuildTextBasedChannel;

		if (tryout.embed_channel_id && tryout.embed_message_id) {
			const previousChannel = await interaction.guild?.channels.fetch(
				tryout.embed_channel_id,
			);

			if (previousChannel) {
				try {
					const messages = await (
						previousChannel as GuildTextBasedChannel
					).messages.fetch({
						around: tryout.embed_message_id,
						limit: 1,
					});

					const previousMessage = messages.get(tryout.embed_message_id);

					if (previousMessage) {
						await previousMessage.delete();
						wasPreviousEmbedDeleted = true;
					}
				} catch (error) {
					this.container.logger.error(error);
				}
			}
		} else {
			wasPreviousEmbedDeleted = true;
		}

		try {
			const newMessage = await channel.send(tryoutRegistration(tryout.name));

			await db.tryout.update({
				where: {
					id: tryout.id,
				},
				data: {
					embed_channel_id: channel.id,
					embed_message_id: newMessage.id,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor(wasPreviousEmbedDeleted ? "Green" : "Yellow")
						.setTitle("Success")
						.setDescription(
							`The tryout embed has been sent successfully to ${channel}` +
								(wasPreviousEmbedDeleted
									? "."
									: " but there was an error while trying to delete the previous one. Please delete it manually."),
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
							"An error occurred while sending the tryout embed.",
						),
				],
			});

			return;
		}
	}

	public async chatInputEditName(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

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

		const tryout = await db.tryout.findFirst({
			where: {
				OR: [
					{
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription("You don't have permission to do this."),
				],
			});

			return;
		}

		try {
			await db.tryout.update({
				where: {
					id: tryout.id,
				},
				data: {
					name,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							`The tryout name has been updated from \`${tryout.name}\` to \`${name}\`.`,
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
							"An error occurred while updating the tryout name. Please try again later.",
						),
				],
			});
		}
	}

	public async chatInputEditAcronym(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const acronym = interaction.options
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

		const tryout = await db.tryout.findFirst({
			where: {
				OR: [
					{
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription("You don't have permission to do this."),
				],
			});

			return;
		}

		try {
			await db.tryout.update({
				where: {
					id: tryout.id,
				},
				data: {
					acronym,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							`The tryout acronym has been updated from \`${tryout.acronym}\` to \`${acronym}\`.`,
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
							"An error occurred while updating the tryout acronym. Please try again later.",
						),
				],
			});
		}
	}

	public async chatInputEditStartDate(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const date = DateTime.fromFormat(
			interaction.options.getString("value", true).trim(),
			"yyyy-MM-dd HH:mm",
			{
				zone: "utc",
			},
		);

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
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription("You don't have permission to do this."),
				],
			});

			return;
		}

		if (!date.isValid) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid date!")
						.setDescription(
							"The date you specified is invalid. Please use the format `yyyy-MM-dd HH:mm`.",
						),
				],
			});

			return;
		}

		if (tryout.end_date < date.toJSDate()) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid date!")
						.setDescription(
							"The date you specified is after the tryout end date.",
						),
				],
			});

			return;
		}

		try {
			await db.tryout.update({
				where: {
					id: tryout.id,
				},
				data: {
					start_date: date.toJSDate(),
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							`The tryout start date has been updated from \`${DateTime.fromJSDate(
								tryout.start_date,
								{
									zone: "utc",
								},
							).toFormat("DDDD T")}\`.`,
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
							"An error occurred while updating the tryout start date. Please try again later.",
						),
				],
			});
		}
	}

	public async chatInputEditEndDate(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const date = DateTime.fromFormat(
			interaction.options.getString("value", true).trim(),
			"yyyy-MM-dd HH:mm",
			{
				zone: "utc",
			},
		);

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
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription("You don't have permission to do this."),
				],
			});

			return;
		}

		if (!date.isValid) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid date!")
						.setDescription(
							"The date you specified is invalid. Please use the format `yyyy-MM-dd HH:mm`.",
						),
				],
			});

			return;
		}

		if (tryout.start_date > date.toJSDate()) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid date!")
						.setDescription(
							"The date you specified is before the tryout start date.",
						),
				],
			});

			return;
		}

		try {
			await db.tryout.update({
				where: {
					id: tryout.id,
				},
				data: {
					end_date: date.toJSDate(),
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							`The tryout end date has been updated from \`${DateTime.fromJSDate(
								tryout.end_date,
								{
									zone: "utc",
								},
							).toFormat("DDDD T")}\` to \`${date.toFormat("DDDD T")}\`.`,
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
							"An error occurred while updating the tryout end date. Please try again later.",
						),
				],
			});
		}
	}

	public async chatInputEditStaffChannel(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		let channel = interaction.options.getChannel("channel");
		const deletePrevious = interaction.options.getBoolean("delete-previous");

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
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription("You don't have permission to do this."),
				],
			});

			return;
		}

		if (channel) {
			const overlappingTryout = await db.tryout.findFirst({
				where: {
					OR: [
						{
							staff_channel_id: channel.id,
						},
						{
							player_channel_id: channel.id,
						},
					],
					NOT: {
						id: tryout.id,
					},
				},
			});

			if (overlappingTryout) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Channel already in use!")
							.setDescription(
								"The channel you specified is already in use by another tryout.",
							),
					],
				});

				return;
			}
		}

		if (!channel) {
			try {
				channel = (await interaction.guild!.channels.create({
					name: `${tryout.acronym}-staff`,
					type: ChannelType.GuildText,
					permissionOverwrites: [
						{
							id: interaction.guild!.roles.everyone.id,
							deny: [PermissionFlagsBits.ViewChannel],
						},
						{
							id: tryout.admin_role_id,
							allow: [PermissionFlagsBits.ViewChannel],
						},
						{
							id: tryout.referee_role_id,
							allow: [PermissionFlagsBits.ViewChannel],
						},
					],
				})) as GuildTextBasedChannel;
			} catch (error) {
				this.container.logger.error(error);

				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(
								"An error occurred while creating the staff channel.",
							),
					],
				});

				return;
			}
		}

		if (deletePrevious && tryout.staff_channel_id !== channel.id) {
			const previousChannel = await interaction.guild?.channels.fetch(
				tryout.staff_channel_id,
			);

			if (previousChannel) {
				try {
					await previousChannel.delete();
				} catch (error) {
					this.container.logger.error(error);
				}
			}
		}

		try {
			await db.tryout.update({
				where: {
					id: tryout.id,
				},
				data: {
					staff_channel_id: channel.id,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							`The staff channel has been updated to <#${channel.id}>.`,
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
							"An error occurred while updating the staff channel.",
						),
				],
			});
		}
	}

	public async chatInputEditPlayerChannel(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		let channel = interaction.options.getChannel("channel");
		const deletePrevious = interaction.options.getBoolean("delete-previous");

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
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription("You don't have permission to do this."),
				],
			});

			return;
		}

		if (channel) {
			const overlappingTryout = await db.tryout.findFirst({
				where: {
					OR: [
						{
							staff_channel_id: channel.id,
						},
						{
							player_channel_id: channel.id,
						},
					],
					NOT: {
						id: tryout.id,
					},
				},
			});

			if (overlappingTryout) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Channel already in use!")
							.setDescription(
								"The channel you specified is already in use by another tryout.",
							),
					],
				});

				return;
			}
		}

		if (!channel) {
			try {
				channel = (await interaction.guild!.channels.create({
					name: `${tryout.acronym}-players`,
					type: ChannelType.GuildText,
					permissionOverwrites: [
						{
							id: interaction.guild!.roles.everyone.id,
							deny: [PermissionFlagsBits.ViewChannel],
						},
						{
							id: tryout.player_role_id,
							allow: [PermissionFlagsBits.ViewChannel],
						},
						{
							id: tryout.admin_role_id,
							allow: [PermissionFlagsBits.ViewChannel],
						},
						{
							id: tryout.referee_role_id,
							allow: [PermissionFlagsBits.ViewChannel],
						},
					],
				})) as GuildTextBasedChannel;
			} catch (error) {
				this.container.logger.error(error);

				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(
								"An error occurred while creating the player channel.",
							),
					],
				});

				return;
			}
		}

		if (deletePrevious && tryout.player_channel_id !== channel.id) {
			const previousChannel = await interaction.guild?.channels.fetch(
				tryout.player_channel_id,
			);

			if (previousChannel) {
				try {
					await previousChannel.delete();
				} catch (error) {
					this.container.logger.error(error);
				}
			}
		}

		try {
			await db.tryout.update({
				where: {
					id: tryout.id,
				},
				data: {
					player_channel_id: channel.id,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							`The player channel has been updated to <#${channel.id}>.`,
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
							"An error occurred while updating the player channel.",
						),
				],
			});
		}
	}

	public async chatInputEditPlayerRole(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		let role = interaction.options.getRole("role");
		const deletePrevious = interaction.options.getBoolean("delete-previous");

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
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription("You don't have permission to do this."),
				],
			});

			return;
		}

		if (!role) {
			try {
				role = await interaction.guild!.roles.create({
					name: `${tryout.acronym}: Player`,
				});
			} catch (error) {
				this.container.logger.error(error);

				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(
								"An error occurred while creating the player role.",
							),
					],
				});

				return;
			}
		}

		if (deletePrevious && role.id !== tryout.player_role_id) {
			const previousRole = await interaction.guild?.roles.fetch(
				tryout.player_role_id,
			);

			if (previousRole) {
				try {
					await previousRole.delete();
				} catch (error) {
					this.container.logger.error(error);
				}
			}
		}

		try {
			await db.tryout.update({
				where: {
					id: tryout.id,
				},
				data: {
					player_role_id: role.id,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							`The player role has been updated to <@&${role.id}>.`,
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
							"An error occurred while updating the player role.",
						),
				],
			});
		}
	}

	public async chatInputEditManagementRole(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		let role = interaction.options.getRole("role");
		const deletePrevious = interaction.options.getBoolean("delete-previous");

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
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription("You don't have permission to do this."),
				],
			});

			return;
		}

		if (!role) {
			try {
				role = await interaction.guild!.roles.create({
					name: `${tryout.acronym}: Management`,
				});
			} catch (error) {
				this.container.logger.error(error);

				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(
								"An error occurred while creating the management role.",
							),
					],
				});

				return;
			}
		}

		if (deletePrevious && role.id !== tryout.admin_role_id) {
			const previousRole = await interaction.guild?.roles.fetch(
				tryout.admin_role_id,
			);

			if (previousRole) {
				try {
					await previousRole.delete();
				} catch (error) {
					this.container.logger.error(error);
				}
			}
		}

		try {
			await db.tryout.update({
				where: {
					id: tryout.id,
				},
				data: {
					admin_role_id: role.id,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							`The management role has been updated to <@&${role.id}>.`,
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
							"An error occurred while updating the management role.",
						),
				],
			});
		}
	}

	public async chatInputEditRefereeRole(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		let role = interaction.options.getRole("role");
		const deletePrevious = interaction.options.getBoolean("delete-previous");

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
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription("You don't have permission to do this."),
				],
			});

			return;
		}

		if (!role) {
			try {
				role = await interaction.guild!.roles.create({
					name: `${tryout.acronym}: Referee`,
				});
			} catch (error) {
				this.container.logger.error(error);

				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(
								"An error occurred while creating the referee role.",
							),
					],
				});

				return;
			}
		}

		if (deletePrevious && role.id !== tryout.referee_role_id) {
			const previousRole = await interaction.guild?.roles.fetch(
				tryout.referee_role_id,
			);

			if (previousRole) {
				try {
					await previousRole.delete();
				} catch (error) {
					this.container.logger.error(error);
				}
			}
		}

		try {
			await db.tryout.update({
				where: {
					id: tryout.id,
				},
				data: {
					referee_role_id: role.id,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							`The referee role has been updated to <@&${role.id}>.`,
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
							"An error occurred while updating the referee role.",
						),
				],
			});
		}
	}

	public async chatInputEditAllowStaff(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const value = interaction.options.getBoolean("value", true);

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
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription("You don't have permission to do this."),
				],
			});

			return;
		}

		try {
			await db.tryout.update({
				where: {
					id: tryout.id,
				},
				data: {
					allow_staff: value,
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							value
								? "Staff members can now join the tryout."
								: "Staff members can no longer join the tryout.",
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
						.setDescription("An error occurred while updating the tryout."),
				],
			});
		}
	}

	public async chatInputPlayerRemove(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		await interaction.deferReply();

		const player = interaction.options.getUser("player", true);

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
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
			if (interaction.user.id !== player.id) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Invalid permissions!")
							.setDescription("You don't have permission to do this."),
					],
				});

				return;
			}
		}

		const playerData = await db.user.findFirst({
			where: {
				discord_id: player.id,
			},
			include: {
				tryouts: {
					where: {
						tryout_id: tryout.id,
					},
				},
			},
		});

		if (!playerData) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid player!")
						.setDescription(
							"The player you specified doesn't have an account.",
						),
				],
			});

			return;
		}

		if (playerData.tryouts.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid player!")
						.setDescription("The player you specified is not in this tryout."),
				],
			});

			return;
		}

		try {
			await db.tryout.update({
				where: {
					id: tryout.id,
				},
				data: {
					players: {
						delete: {
							tryout_id_user_id: {
								tryout_id: tryout.id,
								user_id: playerData.id,
							},
						},
					},
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Yellow")
						.setTitle("Player removed!")
						.setDescription(
							`<@${player.id}> has been removed from the tryout.`,
						),
				],
			});

			await player.send({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("You have been removed from a tryout!")
						.setDescription(
							`You have been removed from the \`${tryout.name}\` tryout by <@${interaction.user.id}>.`,
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
							"An error occurred while removing the player. Please try again later.",
						),
				],
			});
		}
	}

	public async chatInputPlayerList(
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

	private async handleListMessage(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		const stageId = interaction.options.getString("stage-id", false);

		const user = await db.user.findFirst({
			where: {
				discord_id: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.followUp({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		const tryout = await db.tryout.findFirst({
			where: {
				OR: [
					{
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
			},
			//! TypeScript can't infer whether the include is in the type or not with a ternary operator on the stageId so I gotta include this no matter what
			include: {
				players: {
					include: {
						player: true,
					},
				},
			},
		});

		if (!tryout) {
			await interaction.followUp({
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
			await interaction.followUp({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription("You don't have permission to do this."),
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
						.setDescription("There are no players registered for this tryout."),
				],
			});

			return;
		}

		if (stageId) {
			const stage = await db.tryoutStage.findFirst({
				where: {
					custom_id: stageId,
				},
				include: {
					lobbies: {
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

			if (!stage) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Invalid stage!")
							.setDescription("The stage you specified doesn't exist."),
					],
				});

				return;
			}

			const players = stage.lobbies.flatMap((lobby) => {
				return lobby.players.map((player) => {
					return {
						...player.player,
						lobbyId: lobby.custom_id,
						played: player.played,
					};
				});
			});

			let embedDescription = `Players in stage \`${stage.custom_id}\`:\n`;

			for (const player of players) {
				embedDescription += `<@${player.discord_id}> (\`${
					player.osu_username
				}\` - \`#${player.osu_id}\`) | Lobby \`${player.lobbyId}\` - ${
					player.played ? "Played" : "Not played"
				}\n`;
			}

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Blue")
						.setTitle("Player list")
						.setDescription(embedDescription),
				],
			});

			return;
		}

		let embedDescription = `Players in this tryout:\n`;

		for (const player of tryout.players) {
			embedDescription += `<@${player.player.discord_id}> (\`${
				player.player.osu_username
			}\` - \`#${player.player.osu_id}\`) | Joined on \`${DateTime.fromJSDate(
				player.created_at,
				{
					zone: "utc",
				},
			).toFormat("DDDD T")}\`\n`;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Blue")
					.setTitle("Player list")
					.setDescription(embedDescription),
			],
		});
	}

	private async handleListCSV(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		const stageId = interaction.options.getString("stage-id", false);

		const user = await db.user.findFirst({
			where: {
				discord_id: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.followUp({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		const tryout = await db.tryout.findFirst({
			where: {
				OR: [
					{
						staff_channel_id: interaction.channelId,
					},
					{
						player_channel_id: interaction.channelId,
					},
				],
			},
			//! TypeScript can't infer whether the include is in the type or not with a ternary operator on the stageId so I gotta include this no matter what
			include: {
				players: {
					include: {
						player: true,
					},
				},
			},
		});

		if (!tryout) {
			await interaction.followUp({
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

		if (!hasTryoutAdminRole(interaction, tryout)) {
			await interaction.followUp({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription("You don't have permission to do this."),
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
						.setDescription("There are no players registered for this tryout."),
				],
			});

			return;
		}

		if (stageId) {
			const stage = await db.tryoutStage.findFirst({
				where: {
					custom_id: stageId,
				},
				include: {
					lobbies: {
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

			if (!stage) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Invalid stage!")
							.setDescription("The stage you specified doesn't exist."),
					],
				});

				return;
			}

			const players = stage.lobbies.flatMap((lobby) => {
				return lobby.players.map((player) => {
					return {
						...player.player,
						lobbyId: lobby.custom_id,
						played: player.played,
					};
				});
			});

			const csv = unparse(
				{
					fields: [
						"discord_id",
						"discord_username",
						"osu_id",
						"osu_username",
						"lobby_id",
						"played",
					],
					data: players.map((player) => {
						return [
							player.discord_id,
							player.discord_username,
							player.osu_id,
							player.osu_username,
							player.lobbyId,
							player.played,
						];
					}),
				},
				{
					quotes: true,
				},
			);

			const data = Buffer.from(csv, "utf8");

			await interaction.editReply({
				files: [
					new AttachmentBuilder(data)
						.setName(`${tryout.acronym}-${stageId}.csv`)
						.setDescription("List of players in CSV format."),
				],
			});

			return;
		}

		const csv = unparse(
			{
				fields: [
					"discord_id",
					"discord_username",
					"osu_id",
					"osu_username",
					"joined_at",
				],
				data: tryout.players.map((player) => {
					return [
						player.player.discord_id,
						player.player.discord_username,
						player.player.osu_id,
						player.player.osu_username,
						player.created_at.toISOString(),
					];
				}),
			},
			{
				quotes: true,
			},
		);

		const data = Buffer.from(csv, "utf8");

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Blue")
					.setTitle("Player list")
					.setDescription(
						`There is a total of \`${tryout.players.length}\` players in this tryout.`,
					),
			],
			files: [
				new AttachmentBuilder(data)
					.setName(`${tryout.acronym}.csv`)
					.setDescription("List of players in CSV format."),
			],
		});
	}
}
