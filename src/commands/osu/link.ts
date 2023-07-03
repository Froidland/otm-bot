import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { v2 } from "osu-api-extended";
import { Command } from "@/interfaces/command";
import db from "@/db";

// TODO: Implement OAuth2 flow to link osu! account to discord account.
export const link: Command = {
	data: new SlashCommandBuilder()
		.setName("link")
		.setDescription("Links your osu! profile with the specified username.")
		.addStringOption((option) =>
			option
				.setName("username")
				.setDescription(
					"Username of the profile to link your discord account to."
				)
				.setRequired(true)
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({ ephemeral: true });
		const username = interaction.options.getString("username", true);

		const user = await v2.user.details(username, "osu");

		try {
			await db.users.save({
				discordId: interaction.user.id,
				osuId: user.id,
				username: user.username,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Success")
						.setDescription(
							`Linked your discord account to username \`${user.username}\`.`
						),
				],
			});
		} catch (error) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(`\`Unable to link username in the DB.\``),
				],
			});
		}
	},
};
