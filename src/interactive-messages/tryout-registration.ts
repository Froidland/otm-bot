import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	MessageCreateOptions,
	MessagePayload,
} from "discord.js";

const joinButton = new ButtonBuilder()
	.setCustomId("join-tryout")
	.setLabel("Join")
	.setStyle(ButtonStyle.Success);

const leaveButton = new ButtonBuilder()
	.setCustomId("leave-tryout")
	.setLabel("Leave")
	.setStyle(ButtonStyle.Danger);

const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	joinButton,
	leaveButton
);

export const tryoutRegistration = (
	tryoutName: string
): MessageCreateOptions => {
	return {
		embeds: [
			new EmbedBuilder()
				.setColor("Blue")
				.setTitle(`${tryoutName}`)
				.setDescription("Click the buttons below to join or leave the tryout."),
		],
		components: [actionRow],
	};
};
