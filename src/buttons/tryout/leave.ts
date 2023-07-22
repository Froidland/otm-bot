import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { ButtonHandler } from "@/interfaces/buttonHandler";
import { getUser } from "@/utils/discordUtils";
import { ButtonInteraction, EmbedBuilder } from "discord.js";

// TODO: Embeds.
// TODO: Take away player's role.
// TODO: Check if player has registered for a lobby. Maybe unregister them and then remove their role?.
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

		if (tryout.players.length === 0) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are not in this tryout."),
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
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription("You have left the tryout."),
				],
			});
		} catch (error) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("Something went wrong. Please try again later."),
				],
			});

			return;
		}
	},
};
