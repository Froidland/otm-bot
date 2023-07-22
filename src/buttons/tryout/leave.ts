import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { ButtonHandler } from "@/interfaces/buttonHandler";
import { getUser } from "@/utils/discordUtils";
import { ButtonInteraction } from "discord.js";

// TODO: Embeds.
export const leaveTryout: ButtonHandler = {
	customId: "leave-tryout",
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

		if (tryout.players.length === 0) {
			await interaction.editReply({
				content: "You are not in this tryout.",
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
							tryoutId_userId: {
								userId: user.id,
								tryoutId: tryout.id,
							},
						},
					},
				},
			});

			await interaction.editReply({
				content: "You have left the tryout.",
			});
		} catch (error) {
			await interaction.editReply({
				content: "Something went wrong. Please try again later.",
			});

			return;
		}
	},
};
