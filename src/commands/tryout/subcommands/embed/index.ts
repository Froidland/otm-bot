import { SubCommandGroup } from "@/interfaces";
import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import { send } from "./send";

const embedGroup: SubCommandGroup = {
	data: new SlashCommandSubcommandGroupBuilder()
		.setName("embed")
		.setDescription("Commands for managing the tryout embed.")
		.addSubcommand(send.data),
	subCommands: [send],
};

export default embedGroup;
