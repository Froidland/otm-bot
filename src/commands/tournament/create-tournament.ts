import {
	ChannelType,
	CommandInteraction,
	EmbedBuilder,
	PermissionFlagsBits,
	Role,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../interfaces/command";
import { createId } from "@paralleldrive/cuid2";
import db from "../../db";

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
					}
				)
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
				.setName("staff-channel")
				.setDescription(
					"The staff channel for the tournament. One will be created if not specified."
				)
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option
				.setName("referee-channel")
				.setDescription(
					"The refeere channel for the tournament. One will be created if not specified."
				)
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option
				.setName("schedules-channel")
				.setDescription(
					"The schedules channel for the tournament. One will be created if not specified."
				)
				.addChannelTypes(ChannelType.GuildText)
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
			where: { discordId: interaction.user.id },
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

		let staffChannel =
			interaction.options.get("staff-channel")?.channel ?? null;
		let refereeChannel =
			interaction.options.get("referee-channel")?.channel ?? null;
		let schedulesChannel =
			interaction.options.get("schedules-channel")?.channel ?? null;

		let createdChannelsCount = 0;

		// Check if the channels are already used by another tournament and if one of the options is the same as another one.
		if (staffChannel !== null) {
			if (
				staffChannel === refereeChannel ||
				staffChannel === schedulesChannel
			) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(
								`**The staff channel cannot be the same as one of the other options.**`
							),
					],
				});

				return;
			}

			const usedStaffChannel = await db.tournaments.findOne({
				where: { staffChannelId: staffChannel.id },
			});

			if (!usedStaffChannel) {
				createdChannelsCount++;
				staffChannel = undefined;
			}
		} else {
			createdChannelsCount++;
		}

		if (refereeChannel !== null) {
			if (
				refereeChannel === staffChannel ||
				refereeChannel === schedulesChannel
			) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(
								`**The referee channel cannot be the same as one of the other options.**`
							),
					],
				});

				return;
			}

			const usedRefereeChannel = await db.tournaments.findOne({
				where: { refereeChannelId: refereeChannel.id },
			});

			if (!usedRefereeChannel) {
				createdChannelsCount++;
				refereeChannel = undefined;
			}
		} else {
			createdChannelsCount++;
		}

		if (schedulesChannel !== null) {
			if (
				schedulesChannel === staffChannel ||
				schedulesChannel === refereeChannel
			) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(
								`**The schedules channel cannot be the same as one of the other options.**`
							),
					],
				});

				return;
			}

			const usedSchedulesChannel = await db.tournaments.findOne({
				where: { schedulesChannelId: schedulesChannel.id },
			});

			if (!usedSchedulesChannel) {
				createdChannelsCount++;
				schedulesChannel = undefined;
			}
		} else {
			createdChannelsCount++;
		}

		const parentCategory =
			interaction.options.get("parent-category")?.channel ?? null;

		// Check if the parent category has enough space to hold all the channels that have to be created.
		if (parentCategory !== null) {
			let parentChannelsCount = 0;

			for (const [_, channel] of interaction.guild.channels.cache) {
				if (channel.parent === parentCategory) {
					parentChannelsCount++;
				}
			}

			if (parentChannelsCount + createdChannelsCount > 50) {
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Red")
							.setTitle("Error")
							.setDescription(
								`**The parent category doesn't have enough space to hold all the text channels that have to be created.**`
							),
					],
				});

				return;
			}
		}

		const name = interaction.options.get("name").value as string;
		const acronym = interaction.options
			.get("acronym")
			.value.toString()
			.toUpperCase();

		let embedDescription = `**- ID:** \`${id}\`\n`;
		embedDescription += `**- Name:** \`${name}\`\n`;
		embedDescription += `**- Acronym:** \`${acronym}\`\n`;
		embedDescription += `**- Owner:** \`${interaction.user.tag}\`\n`;
		embedDescription += "-------------------------------------------\n";

		const winCondition = interaction.options.get("win-condition").value as
			| "Score"
			| "Accuracy"
			| "MissCount";
		embedDescription += `:green_circle: **Win condition:** \`${winCondition}\`\n`;

		const scoring = interaction.options.get("scoring").value as
			| "ScoreV1"
			| "ScoreV2";
		embedDescription += `:green_circle: **Scoring:** \`${scoring}\`\n`;

		const tournamentType = interaction.options.get("type").value as
			| "TeamBased"
			| "OneVsOne"
			| "BattleRoyale";
		embedDescription += `:green_circle: **Type:** \`${tournamentType}\`\n`;

		const staffRole =
			(interaction.options.get("staff-role")?.role as Role) ??
			(await interaction.guild.roles.create({ name: `${acronym}: Staff` }));
		embedDescription += `:green_circle: **Staff role:** ${staffRole}\n`;

		const refereeRole =
			(interaction.options.get("referee-role")?.role as Role) ??
			(await interaction.guild.roles.create({ name: `${acronym}: Referee` }));
		embedDescription += `:green_circle: **Referee role:** ${refereeRole}\n`;

		const playerRole =
			(interaction.options.get("player-role")?.role as Role) ??
			(await interaction.guild.roles.create({ name: `${acronym}: Player` }));
		embedDescription += `:green_circle: **Player role:** ${playerRole}\n`;

		// Create the channels missing from the options.
		// If the channel is set to null, it means that it has to be created.
		// If the channel is set to undefined, it means that it has already been used by another tournament and another one has to be created.
		// If the channel is set to a channel, it means that it has been set by the user.

		if (staffChannel === null) {
			staffChannel = await interaction.guild.channels.create({
				name: "staff",
				parent: parentCategory?.id ?? null,
				permissionOverwrites: [
					{
						id: interaction.guild.roles.everyone,
						deny: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: staffRole,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
						],
					},
				],
			});

			embedDescription += `:green_circle: **Staff channel:** Created ${staffChannel}\n`;
		} else if (staffChannel === undefined) {
			staffChannel = await interaction.guild.channels.create({
				name: "staff",
				parent: parentCategory?.id ?? null,
				permissionOverwrites: [
					{
						id: interaction.guild.roles.everyone,
						deny: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: staffRole,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
						],
					},
				],
			});
			embedDescription += `:red_circle: **Staff channel:** Already used by another tournament, created ${staffChannel}\n`;
		} else {
			embedDescription += `:yellow_circle: **Staff channel:** Used ${staffChannel}\n`;
		}

		if (refereeChannel === null) {
			refereeChannel = await interaction.guild.channels.create({
				name: "referee",
				parent: parentCategory?.id ?? null,
				permissionOverwrites: [
					{
						id: interaction.guild.roles.everyone,
						deny: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: refereeRole,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
						],
					},
				],
			});

			embedDescription += `:green_circle: **Referee channel:** Created ${refereeChannel}\n`;
		} else if (refereeChannel === undefined) {
			refereeChannel = await interaction.guild.channels.create({
				name: "referee",
				parent: parentCategory?.id ?? null,
				permissionOverwrites: [
					{
						id: interaction.guild.roles.everyone,
						deny: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: refereeRole,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
						],
					},
				],
			});

			embedDescription += `:red_circle: **Referee channel:** Already used by another tournament, created ${refereeChannel}\n`;
		} else {
			embedDescription += `:yellow_circle: **Referee channel:** Used ${refereeChannel}\n`;
		}

		if (schedulesChannel === null) {
			schedulesChannel = await interaction.guild.channels.create({
				name: "schedules",
				parent: parentCategory?.id ?? null,
				permissionOverwrites: [
					{
						id: interaction.guild.roles.everyone,
						deny: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: refereeRole,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
						],
					},
					{
						id: playerRole,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
						],
					},
				],
			});

			embedDescription += `:green_circle: **Schedules channel:** Created ${schedulesChannel}\n`;
		} else if (schedulesChannel === undefined) {
			schedulesChannel = await interaction.guild.channels.create({
				name: "schedules",
				parent: parentCategory?.id ?? null,
				permissionOverwrites: [
					{
						id: interaction.guild.roles.everyone,
						deny: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: refereeRole,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
						],
					},
					{
						id: playerRole,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
						],
					},
				],
			});

			embedDescription += `:red_circle: **Schedules channel:** Already used by another tournament, created ${schedulesChannel}\n`;
		} else {
			embedDescription += `:yellow_circle: **Schedules channel:** Used ${schedulesChannel}\n`;
		}

		// Insert the tournament into the database.
		// TODO: If the tournament creation fails, delete the created channels and roles.
		await db.tournaments.insert({
			id,
			name,
			acronym,
			winCondition,
			scoring,
			style: tournamentType,
			staffRoleId: staffRole.id,
			refereeRoleId: refereeRole.id,
			playerRoleId: playerRole.id,
			creator: user,
			serverId: interaction.guild.id,
			staffChannelId: staffChannel.id,
			refereeChannelId: refereeChannel.id,
			schedulesChannelId: schedulesChannel.id,
		});

		const embed = new EmbedBuilder()
			.setColor("Green")
			.setTitle("Tournament successfully created.")
			.setDescription(embedDescription)
			.setTimestamp(new Date());

		await interaction.editReply({
			embeds: [embed],
		});
	},
};
