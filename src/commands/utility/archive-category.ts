import {
	ChannelType,
	CommandInteraction,
	EmbedBuilder,
	GuildBasedChannel,
	OverwriteResolvable,
	PermissionFlagsBits,
	Role,
	SlashCommandBuilder,
	TextChannel,
} from "discord.js";
import { Command } from "@/interfaces/command";

export const archiveCategory: Command = {
	data: new SlashCommandBuilder()
		.setName("archive-category")
		.setDescription(
			"Move text channels from source category to target category and private them by default."
		)
		.addChannelOption((option) =>
			option
				.setName("source")
				.setDescription("Category to archive under the target category.")
				.addChannelTypes(ChannelType.GuildCategory)
				.setRequired(true)
		)
		.addChannelOption((option) =>
			option
				.setName("target")
				.setDescription("Category to archive the source text channels under.")
				.addChannelTypes(ChannelType.GuildCategory)
				.setRequired(true)
		)
		.addBooleanOption((option) =>
			option
				.setName("delete")
				.setDescription(
					"Whether the source category gets deleted or not after the process is done."
				)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("prefix")
				.setDescription("String to prefix each channel name with.")
				.setRequired(false)
		)
		.addRoleOption((option) =>
			option
				.setName("view-role")
				.setDescription(
					"Role with view-only permissions on the archived channels."
				)
				.setRequired(false)
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false),
	execute: async (interaction: CommandInteraction) => {
		await interaction.deferReply();
		const source = interaction.options.get("source", true)
			.channel as GuildBasedChannel;

		const target = interaction.options.get("target", true)
			.channel as GuildBasedChannel;

		const deleteSource = interaction.options.get("delete", true)
			.value as boolean;

		const prefix = interaction.options.get("prefix")?.value as
			| string
			| undefined;

		const viewRole = interaction.options.get("view-role")?.role as
			| Role
			| undefined;

		const targetChannelPermissions: OverwriteResolvable[] = [
			{
				id: interaction.guild!.roles.everyone.id,
				deny: [PermissionFlagsBits.ViewChannel],
			},
		];

		if (viewRole) {
			targetChannelPermissions.push({
				id: viewRole.id,
				allow: [PermissionFlagsBits.ViewChannel],
			});
		}

		// If the source and target categories are the same, return an error.
		if (source === target) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("Source and target categories cannot be the same."),
				],
			});

			return;
		}

		const sourceChannels: TextChannel[] = [];
		let targetChannelCount = 0;

		// Get all text channels in the source category and count the number of channels in the target category.
		for (const [_, channel] of interaction.guild!.channels.cache) {
			if (
				channel.type === ChannelType.GuildText &&
				channel.parentId === source.id
			) {
				sourceChannels.push(channel as TextChannel);
			}

			if (channel.parentId === target.id) {
				targetChannelCount++;
			}
		}

		if (sourceChannels.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("The source category is empty."),
				],
			});

			return;
		}

		// If the target category has more than 50 channels, return an error.
		if (targetChannelCount + sourceChannels.length > 50) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The target category cannot have more than 50 channels."
						),
				],
			});

			return;
		}

		// Move all channels from the source category to the target category.
		for (const channel of sourceChannels) {
			if (prefix) {
				await channel.setName(`${prefix}-${channel.name}`);
			}

			await channel.edit({
				parent: target.id,
				permissionOverwrites: targetChannelPermissions,
			});
		}

		// Delete the source category if the deleteSource option is true.
		if (deleteSource) {
			await source.delete();
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription("Category archived successfully."),
			],
		});
	},
};
