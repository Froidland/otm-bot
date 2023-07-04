import {
	ChannelType,
	ChatInputCommandInteraction,
	EmbedBuilder,
	GuildTextBasedChannel,
	PermissionFlagsBits,
	Role,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "@/interfaces/command";
import { DateTime } from "luxon";
import { createId } from "@paralleldrive/cuid2";
import db from "@/db";
import { logger } from "@/utils";

export const createTryout: Command = {
	data: new SlashCommandBuilder()
		.setName("create-tryout")
		.setDescription(
			"Creates a tryout stage. This is independent of any tournament."
		)
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
		.addStringOption((option) =>
			option
				.setName("start-date")
				.setDescription(
					'The start date of the tryout stage in UTC. Format: "YYYY-MM-DD HH:MM"'
				)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("end-date")
				.setDescription(
					'The end date of the tryout stage in UTC. Format: "YYYY-MM-DD HH:MM"'
				)
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
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();
		const id = createId();

		const name = interaction.options.getString("name", true);
		const acronym = interaction.options.getString("acronym", true);
		const startDateString = interaction.options.getString("start-date", true);
		const endDateString = interaction.options.getString("end-date", true);
		const isJoinable = interaction.options.getBoolean("is-joinable", true);

		let playerRole = interaction.options.getRole("player-role");
		let staffRole = interaction.options.getRole("staff-role");

		let staffChannel = interaction.options.getChannel("staff-channel");
		let scheduleChannel = interaction.options.getChannel("schedule-channel");

		const parentCategory =
			interaction.options.getChannel("parent-category") ?? undefined;

		const startDate = DateTime.fromFormat(startDateString, "yyyy-MM-dd HH:mm", {
			zone: "utc",
		});
		const endDate = DateTime.fromFormat(endDateString, "yyyy-MM-dd HH:mm", {
			zone: "utc",
		});

		if (!startDate.isValid || !endDate.isValid) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The start date or end date is not in the correct format. Please use the following format: `YYYY-MM-DD HH:MM`.\n" +
								"Make sure the date is valid and the time is in UTC."
						),
				],
			});

			return;
		}

		if (startDate > endDate) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("The start date cannot be after the end date."),
				],
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
		embedDescription += `**\\- Unique ID:** \`${id}\`\n`;
		embedDescription += `**\\- Name:** \`${name}\`\n`;
		embedDescription += `**\\- Acronym:** \`${acronym}\`\n`;
		embedDescription += "**__Tryout settings:__**\n";
		embedDescription += `**\\- Start Date:** \`${startDate.toRFC2822()}\`\n`;
		embedDescription += `**\\- End Date:** \`${endDate.toRFC2822()}\`\n`;
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
				startDate: startDate.toJSDate(),
				endDate: endDate.toJSDate(),
				isJoinable,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Tryout Created")
						.setDescription(embedDescription),
				],
			});
		} catch (error) {
			logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("An error occurred while creating the tryout."),
				],
			});
		}
	},
};
