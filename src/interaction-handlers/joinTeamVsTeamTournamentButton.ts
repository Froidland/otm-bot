import {
	InteractionHandler,
	InteractionHandlerTypes,
	PieceContext,
} from "@sapphire/framework";
import {
	type ButtonInteraction,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	ModalActionRowComponentBuilder,
} from "discord.js";

export class JoinTryoutButtonHandler extends InteractionHandler {
	public constructor(context: PieceContext) {
		super(context, {
			name: "joinTeamVsTeamTournamentButton",
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== "joinTeamVsTeamTournamentButton") {
			return this.none();
		}

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		const modal = new ModalBuilder()
			.setCustomId("joinTeamVsTeamTournamentModal")
			.setTitle("Tournament registration");

		const teamNameInput = new TextInputBuilder()
			.setCustomId("teamNameInput")
			.setLabel("Team name")
			.setPlaceholder("Enter your team name here")
			.setMinLength(3)
			.setMaxLength(127)
			.setRequired(true)
			.setStyle(TextInputStyle.Short);

		const teamIconInput = new TextInputBuilder()
			.setCustomId("teamIconInput")
			.setLabel("Team icon (e.g. https://i.imgur.com/1234.png)")
			.setPlaceholder("Enter the URL to your team's icon here")
			.setMinLength(3)
			.setMaxLength(255)
			.setRequired(false)
			.setStyle(TextInputStyle.Short);

		const timezoneInput = new TextInputBuilder()
			.setCustomId("teamTimezoneInput")
			.setLabel("Team timezone (e.g. UTC-3, UTC+0, UTC+3)")
			.setPlaceholder("Enter your team's timezone here")
			.setMinLength(3)
			.setMaxLength(16)
			.setRequired(true)
			.setStyle(TextInputStyle.Short);

		const teamNameActionRow =
			new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
				teamNameInput,
			);
		const teamTimezoneActionRow =
			new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
				timezoneInput,
			);
		const teamIconActionRow =
			new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
				teamIconInput,
			);

		modal.addComponents(
			teamNameActionRow,
			teamTimezoneActionRow,
			teamIconActionRow,
		);

		await interaction.showModal(modal);
	}
}
