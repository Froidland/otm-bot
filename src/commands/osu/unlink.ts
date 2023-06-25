import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../interfaces/command";
import { AppDataSource, User } from "../../db";

// TODO: Honestly, this command is kinda useless, so I might just remove it.
export const unlink: Command = {
	data: new SlashCommandBuilder()
		.setName("unlink")
		.setDescription(
			"Unlinks any osu! profile associated with your discord account."
		),
	execute: async (interaction) => {
		await interaction.deferReply({ ephemeral: true });
		const users = AppDataSource.getRepository(User);

		const user = await users.findOne({
			where: {
				discordId: interaction.user.id,
			},
		});

		if (!user || user.osuId === null) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							`\`There is no osu! username linked to your discord account.\``
						),
				],
			});

			return;
		}

		await users.update(user.discordId, {
			osuId: null,
			username: null,
		});

		await interaction.editReply({
			content: `Unlinked osu! username \`${user.username}\` from your discord account.`,
		});
	},
};
