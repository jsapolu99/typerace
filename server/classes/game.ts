import {Server, Socket} from "socket.io";
import {generateParagraph} from "../utils/generateParagraph";
import { rooms } from "../setupListeners";

export class Game {
  gameStatus: 'not-started' |'in-progress' |'finished';
  gameId: string;
  players: { id: string; name: string; score: number; }[];
  io: Server;
  gameHost: string;
  paragraph: string;
  time: number;
  textLength: number;

  constructor(id: string, io: Server, host: string) {
    this.gameId = id;
    this.players = [];
    this.io = io;
    this.gameHost = host;
    this.gameStatus = 'not-started';
    this.paragraph = '';
    this.time = 60000;
    this.textLength = 0;
  }

  setupListeners(socket: Socket) {
    socket.on('start-game', async (time: number, textLength: number) => {
      if (this.gameStatus === 'in-progress') return socket.emit('error', 'Game already in progress');

      if (this.gameHost !== socket.id) return socket.emit('error', 'Only the host can start the game');

      for (const player of this.players) {
       player.score = 0;
      }
      this.time = time;
      this.textLength = textLength;

      this.io.to(this.gameId).emit('players', this.players);

      this.gameStatus = 'in-progress';

      const paragraph = await generateParagraph(textLength);

      // ******* NEED TO ADD ABILITY TO CHANGE TEXT LENGTH ********
      this.paragraph = paragraph;

      this.io.to(this.gameId).emit('game-started', paragraph, this.time);

      setTimeout(() => {
        this.gameStatus = 'finished';
        this.io.to(this.gameId).emit('game-finished');
        this.io.to(this.gameId).emit('players', this.players);
        // ********* NEED TO ADD ABILITY TO CHANGE TIMER *********
      }, this.time);
    });

    socket.on('player-typed', (typed: string) => {
      if (this.gameStatus !== 'in-progress') return socket.emit('error', 'The game has not yet started');

      const splitParagraphWords = this.paragraph.split(' ');
      const splitTypedWords = typed.split(' ');

      let score = 0;
      for (let i = 0; i < splitTypedWords.length; i++) {
        if (splitTypedWords[i] === splitParagraphWords[i]) {
          score++;
          // **************************** NEED TO CONTINUE WORK HERE WILL LIKELY HAVE TO CHANGE HOW THE GAME IS PLAYED ******************************
        } else {
          break;
        }
      }
      const player = this.players.find(player => player.id === socket.id);

      if (player) player.score = score;

      this.io.to(this.gameId).emit('player-score', {id: socket.id, score});
    });

    socket.on('leave', () => {
      if (this.gameHost === socket.id) {
        this.players = this.players.filter((player) => player.id !== socket.id);

        if (this.players.length !== 0) {
          this.gameHost = this.players[0].id;
          this.io.to(this.gameId).emit('new-host', this.gameHost);
          this.io.to(this.gameId).emit('player-left', socket.id);
        } else {
          rooms.delete(this.gameId);
        }
      }
      socket.leave(this.gameId);
      this.players = this.players.filter((player) => player.id !== socket.id);
      this.io.to(this.gameId).emit('player-left', socket.id);
    });

    socket.on('disconnect', () => {
      if (this.gameHost === socket.id) {
        this.players = this.players.filter((player) => player.id !== socket.id);

        if (this.players.length !== 0) {
          this.gameHost = this.players[0].id;
          this.io.to(this.gameId).emit('new-host', this.gameHost);
          this.io.to(this.gameId).emit('player-left', socket.id);
        } else {
          rooms.delete(this.gameId);
        }
      }
      socket.leave(this.gameId);
      this.players = this.players.filter((player) => player.id !== socket.id);
      this.io.to(this.gameId).emit('player-left', socket.id);
    });
  }

  joinPlayer(id: string, name: string, socket: Socket) {
    if (this.gameStatus === 'in-progress') return socket.emit('error', 'Game already in progress');

    this.players.push({id, name, score: 0});
    this.io.to(this.gameId).emit('player-joined', {
      id, name, score: 0
    });

    socket.emit('players', this.players);
    socket.emit('new-host', this.gameHost);

    this.setupListeners(socket);
  }
}