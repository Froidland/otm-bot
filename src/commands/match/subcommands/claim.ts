import { getUser, isUserTournamentReferee } from "@/utils/discordUtils";
import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import { SubCommand } from "@/interfaces/subCommand";
import { logger } from "@/utils";
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";

const claim: SubCommand = {
	data: new SlashCommandSubcommandBuilder()
		.setName("claim")
		.setDescription("Claim a match. This will make you the match referee.")
		.addStringOption((option) =>
			option
				.setName("match-id")
				.setDescription("The ID of the match you want to claim.")
				.setRequired(true)
		),
	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();

		const user = await getUser(interaction);

		if (!user) {
			await interaction.editReply({
				embeds: [NoAccountEmbed],
			});

			return;
		}

		const matchId = interaction.options.getString("match-id", true);

		const tournament = await db.tournament.findFirst({
			where: {
				refereeChannelId: interaction.channelId,
			},
		});

		if (!tournament) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid channel!")
						.setDescription(
							"This command can only be used in a tournament referee channel."
						),
				],
			});

			return;
		}

		if (!isUserTournamentReferee(interaction, tournament)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid permissions!")
						.setDescription(
							"You need to be a tournament referee to use this command."
						),
				],
			});

			return;
		}

		const match = await db.match.findFirst({
			where: {
				id: matchId,
			},
		});

		if (!match) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid match!")
						.setDescription("This match does not exist."),
				],
			});

			return;
		}

		if (match.refereeId) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Invalid match!")
						.setDescription(
							"This match has already been claimed by another referee."
						),
				],
			});

			return;
		}

		try {
			await db.match.update({
				where: {
					id: matchId,
				},
				data: {
					refereeId: user.id,
				},
			});
		} catch (error) {
			logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error!")
						.setDescription("An error occurred while claiming this match."),
				],
			});

			return;
		}
	},
};
