import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { TryoutLobby } from "./TryoutLobby";
import { Tryout } from "./Tryout";

@Entity({
	name: "tryout-stages",
})
export class TryoutStage {
	@PrimaryColumn("varchar")
	id: string;

	@Column("varchar")
	name: string;

	@Column("varchar")
	customId: string;

	@Column("timestamp")
	startDate: Date;

	@Column("timestamp")
	endDate: Date;

	@OneToMany(() => TryoutLobby, (lobby) => lobby.id)
	lobbies: TryoutLobby[];

	@ManyToOne(() => Tryout, (tryout) => tryout.id)
	tryout: Tryout;

	@CreateDateColumn({
		type: "timestamp",
	})
	createdAt: Date;

	@UpdateDateColumn({
		type: "timestamp",
	})
	updatedAt: Date;
}
