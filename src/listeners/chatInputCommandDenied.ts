import { ApplyOptions } from "@sapphire/decorators";
import {
	ChatInputCommandDeniedPayload,
	Events,
	Listener,
	UserError,
} from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

@ApplyOptions<Listener.Options>({
	event: Events.ChatInputCommandDenied,
})
export class ChatInputCommandDenied extends Listener<
	typeof Events.ChatInputCommandDenied
> {
	public override run(
		error: UserError,
		{ interaction }: ChatInputCommandDeniedPayload,
	) {
		if (interaction.deferred || interaction.replied) {
			return interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(error.message),
				],
			});
		}

		return interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setColor("Red")
					.setTitle("Error")
					.setDescription(error.message),
			],
		});
	}
}
