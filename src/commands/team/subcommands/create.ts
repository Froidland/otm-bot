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
				.setDescription("The team's timezone.")
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

		const tournament = await db.tournament.findFirst({
			where: {
				playerChannelId: interaction.channelId,
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid channel!")
						.setDescription(
							"This command can only be used in a player channel."
						),
				],
			});

			return;
		}

		const existingTeam = await db.team.findFirst({
			where: {
				tournamentId: tournament.id,
				OR: [
					{
						ownerId: user.id,
					},
					{
						players: {
							some: {
								player: {
									id: user.id,
								},
							},
						},
					},
				],
			},
		});

		if (existingTeam) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("You already have a team!")
						.setDescription("You can only be in one team per tournament."),
				],
			});

			return;
		}

		const id = createId();

		const name = interaction.options.getString("name", true);
		const timezone = interaction.options.getString("timezone", true);

		let embedDescription = "**__Team info:__**";
		embedDescription += `\n**Name:** ${name}`;
		embedDescription += `\n**Timezone:** ${timezone}`;
		embedDescription += `\n**Owner:** ${interaction.user}`;

		try {
			await db.team.create({
				data: {
					id,
					name,
					timezone,
					owner: {
						connect: {
							discordId: interaction.user.id,
						},
					},
					tournament: {
						connect: {
							id: tournament.id,
						},
					},
				},
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Team created!")
						.setDescription(embedDescription)
						.setFooter({
							text: `Unique ID: ${id}`,
						}),
				],
			});

			logger.info(`Team ${id} created by ${interaction.user.id}`);
		} catch (error) {
			logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("DB error!")
						.setDescription(
							"An error occurred while creating your team. Changes have not been saved."
						),
				],
			});
		}
	},
};

export default create;
