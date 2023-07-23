import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { ButtonHandler } from "@/interfaces/buttonHandler";
import { getUser } from "@/utils/discordUtils";
import {
	ButtonInteraction,
	EmbedBuilder,
	GuildMemberRoleManager,
} from "discord.js";

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

			const playerRole = await interaction.guild?.roles.fetch(
				tryout.playerRoleId
			);

			if (!playerRole) {
				throw new Error("Player role not found.");
			}

			await (interaction.member?.roles as GuildMemberRoleManager).remove(
				playerRole
			);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Yellow")
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
