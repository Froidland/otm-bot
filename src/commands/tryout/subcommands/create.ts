import { isMemberAdmin } from "@/utils/discordUtils";
import { tryoutRegistration } from "@/interactive-messages";
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
	Message,
	PermissionFlagsBits,
	Role,
	SlashCommandSubcommandBuilder,
} from "discord.js";

// TODO: Add the ability to set restrictions to the tryout, like only players with a certain role can join, or players from a specific country.
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
		.addChannelOption((option) =>
			option
				.setName("embed-channel")
				.setDescription(
					"The channel where the tryout embed will be sent. (Default: Do not send)"
				)
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)
		)
		.addRoleOption((option) =>
			option
				.setName("management-role")
				.setDescription(
					"The role that staff members need to have to be able to manage the tryout. (Default: New Role)"
				)
				.setRequired(false)
		)
		.addRoleOption((option) =>
			option
				.setName("referee-role")
				.setDescription(
					"The role that referees need to have to be able to claim lobbies. (Default: New Role)"
				)
				.setRequired(false)
		)
		.addRoleOption((option) =>
			option
				.setName("player-role")
				.setDescription(
					"The role that players need to have to be able to execute the schedule commands. (Default: New Role)"
				)
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option
				.setName("staff-channel")
				.setDescription(
					"The channel where the staff members can manage the tryout. (Default: New Channel)"
				)
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option
				.setName("player-channel")
				.setDescription(
					"The channel where the players can talk. (Default: New Channel)"
				)
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option
				.setName("parent-category")
				.setDescription(
					"The parent category where the tryout channels will be created. (Default: None)"
				)
				.addChannelTypes(ChannelType.GuildCategory)
				.setRequired(false)
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();
		const hasAdminPermission = isMemberAdmin(interaction);
		let playerChannelCreated = false;
		let staffChannelCreated = false;
		let playerRoleCreated = false;
		let managementRoleCreated = false;
		let refereeRoleCreated = false;

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

		if (!hasAdminPermission) {
			await interaction.editReply({
				embeds: [NoAdminEmbed],
			});

			return;
		}

		const id = createId();

		const name = interaction.options.getString("name", true);
		const acronym = interaction.options.getString("acronym", true);
		const embedChannel = interaction.options.getChannel(
			"embed-channel"
		) as GuildTextBasedChannel | null;

		let playerRole = interaction.options.getRole("player-role") as Role | null;
		let managementRole = interaction.options.getRole(
			"management-role"
		) as Role | null;
		let refereeRole = interaction.options.getRole(
			"referee-role"
		) as Role | null;

		let staffChannel = interaction.options.getChannel(
			"staff-channel"
		) as GuildTextBasedChannel | null;
		let playerChannel = interaction.options.getChannel(
			"player-channel"
		) as GuildTextBasedChannel | null;

		const parentCategory =
			interaction.options.getChannel("parent-category") ?? undefined;

		if (!playerRole) {
			playerRole = (await interaction.guild?.roles.create({
				name: `${acronym}: Player`,
			})) as Role;

			playerRoleCreated = true;
		}

		if (!managementRole) {
			managementRole = (await interaction.guild?.roles.create({
				name: `${acronym}: Management`,
			})) as Role;

			managementRoleCreated = true;
		}

		if (!refereeRole) {
			refereeRole = (await interaction.guild?.roles.create({
				name: `${acronym}: Referee`,
			})) as Role;

			refereeRoleCreated = true;
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
						id: managementRole.id,
						allow: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: refereeRole.id,
						allow: [PermissionFlagsBits.ViewChannel],
					},
				],
				parent: parentCategory?.id,
			})) as GuildTextBasedChannel;

			staffChannelCreated = true;
		}

		if (!playerChannel) {
			playerChannel = (await interaction.guild?.channels.create({
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
						id: managementRole.id,
						allow: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: refereeRole.id,
						allow: [PermissionFlagsBits.ViewChannel],
					},
				],
				parent: parentCategory?.id,
			})) as GuildTextBasedChannel;

			playerChannelCreated = true;
		}

		let embedDescription = "**__Tryout info:__**\n";
		embedDescription += `**\\- Name:** \`${name}\`\n`;
		embedDescription += `**\\- Acronym:** \`${acronym}\`\n`;
		embedDescription += `**\\- Owner:** <@${user.discordId}>\n`;
		embedDescription += "**__Tryout roles and channels:__**\n";
		embedDescription += `**\\- Management Role:** <@&${managementRole.id}>\n`;
		embedDescription += `**\\- Referee Role:** <@&${refereeRole.id}>\n`;
		embedDescription += `**\\- Player Role:** <@&${playerRole.id}>\n`;

		if (embedChannel) {
			embedDescription += `**\\- Embed Channel:** <#${embedChannel.id}>\n`;
		}

		embedDescription += `**\\- Staff Channel:** <#${staffChannel.id}>\n`;
		embedDescription += `**\\- Player Channel:** <#${playerChannel.id}>`;

		try {
			let embedMessage: Message | null = null;

			if (embedChannel) {
				embedMessage = await embedChannel.send(tryoutRegistration(name));
			}

			await db.tryout.create({
				data: {
					id,
					name,
					serverId: interaction.guildId!,
					embedChannelId: embedChannel?.id,
					embedMessageId: embedMessage?.id,
					managementRoleId: managementRole.id,
					refereeRoleId: refereeRole.id,
					playerRoleId: playerRole.id,
					playerChannelId: playerChannel.id,
					staffChannelId: staffChannel.id,
					owner: {
						connect: {
							discordId: interaction.user.id,
						},
					},
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Tryout created!")
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
						.setTitle("DB error!")
						.setDescription(
							"An error occurred while creating the tryout. All changes will be reverted. Please contact the bot owner if this error persists."
						),
				],
			});

			// Channels
			if (playerChannelCreated) playerChannel.delete();
			if (staffChannelCreated) staffChannel.delete();

			// Roles
			if (playerRoleCreated) playerRole.delete();
			if (managementRoleCreated) managementRole.delete();
			if (refereeRoleCreated) refereeRole.delete();
		}
	},
};
