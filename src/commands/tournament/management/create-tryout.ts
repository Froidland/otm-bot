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
					'The name of the tryout stage. (Example: "5WC Chile Tryouts Week 1")'
				)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("acronym")
				.setDescription(
					'The acronym of the tryout stage. (Example: "5WC CLT W1")'
				)
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
				.setName("schedule-channel")
				.setDescription(
					"The channel where the schedules of the tryout stage will be posted."
				)
				.addChannelTypes(ChannelType.GuildText)
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

		let playerRole = interaction.options.getRole("player-role");
		let scheduleChannel = interaction.options.getChannel("schedule-channel");

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
							"The start date or end date is not in the correct format. Please use the following format: `YYYY-MM-DD HH:MM`"
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

		if (!scheduleChannel) {
			scheduleChannel = (await interaction.guild?.channels.create({
				name: `${acronym.toUpperCase()}-schedules`,
				type: ChannelType.GuildText,
			})) as GuildTextBasedChannel;
		}
		
		
	},
};
