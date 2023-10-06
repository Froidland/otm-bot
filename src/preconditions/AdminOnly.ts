import { Precondition } from "@sapphire/framework";
import { ChatInputCommandInteraction, GuildMember } from "discord.js";

export class AdminOnlyPrecondition extends Precondition {
	public override chatInputRun(interaction: ChatInputCommandInteraction) {
		if (!interaction.member) {
			return this.error({ message: "User is not member." });
		}

		if (!(interaction.member instanceof GuildMember)) {
			return this.error({
				message: "An unexpected error has ocurred. please try again later.",
			});
		}

		return this.checkAdmin(interaction.member);
	}

	private checkAdmin(member: GuildMember) {
		return member.permissions.has("Administrator")
			? this.ok()
			: this.error({
					message: "Only server administrators can execute this command.",
			  });
	}
}

declare module "@sapphire/framework" {
	export interface Preconditions {
		AdminOnly: never;
	}
}
