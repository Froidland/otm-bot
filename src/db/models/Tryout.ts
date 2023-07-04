import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { TryoutLobby } from "./TryoutLobby";

@Entity({
	name: "tryouts",
})
export class Tryout {
	@PrimaryColumn({
		type: "varchar",
	})
	id: string;

	@Column("varchar")
	name: string;

	@Column("timestamp")
	startDate: Date;

	@Column("timestamp")
	endDate: Date;

	@Column("varchar")
	scheduleChannelId: string;

	@Column("varchar")
	serverId: string;

	@OneToMany(() => TryoutLobby, (lobby) => lobby.id)
	lobbies: TryoutLobby[];

	@CreateDateColumn({
		type: "timestamp",
	})
	createdAt: Date;

	@UpdateDateColumn({
		type: "timestamp",
	})
	updatedAt: Date;
}
