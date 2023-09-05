import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "@/interfaces/command";

export const link: Command = {
	data: new SlashCommandBuilder()
		.setName("link")
		.setDescription("Links your osu! profile to your discord account."),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({ ephemeral: true });

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Blue")
					.setTitle("Authentication!")
					.setDescription(
						`Please login with your osu account on [this website](${
							process.env.FRONTEND_URL! + process.env.FRONTEND_LOGIN_ROUTE!
						}) and then link your discord account in order to make use of all the bot's features.`,
					),
			],
		});
	},
};
