import mongoose from 'mongoose';
import chatSchema from '../schemas/Chat.schema.js';

// This is the "Default" Chat model for the main DB (if used)
// or for backward compatibility during migration.
// In the new architecture, we should primarily use getClientModel(user, 'Chat', chatSchema)
const Chat = mongoose.model('Chat', chatSchema);

export default Chat;

