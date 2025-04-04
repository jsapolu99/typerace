import  { createServer } from 'http';
import { Server } from 'socket.io';
import {setupListeners} from "./setupListeners";

const PORT = process.env.PORT || 8080;

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.ORIGIN || '*',
    methods: ['GET', 'POST'],
  }
})

setupListeners(io);

httpServer.listen(PORT, '0.0.0.0', () => console.log(`Server is running on port ${PORT}`));