import { SubCommandGroup } from "@/interfaces";
import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import { create } from "./create";
import { claim } from "./claim";

const lobbyGroup: SubCommandGroup = {
	data: new SlashCommandSubcommandGroupBuilder()
		.setName("lobby")
		.setDescription("Commands for managing tryout lobbies.")
		.addSubcommand(create.data)
		.addSubcommand(claim.data),
	subCommands: [create, claim],
};

export default lobbyGroup;
