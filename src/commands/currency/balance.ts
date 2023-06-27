import {
	CommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../interfaces/command";
import db from "../../db";

export const balance: Command = {
	data: new SlashCommandBuilder()
		.setName("balance")
		.setDescription("Check your balance."),
	execute: async (interaction: CommandInteraction) => {
		await interaction.deferReply();
		const user = await db.users.findOne({
			where: {
				discordId: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You don't have an account. Please use the `/link` command to link your osu! account."
						),
				],
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
