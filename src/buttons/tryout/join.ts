import { getUser } from "@/utils/discordUtils";
import db from "@/db";
import { ButtonHandler } from "@/interfaces/buttonHandler";
import { ButtonInteraction } from "discord.js";
import { NoAccountEmbed } from "@/embeds";
import { logger } from "@/utils";

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
				embedChannelId: interaction.channelId,
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
				content: "This tryout no longer exists.",
			});

			return;
		}

		if (tryout.players.length > 0) {
			await interaction.editReply({
				content: "You are already in this tryout.",
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
				content: "You have successfully joined the tryout.",
			});
		} catch (error) {
			logger.error(error);

			await interaction.editReply({
				content:
					"An error occurred while joining the tryout. Please try again later.",
			});
		}
	},
};
