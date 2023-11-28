import { lobbyStore } from "@/bancho/store";
import db from "@/db";
import { NoAccountEmbed } from "@/embeds";
import {
	InteractionHandler,
	InteractionHandlerTypes,
	PieceContext,
} from "@sapphire/framework";
import BanchoJs from "bancho.js";
import { ButtonInteraction, EmbedBuilder } from "discord.js";

export class InviteTryoutLobbyButtonHandler extends InteractionHandler {
	public constructor(context: PieceContext) {
		super(context, {
			name: "inviteTryoutLobbyButton",
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== "inviteTryoutLobbyButton") {
			return this.none();
		}

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		await interaction.deferReply({
			ephemeral: true,
		});

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

		const lobby = await db.tryoutLobby.findFirst({
			where: {
				player_embed_message_id: interaction.message.id,
			},
			include: {
				stage: {
					include: {
						tryout: true,
					},
				},
			},
		});

		if (!lobby) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This lobby no longer exists or the embed is invalid.",
						),
				],
			});

			return;
		}

		if (!lobby.bancho_id) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"This lobby is missing a bancho ID. Maybe it hasn't started yet?",
						),
				],
			});

			return;
		}

		const ongoingLobby = lobbyStore.get(lobby.bancho_id);

		if (!ongoingLobby) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This lobby is no longer active."),
				],
			});

			return;
		}

		if (!ongoingLobby.players.some((p) => p.osuId === user.osu_id)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("You are not in the player list for this lobby."),
				],
			});

			return;
		}

		const banchoChannel = this.container.bancho.getChannel(
			`#mp_${ongoingLobby.banchoId}`,
		);

		// TODO: Reply with error if the channel is not a multiplayer channel.
		if (!(banchoChannel instanceof BanchoJs.BanchoMultiplayerChannel)) {
			return;
		}

		await banchoChannel.lobby.invitePlayer(`#${user.osu_id}`);

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription("The invite has been sent."),
			],
		});
	}
}
