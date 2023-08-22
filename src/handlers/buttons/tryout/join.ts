import db from "@/db";
import { ButtonHandler } from "@/interfaces/buttonHandler";
import {
	ButtonInteraction,
	EmbedBuilder,
	GuildMemberRoleManager,
} from "discord.js";
import { NoAccountEmbed } from "@/embeds";
import { logger } from "@/utils";

export const joinTryout: ButtonHandler = {
	customId: "join-tryout",
	execute: async (interaction: ButtonInteraction) => {
		await interaction.deferReply({
			ephemeral: true,
		});

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
				embed_message_id: interaction.message.id,
			},
			include: {
				players: {
					where: {
						user_id: user.id,
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
							user_id: user.id,
						},
					},
				},
			});

			const playerRole = await interaction.guild?.roles.fetch(
				tryout.player_role_id,
			);

			if (!playerRole) {
				throw new Error("Player role not found.");
			}

			await (interaction.member?.roles as GuildMemberRoleManager).add(
				playerRole,
			);

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
							"An error occurred while joining the tryout. Please try again later.",
						),
				],
			});
		}
	},
};
