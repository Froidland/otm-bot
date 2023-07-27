import { SubCommandGroup } from "@/interfaces";
import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import { create } from "./create";

const lobbyGroup: SubCommandGroup = {
	data: new SlashCommandSubcommandGroupBuilder()
		.setName("lobby")
		.setDescription("Commands for managing tryout lobbies.")
		.addSubcommand(create.data),
	subCommands: [create],
};

export default lobbyGroup;
