import { isMemberAdmin } from "@/commands/utils";
import db from "@/db";
import { NoAccountEmbed, NoAdminEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces/subCommand";
import { logger } from "@/utils";
import { createId } from "@paralleldrive/cuid2";
import {
	ChannelType,
	ChatInputCommandInteraction,
	EmbedBuilder,
	GuildTextBasedChannel,
	PermissionFlagsBits,
	PermissionsBitField,
	Role,
	SlashCommandSubcommandBuilder,
} from "discord.js";

export const create: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("create")
		.setDescription("Creates a tryout.")
		.addStringOption((option) =>
			option
				.setName("name")
				.setDescription(
					'The name of the tryout. (Example: "5WC Chile Tryouts 2023")'
				)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("acronym")
				.setDescription('The acronym of the tryout stage. (Example: "5WC CLT")')
				.setRequired(true)
		)
		.addBooleanOption((option) =>
			option
				.setName("is-joinable")
				.setDescription(
					"Whether players can join the tryout stage. If false, only staff members can add players."
				)
				.setRequired(true)
		)
		.addRoleOption((option) =>
			option
				.setName("staff-role")
				.setDescription(
					"The role that staff members need to have to be able to manage the tryout stage."
				)
				.setRequired(false)
		)
		.addRoleOption((option) =>
			option
				.setName("player-role")
				.setDescription(
					"The role that players need to have to be able to participate in the tryout stage."
				)
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option
				.setName("staff-channel")
				.setDescription(
					"The channel where the staff members can manage the tryout stage."
				)
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option
				.setName("schedule-channel")
				.setDescription(
					"The channel where the schedules of the tryout stage will be posted."
				)
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option
				.setName("parent-category")
				.setDescription(
					"The parent category where the staff channel and schedule channel will be created unless specified."
				)
				.addChannelTypes(ChannelType.GuildCategory)
				.setRequired(false)
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

		const name = interaction.options.getString("name", true);
		const acronym = interaction.options.getString("acronym", true);
		const isJoinable = interaction.options.getBoolean("is-joinable", true);

		let playerRole = interaction.options.getRole("player-role") as Role | null;
		let staffRole = interaction.options.getRole("staff-role") as Role | null;

		let staffChannel = interaction.options.getChannel(
			"staff-channel"
		) as GuildTextBasedChannel;
		let scheduleChannel = interaction.options.getChannel(
			"schedule-channel"
		) as GuildTextBasedChannel;

		const parentCategory =
			interaction.options.getChannel("parent-category") ?? undefined;

		// Check if the user has linked their account.
		const user = await db.users.findOne({
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

		if (!playerRole) {
			playerRole = (await interaction.guild?.roles.create({
				name: `${acronym}: Player`,
			})) as Role;
		}

		if (!staffRole) {
			staffRole = (await interaction.guild?.roles.create({
				name: `${acronym}: Staff`,
			})) as Role;
		}

		if (!scheduleChannel) {
			scheduleChannel = (await interaction.guild?.channels.create({
				name: `${acronym}-schedules`,
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
						id: staffRole.id,
						allow: [PermissionFlagsBits.ViewChannel],
					},
				],
				parent: parentCategory?.id,
			})) as GuildTextBasedChannel;
		}

		if (!staffChannel) {
			staffChannel = (await interaction.guild?.channels.create({
				name: `${acronym}-staff`,
				type: ChannelType.GuildText,
				permissionOverwrites: [
					{
						id: interaction.guild?.roles.everyone.id,
						deny: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: staffRole.id,
						allow: [PermissionFlagsBits.ViewChannel],
					},
				],
				parent: parentCategory?.id,
			})) as GuildTextBasedChannel;
		}

		let embedDescription = "**__Tryout info:__**\n";
		embedDescription += `**\\- Name:** \`${name}\`\n`;
		embedDescription += `**\\- Acronym:** \`${acronym}\`\n`;
		embedDescription += "**__Tryout settings:__**\n";
		embedDescription += `**\\- Is Joinable:** \`${
			isJoinable ? "Yes" : "No"
		}\`\n`;
		embedDescription += "**__Tryout roles and channels:__**\n";
		embedDescription += `**\\- Staff Role:** ${staffRole}\n`;
		embedDescription += `**\\- Player Role:** ${playerRole}\n`;
		embedDescription += `**\\- Staff Channel:** ${staffChannel}\n`;
		embedDescription += `**\\- Schedule Channel:** ${scheduleChannel}`;

		try {
			await db.tryouts.insert({
				id,
				name,
				serverId: interaction.guildId!,
				staffRoleId: staffRole.id,
				playerRoleId: playerRole.id,
				staffChannelId: staffChannel.id,
				scheduleChannelId: scheduleChannel.id,
				isJoinable,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Tryout Created")
						.setDescription(embedDescription)
						.setFooter({
							text: `Unique ID: ${id}`,
						}),
				],
			});
		} catch (error) {
			logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("DB Error!")
						.setDescription(
							"An error occurred while creating the tryout. All changes will be reverted. Please contact the bot owner if this error persists."
						),
				],
			});

			// Channels
			await staffChannel.delete();
			await scheduleChannel.delete();

			// Roles
			await playerRole.delete();
			await staffRole.delete();
		}
	},
};
