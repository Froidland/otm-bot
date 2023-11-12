import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import {
	InteractionHandler,
	InteractionHandlerTypes,
	PieceContext,
} from "@sapphire/framework";
import { ButtonInteraction, EmbedBuilder } from "discord.js";

export class UnclaimQualifiersLobbyButton extends InteractionHandler {
	public constructor(context: PieceContext) {
		super(context, {
			name: "unclaimQualifiersLobbyButton",
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== "unclaimQualifiersLobbyButton") {
			return this.none();
		}

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		await interaction.deferReply();

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

		const lobby = await db.tournamentQualifierLobby.findFirst({
			where: {
				schedule_embed_message_id: interaction.message.id,
			},
			include: {
				team: true,
			},
		});

		if (!lobby) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This embed is no longer valid or the lobby no longer exists.",
						),
				],
			});

			return;
		}

		if (lobby.referee_id !== user.id) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You can't unclaim a lobby that you haven't claimed.",
						),
				],
			});

			return;
		}

		try {
			await db.tournamentQualifierLobby.update({
				where: {
					id: lobby.id,
				},
				data: {
					referee_id: null,
				},
			});
		} catch (error) {
			this.container.logger.error(error);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error occured while unclaiming the lobby. Please try again later.",
						),
				],
			});

			return;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription(
						`You have unclaimed the lobby for team \`${lobby.team.name}\`.`,
					),
			],
		});
	}
}
