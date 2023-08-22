import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { tryoutRegistration } from "@/interactive-messages";
import { SubCommand } from "@/interfaces/subCommand";
import { logger } from "@/utils";
import {
	ChannelType,
	ChatInputCommandInteraction,
	EmbedBuilder,
	GuildTextBasedChannel,
	SlashCommandSubcommandBuilder,
} from "discord.js";

export const send: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("send")
		.setDescription(
			"Resends the tryout embed to the specified channel, deleting the old one.",
		)
		.addChannelOption((option) =>
			option
				.setName("channel")
				.setDescription("The channel where the tryout embed will be sent.")
				.setRequired(true)
				.addChannelTypes(ChannelType.GuildText),
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
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
					logger.error(error);
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
	},
};
