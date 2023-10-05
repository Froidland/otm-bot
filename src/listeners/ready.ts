import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Client } from "discord.js";

@ApplyOptions<Listener.Options>({
	event: "ready",
	once: true,
})
export class ReadyListener extends Listener {
	public run(client: Client) {
		this.container.logger.info(`Logged in as ${client.user?.tag}`);
	}
}
