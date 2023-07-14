import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces/subCommand";
import { logger } from "@/utils";
import { createId } from "@paralleldrive/cuid2";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";

const create: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("create")
		.setDescription("Create a new team.")
		.addStringOption((option) =>
			option
				.setName("name")
				.setDescription("The name of the team.")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("timezone")
				.setDescription("The team's ideal timezone.")
				.setRequired(true)
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({
			ephemeral: true,
		});

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

		const id = createId();

		const name = interaction.options.getString("name", true);
		const timezone = interaction.options.getString("timezone", true);

		let embedDescription = "**__Team info:__**";
		embedDescription += `\n**Name:** ${name}`;
		embedDescription += `\n**Ideal Timezone:** ${timezone}`;
		embedDescription += `\n**Owner:** ${interaction.user}`;

		try {
			await db.team.create({
				data: {
					id,
					name,
					idealTimezone: timezone,
					owner: {
						connect: {
							discordId: interaction.user.id,
						},
					},
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Team Created!")
						.setDescription(embedDescription)
						.setFooter({
							text: `Unique ID: ${id}`,
						}),
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
							"An error occurred while creating your team. Changes have not been saved."
						),
				],
			});
		}
	},
};

export default create;
