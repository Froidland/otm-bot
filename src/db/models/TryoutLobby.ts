import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { TryoutStage } from "./TryoutStage";

@Entity({
	name: "tryout-lobbies",
})
export class TryoutLobby {
	@PrimaryColumn({
		type: "varchar",
	})
	id: string;

	@Column("varchar")
	lobbyId: string;

	@Column("timestamp")
	startDate: Date;

	@OneToMany(() => User, (user) => user.discordId)
	players: User[];

	@Column("int")
	playerLimit: number;

	@ManyToOne(() => TryoutStage, (stage) => stage.id)
	stage: TryoutStage;

	@CreateDateColumn({
		type: "timestamp",
	})
	createdAt: Date;

	@UpdateDateColumn({
		type: "timestamp",
	})
	updatedAt: Date;
}
