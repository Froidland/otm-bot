import {
	ChatInputCommandInteraction,
	CommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "@/interfaces/command";
import { logger } from "@/utils";
import db from "@/db";

export const coinflip: Command = {
	data: new SlashCommandBuilder()
		.setName("coinflip")
		.setDescription("Flip a coin and bet on the outcome.")
		.addStringOption((option) =>
			option
				.setName("side")
				.setDescription("The side of the coin you think it will land on.")
				.addChoices(
					{
						name: "Heads",
						value: "heads",
					},
					{
						name: "Tails",
						value: "tails",
					}
				)
				.setRequired(true)
		)
		.setDMPermission(false),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();

		const user = await db.user.findFirst({
			where: {
				discordId: interaction.user.id,
			},
		});

		if (!user) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("No Account!")
						.setDescription(
							"You don't have an account. Please use the `/link` command to link your osu! account."
						),
				],
			});

			return;
		}

		const side = interaction.options.getString("side", true);

		const coin = Math.random() < 0.5 ? "heads" : "tails";

		try {
			const newMoneyValue =
				side === coin
					? Math.ceil(user.balance * 1.1 + 100)
					: Math.ceil(user.balance * 0.75);

			await db.user.update({
				where: {
					discordId: user.discordId,
				},
				data: {
					balance: newMoneyValue,
				},
			});

			await interaction.editReply(
				`The coin landed on ${coin}. You ${
					side === coin ? "win!" : "lose"
				}. You now have ${newMoneyValue} coins.`
			);
		} catch (error) {
			logger.error(error);
			await interaction.editReply("An error occurred.");
			return;
		}
	},
};
