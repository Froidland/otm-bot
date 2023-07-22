import { getUser } from "@/utils/discordUtils";
import db from "@/db";
import { ButtonHandler } from "@/interfaces/buttonHandler";
import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { NoAccountEmbed } from "@/embeds";
import { logger } from "@/utils";

// TODO: Embeds.
// TODO: Give player a role.
export const joinTryout: ButtonHandler = {
	customId: "join-tryout",
	execute: async (interaction: ButtonInteraction) => {
		await interaction.deferReply({
			ephemeral: true,
		});

		const user = await getUser(interaction);

		if (!user) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		const tryout = await db.tryout.findFirst({
			where: {
				embedMessageId: interaction.message.id,
			},
			include: {
				players: {
					where: {
						userId: user.id,
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
						.setDescription("This tryout no longer exists."),
				],
			});

			return;
		}

		if (tryout.players.length > 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are already in this tryout."),
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
						create: {
							userId: user.id,
						},
					},
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription("You have successfully joined the tryout."),
				],
			});
		} catch (error) {
			logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occurred while joining the tryout. Please try again later."
						),
				],
			});
		}
	},
};
