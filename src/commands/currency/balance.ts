import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "@/interfaces/command";
import db from "@/db";
import { NoAccountEmbed } from "@/embeds";

export const balance: Command = {
	data: new SlashCommandBuilder()
		.setName("balance")
		.setDescription("Check your balance."),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();

		const user = await db.user.findFirst({
			where: {
				discordId: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Yellow")
					.setTitle("Balance")
					.setDescription(`You have **${user.balance}** coins.`),
			],
		});
	},
};
