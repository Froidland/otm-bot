import { ChatInputCommandInteraction, Interaction } from "discord.js";
import { buttonList, contextCommandList, commandList } from "@/handlers";

export const onInteraction = async (interaction: Interaction) => {
	if (interaction.isCommand()) {
		for (const command of commandList) {
			if (interaction.commandName === command.data.name) {
				await command.execute(interaction as ChatInputCommandInteraction);

				break;
			}
		}
	}

	if (interaction.isButton()) {
		for (const buttonHandler of buttonList) {
			if (buttonHandler.customId === interaction.customId) {
				await buttonHandler.execute(interaction);

				break;
			}
		}
	}

	if (interaction.isContextMenuCommand()) {
		for (const contextCommand of contextCommandList) {
			if (interaction.commandName === contextCommand.data.name) {
				await contextCommand.execute(interaction);

				break;
			}
		}
	}
};
