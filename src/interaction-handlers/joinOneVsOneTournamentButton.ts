import {
	InteractionHandler,
	InteractionHandlerTypes,
	PieceContext,
} from "@sapphire/framework";
import {
	type ButtonInteraction,
	ModalBuilder,
	TextInputStyle,
	ModalActionRowComponentBuilder,
	ActionRowBuilder,
	TextInputBuilder,
} from "discord.js";

export class JoinTryoutButtonHandler extends InteractionHandler {
	public constructor(context: PieceContext) {
		super(context, {
			name: "joinOneVsOneTournamentButton",
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== "joinOneVsOneTournamentButton") {
			return this.none();
		}

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		const modal = new ModalBuilder()
			.setCustomId("joinOneVsOneTournamentModal")
			.setTitle("Tournament registration");

		const timezoneInput = new TextInputBuilder()
			.setCustomId("timezoneInput")
			.setLabel("Timezone (e.g. UTC-3, UTC+0, UTC+3)")
			.setPlaceholder("Enter your timezone here")
			.setMinLength(3)
			.setMaxLength(16)
			.setRequired(true)
			.setStyle(TextInputStyle.Short);

		const timezoneActionRow =
			new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
				timezoneInput,
			);

		modal.addComponents(timezoneActionRow);

		await interaction.showModal(modal);
	}
}
